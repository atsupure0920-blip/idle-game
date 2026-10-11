// 1回の起動のあいだ、ゲームの状態を持って進める「進行役」（第2版）。
//
// 画面（DOM）には触れない。時計と保存領域は外から受け取るので、ブラウザがなくてもテストできる
// （tests/flow.test.ts が、起動 → 操作 → 保存 → 開き直し、を通しで確かめる）。
// ルールは持たない。core の関数を呼び、結果を保存し、プレイの記録を付けるだけ。

import { createInitialState, onOpen, onTap } from "../core/state.ts";
import type { GameState } from "../core/state.ts";
import { deserialize, serialize } from "../core/save.ts";
import type { BattleResult, CompanionSpec, FighterSpec } from "../core/battle.ts";
import {
  advance,
  challenge,
  claimDaily,
  claimMission,
  collectIdle,
  companionLevelUp,
  createGame,
  idlePending,
  levelUp,
  levelUpMax,
  nextStage,
  ownedCount,
  promote,
  recruit,
  sanitizeGame,
  setCompanion,
  setPartySlot,
  trainParty,
} from "../core/game.ts";
import type { ActionResult, BulkResult, ChallengeResult, ClaimResult, CollectResult, GameData, GameEvent, RecruitResult } from "../core/game.ts";
import { stageLabel } from "../core/params.ts";
import type { Content } from "../core/params.ts";

export type StoreKey = "save" | "playlog" | "debug";

export interface SessionDeps {
  /** 実際の時刻（ミリ秒）。 */
  now: () => number;
  /** 新しいゲームを始めるときの乱数の種。 */
  seed: () => number;
  /** その時刻の、端末の日付の通し番号（日課の入れ替えに使う）。 */
  dayKey: (ms: number) => number;
  read: (key: StoreKey) => { text: string | null; error?: string };
  write: (key: StoreKey, text: string) => { ok: boolean; error?: string };
  /** 読めなかったセーブや、置き換える前のセーブを退避する。 */
  backup: (text: string, nowMs: number) => void;
  /** デバッグ機能（速度変更、時間送り、付与、初期化）を使えるビルドか。 */
  debug: boolean;
}

export interface PlayMark {
  /** 遊んだ時間の合計（分）。画面を開いていた時間だけを数える。 */
  atMin: number;
  /** 実際の時刻。 */
  realMs: number;
  text: string;
}

/** プレイの記録。G1 の採点と、感想の裏づけに使う。ログの書き出しに含まれる。 */
export interface PlayLog {
  v: 1;
  startedAtMs: number;
  /** 画面を開いて遊んでいた時間の合計。 */
  activeMs: number;
  opens: number;
  /** 速度変更・時間送り・付与を使ったか（使った記録は、採点に使わない）。 */
  debugUsed: boolean;
  /** 操作の回数（種類ごと）。 */
  counts: Record<string, number>;
  marks: PlayMark[];
  /** 10分・20分・30分の時点の記録を、すでに付けたか。 */
  checkpoints: number[];
}

/** 進行中の戦闘の、再生用のデータ。この起動のあいだに挑戦した戦闘だけ（開き直すと、なくなる）。 */
export interface BattleReplay {
  stage: number;
  startedAtMs: number;
  endsAtMs: number;
  replay: BattleResult;
  allies: FighterSpec[];
  enemies: FighterSpec[];
  companion: CompanionSpec | null;
}

const MAX_MARKS = 500;
const CHECKPOINT_MINUTES = [10, 20, 30, 45, 60];
/** これより長く tick が空いたら、その間は「遊んでいなかった」とみなす。 */
const ACTIVE_GAP_MS = 5000;

export interface ImportResult {
  ok: boolean;
  reason?: string;
}

export interface Session {
  readonly content: Content;
  game: () => GameData;
  state: () => GameState;
  /** 起動時に伝えること（セーブの更新、退避、時計の戻り など）。 */
  notices: () => string[];
  canSave: () => boolean;
  firstRun: () => boolean;
  /** 前回から離れていた時間。 */
  awayMs: () => number;
  /** ゲームの中の時刻（デバッグの時間送りを含む）。 */
  now: () => number;
  speed: () => number;
  playLog: () => PlayLog;
  saveText: () => string;
  lastSaveOk: () => boolean;
  /** 進行中の戦闘の再生用のデータ（なければ null）。 */
  replay: () => BattleReplay | null;
  /** 時間を進める。画面は 0.2 秒ごとに呼ぶ。起きた出来事を返す。 */
  tick: () => GameEvent[];
  challenge: () => ChallengeResult;
  collectIdle: () => CollectResult;
  levelUp: (id: string) => ActionResult;
  levelUpMax: (id: string) => BulkResult;
  trainParty: () => BulkResult;
  promote: (id: string) => ActionResult;
  recruit: () => RecruitResult;
  setSlot: (slot: number, id: string | null) => ActionResult;
  setCompanion: (id: string | null) => ActionResult;
  companionLevelUp: (id: string) => ActionResult;
  claimMission: (id: string) => ClaimResult;
  claimDaily: (id: string) => ClaimResult;
  save: () => void;
  exportSave: () => string;
  importSave: (text: string) => ImportResult;
  debugSetSpeed: (speed: number) => void;
  debugAddTime: (ms: number) => void;
  debugGrant: (gold: number, tickets: number, mats?: number) => void;
  debugReset: () => void;
}

function newPlayLog(nowMs: number): PlayLog {
  return { v: 1, startedAtMs: nowMs, activeMs: 0, opens: 0, debugUsed: false, counts: {}, marks: [], checkpoints: [] };
}

function parsePlayLog(text: string | null, nowMs: number): PlayLog {
  if (text === null || text === "") return newPlayLog(nowMs);
  try {
    const v = JSON.parse(text) as Partial<PlayLog>;
    if (v.v === 1 && typeof v.activeMs === "number" && Array.isArray(v.marks) && typeof v.counts === "object" && v.counts !== null) {
      return {
        v: 1,
        startedAtMs: typeof v.startedAtMs === "number" ? v.startedAtMs : nowMs,
        activeMs: v.activeMs,
        opens: typeof v.opens === "number" ? v.opens : 0,
        debugUsed: v.debugUsed === true,
        counts: v.counts,
        marks: v.marks,
        checkpoints: Array.isArray(v.checkpoints) ? v.checkpoints : [],
      };
    }
  } catch {
    // 読めない記録は捨てて、新しく始める（遊びには影響しない）
  }
  return newPlayLog(nowMs);
}

function formatAway(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return `${Math.floor(ms / 1000)}秒`;
  if (min < 60) return `${min}分`;
  return `${Math.floor(min / 60)}時間${min % 60}分`;
}

function partyLevels(game: GameData): number {
  let sum = 0;
  for (const id of game.party) if (id !== null) sum += game.members[id]?.level ?? 0;
  return sum;
}

export function createSession(deps: SessionDeps, content: Content): Session {
  const notices: string[] = [];
  let canSave = true;
  let firstRun = false;
  let saveText = "";
  let lastSaveOk = true;

  // デバッグ用の時間のずれ（時間送りと速度変更で増える）。確認用ビルドでだけ使う。
  let offsetMs = 0;
  let speed = 1;
  if (deps.debug) {
    try {
      const d = JSON.parse(deps.read("debug").text ?? "{}") as { offsetMs?: unknown };
      if (typeof d.offsetMs === "number" && Number.isFinite(d.offsetMs) && d.offsetMs > 0) offsetMs = d.offsetMs;
    } catch {
      offsetMs = 0;
    }
  }
  let lastReal = deps.now();
  const now = (): number => deps.now() + offsetMs;

  // 1. セーブを読む
  const startMs = now();
  const read = deps.read("save");
  if (read.error) notices.push(`保存領域を読めませんでした（${read.error}）。`);
  const loaded = deserialize(read.text);

  let state: GameState;
  /** ゲームの作りが変わって、古い版のゲームを引き継げなかった。 */
  let gameReset = false;
  if (loaded.kind === "ok") {
    state = loaded.state;
    saveText = read.text ?? "";
    if (loaded.migratedFrom !== null) notices.push(`セーブを版${loaded.migratedFrom}から更新しました。`);
    if (loaded.gameReset) {
      gameReset = true;
      // 前の版のセーブは、上書きする前に退避しておく
      if (read.text) deps.backup(read.text, startMs);
      notices.push("ゲームの作りが大きく変わったので、最初からになりました。前のセーブは退避してあります。");
    }
  } else if (loaded.kind === "too_new") {
    // 新しい版のセーブは上書きしない。
    canSave = false;
    state = createInitialState(startMs, deps.seed());
    notices.push(`このセーブは新しい版（版${loaded.version}）のものです。上書きを避けるため、今回は保存しません。`);
  } else {
    if (loaded.kind === "corrupt" && read.text) {
      deps.backup(read.text, startMs);
      notices.push(`セーブを読めなかったので、退避して最初から始めます（${loaded.reason}）。`);
    }
    state = createInitialState(startMs, deps.seed());
    firstRun = loaded.kind === "empty";
  }

  // 2. ゲームの状態（なければ、新しく作る）
  let game: GameData = state.game ? sanitizeGame(state.game, content) : createGame(startMs, deps.seed(), content);

  // 3. 起動を記録する
  const opened = onOpen(state, startMs);
  state = opened.state;
  if (opened.clockWentBack) notices.push("端末の時計が前回より前を指しています。離れていた時間は0として扱いました。");
  const awayMs = firstRun || gameReset ? 0 : opened.awayMs;

  // 前の版のゲームの記録は、新しいゲームの記録と混ぜない
  let log = gameReset ? newPlayLog(deps.now()) : parsePlayLog(deps.read("playlog").text, deps.now());
  log.opens += 1;

  const mark = (text: string): void => {
    log.marks.push({ atMin: Math.round((log.activeMs / 60_000) * 100) / 100, realMs: deps.now(), text });
    if (log.marks.length > MAX_MARKS) log.marks.shift();
  };
  mark(firstRun ? "はじめての起動" : gameReset ? "新しい作りのゲームを、最初から開始" : `起動（${log.opens}回目、前回から ${formatAway(awayMs)}）`);

  const count = (name: string): void => {
    log.counts[name] = (log.counts[name] ?? 0) + 1;
  };

  const label = (stage: number): string => stageLabel(stage, content.params);
  const nextLabel = (): string => {
    const next = nextStage(game, content);
    return next === null ? "すべて突破" : label(next);
  };

  let replay: BattleReplay | null = null;
  /** 最後に負けた面（再挑戦かどうかを、記録に残すため）。 */
  let lastDefeatStage = 0;

  const record = (events: GameEvent[]): void => {
    for (const e of events) {
      if (e.type === "win") {
        const extra = [`おひねり +${e.reward.gold}`];
        if (e.reward.tickets > 0) extra.push(`チケット +${e.reward.tickets}`);
        mark(`${label(e.stage)} を突破（${extra.join("、")}）`);
      } else if (e.type === "defeat") {
        lastDefeatStage = e.stage;
        mark(`${label(e.stage)} で負け${e.timedOut ? "（時間切れ）" : ""}（編成のレベル合計 ${partyLevels(game)}）`);
      } else if (e.type === "companion") mark(`${content.companionById[e.id]?.name ?? e.id} が相棒になる`);
      else if (e.type === "dailyReset") mark("日付が変わり、日課が入れ替わった");
      else if (e.type === "clockBack") mark("端末の時計が戻っていた");
      else if (e.type === "allClear") mark("すべての面を突破");
    }
  };

  const checkpoint = (): void => {
    const min = log.activeMs / 60_000;
    for (const c of CHECKPOINT_MINUTES) {
      if (min >= c && !log.checkpoints.includes(c)) {
        log.checkpoints.push(c);
        const actions = Object.values(log.counts).reduce((a, b) => a + b, 0);
        mark(
          `■ 遊んで${c}分: 次は ${nextLabel()}（突破 ${game.highestCleared}面、団員 ${ownedCount(game)}人、相棒 ${Object.keys(game.companions).length}体、` +
            `勧誘 ${game.counters.recruits}回、編成のレベル合計 ${partyLevels(game)}、操作 ${actions}回、負け ${game.stats.defeats}回）`,
        );
      }
    }
  };

  const save = (): void => {
    deps.write("playlog", JSON.stringify(log));
    if (deps.debug) deps.write("debug", JSON.stringify({ offsetMs }));
    if (!canSave) return;
    const t = now();
    state = { ...state, game, lastSeenAtMs: Math.max(state.lastSeenAtMs, t) };
    saveText = serialize(state, t);
    lastSaveOk = deps.write("save", saveText).ok;
  };

  const tick = (): GameEvent[] => {
    const real = deps.now();
    const dt = real - lastReal;
    lastReal = real;
    const active = dt > 0 && dt < ACTIVE_GAP_MS;
    if (active && speed !== 1) offsetMs += dt * (speed - 1);
    const t = real + offsetMs;
    const step = advance(game, t, deps.dayKey(t), content);
    game = step.game;
    if (game.battle === null) replay = null;
    if (active) log.activeMs += dt;
    record(step.events);
    checkpoint();
    return step.events;
  };

  /** 操作を1つ実行する。成功したら、記録して保存する。 */
  const act = <R extends ActionResult>(name: string, run: (g: GameData) => R): R => {
    const result = run(game);
    if (result.ok) {
      game = result.game;
      state = onTap(state, now());
      count(name);
      save();
    }
    return result;
  };

  const session: Session = {
    content,
    game: () => game,
    state: () => state,
    notices: () => notices.slice(),
    canSave: () => canSave,
    firstRun: () => firstRun,
    awayMs: () => awayMs,
    now,
    speed: () => speed,
    playLog: () => log,
    saveText: () => saveText,
    lastSaveOk: () => lastSaveOk,
    replay: () => {
      const b = game.battle;
      if (replay === null || b === null || b.stage !== replay.stage) return null;
      // 時計が戻って戦闘の時刻がずれたときのために、時刻はいまの状態から取る
      return { ...replay, startedAtMs: b.startedAtMs, endsAtMs: b.endsAtMs };
    },
    tick,
    challenge: () => {
      const r = act("挑戦", (g) => challenge(g, now(), content));
      if (r.ok && r.stage !== undefined && r.replay && r.allies && r.enemies && r.startedAtMs !== undefined && r.endsAtMs !== undefined) {
        replay = { stage: r.stage, startedAtMs: r.startedAtMs, endsAtMs: r.endsAtMs, replay: r.replay, allies: r.allies, enemies: r.enemies, companion: r.companion ?? null };
        if (r.stage === lastDefeatStage) mark(`再挑戦: ${label(r.stage)}（編成のレベル合計 ${partyLevels(game)}）`);
      }
      return r;
    },
    collectIdle: () => {
      const pending = idlePending(game, now(), content);
      const r = act("箱の受け取り", (g) => collectIdle(g, now(), content));
      if (r.ok) mark(`箱から受け取り: おひねり ${r.gold ?? 0}（貯めていた時間 ${formatAway(pending.elapsedMs)}${pending.capped ? "、上限" : ""}）`);
      return r;
    },
    levelUp: (id) => act("稽古（1つ）", (g) => levelUp(g, id, content)),
    levelUpMax: (id) => act("稽古（まとめて）", (g) => levelUpMax(g, id, content)),
    trainParty: () => act("稽古（編成をまとめて）", (g) => trainParty(g, content)),
    promote: (id) => {
      const r = act("昇格", (g) => promote(g, id, content));
      if (r.ok) mark(`${content.byId[id]?.name ?? id} を昇格`);
      return r;
    },
    recruit: () => {
      const r = act("勧誘", (g) => recruit(g, content));
      if (r.ok && r.id) mark(`勧誘: ${content.byId[r.id]?.name ?? r.id}${r.duplicate ? "（かけら）" : "（新しい団員）"}`);
      return r;
    },
    setSlot: (slot, id) => act("編成", (g) => setPartySlot(g, slot, id)),
    setCompanion: (id) => {
      const r = act("相棒の入れ替え", (g) => setCompanion(g, id));
      if (r.ok) mark(id === null ? "相棒を編成から外した" : `${content.companionById[id]?.name ?? id} を編成に入れた`);
      return r;
    },
    companionLevelUp: (id) => {
      const r = act("相棒のレベル上げ", (g) => companionLevelUp(g, id, content));
      if (r.ok) mark(`${content.companionById[id]?.name ?? id} を Lv${game.companions[id]?.level ?? 0} に`);
      return r;
    },
    claimMission: (id) => {
      const r = act("ミッションの受け取り", (g) => claimMission(g, id, content));
      if (r.ok) mark(`ミッション達成: ${content.missions.find((m) => m.id === id)?.text ?? id}`);
      return r;
    },
    claimDaily: (id) => {
      const r = act("日課の受け取り", (g) => claimDaily(g, id, content));
      if (r.ok) mark(`日課を達成: ${content.dailies.find((m) => m.id === id)?.text ?? id}`);
      return r;
    },
    save,
    exportSave: () => {
      save();
      return saveText;
    },
    importSave: (text) => {
      const r = deserialize(text.trim());
      if (r.kind === "empty") return { ok: false, reason: "何も入っていません" };
      if (r.kind === "corrupt") return { ok: false, reason: r.reason };
      if (r.kind === "too_new") return { ok: false, reason: `このビルドより新しい版（版${r.version}）のセーブです` };
      if (r.gameReset) return { ok: false, reason: "前の作りのゲームのセーブなので、読み込めません" };
      if (!canSave) return { ok: false, reason: "いまは保存を止めているので、読み込めません" };
      // いまの状態を保存してから退避する（最後の自動保存からあとの分も、退避に含める）
      save();
      if (saveText !== "") deps.backup(saveText, now());
      state = r.state;
      game = state.game ? sanitizeGame(state.game, content) : createGame(now(), deps.seed(), content);
      replay = null;
      lastDefeatStage = 0;
      mark("セーブを読み込んだ");
      save();
      return { ok: true };
    },
    debugSetSpeed: (n) => {
      if (!deps.debug || !Number.isFinite(n) || n < 1 || n > 100) return;
      speed = n;
      if (n !== 1 && !log.debugUsed) {
        log.debugUsed = true;
        mark(`デバッグ: 速度を ${n}倍に`);
      }
    },
    debugAddTime: (ms) => {
      if (!deps.debug || !Number.isFinite(ms) || ms <= 0) return;
      offsetMs += ms;
      log.debugUsed = true;
      mark(`デバッグ: 時間を ${formatAway(ms)} 送った`);
      save();
    },
    debugGrant: (gold, tickets, mats = 0) => {
      if (!deps.debug) return;
      const add = Math.max(0, Math.floor(mats));
      const materials = { ...game.materials };
      if (add > 0) for (const id of Object.keys(game.companions)) materials[id] = (materials[id] ?? 0) + add;
      game = { ...game, gold: game.gold + Math.max(0, Math.floor(gold)), tickets: game.tickets + Math.max(0, Math.floor(tickets)), materials };
      log.debugUsed = true;
      mark(`デバッグ: おひねり +${gold}、チケット +${tickets}、相棒の素材 +${add}`);
      save();
    },
    debugReset: () => {
      if (!deps.debug) return;
      save();
      if (saveText !== "") deps.backup(saveText, now());
      const t = now();
      state = { ...createInitialState(t, deps.seed()), opens: 1 };
      game = createGame(t, deps.seed(), content);
      replay = null;
      lastDefeatStage = 0;
      log = newPlayLog(deps.now());
      log.opens = 1;
      mark("デバッグ: 最初からやり直し");
      canSave = true;
      save();
    },
  };
  return session;
}

/** プレイの記録を、人が読める行にする（ログの書き出し用）。 */
export function playLogLines(log: PlayLog, game: GameData, content: Content): string[] {
  const lines: string[] = [];
  const minutes = log.activeMs / 60_000;
  const actions = Object.values(log.counts).reduce((a, b) => a + b, 0);
  const next = nextStage(game, content);
  lines.push(`遊んだ時間: ${minutes.toFixed(1)}分（起動 ${log.opens}回）`);
  lines.push(`次の面: ${next === null ? "すべて突破" : stageLabel(next, content.params)}（突破 ${game.highestCleared}面）`);
  lines.push(`団員: ${ownedCount(game)}人 ／ 相棒: ${Object.keys(game.companions).length}体 ／ 戦闘 ${game.stats.battles}回（負け ${game.stats.defeats}回）`);
  lines.push(`勧誘 ${game.counters.recruits}回 ／ レベル上げ 合計 ${game.counters.levelUps} ／ 昇格 ${game.counters.promotes}回 ／ 箱の受け取り ${game.counters.idleClaims}回 ／ ミッション ${game.missionsClaimed.length}件`);
  lines.push(`操作: 合計 ${actions}回（1分あたり ${minutes > 0 ? (actions / minutes).toFixed(1) : "-"}回）`);
  lines.push(`操作の内訳: ${Object.entries(log.counts).map(([k, v]) => `${k} ${v}`).join("、") || "なし"}`);
  lines.push(`デバッグ機能の使用: ${log.debugUsed ? "あり（この記録は採点に使わない）" : "なし"}`);
  lines.push("出来事:");
  for (const m of log.marks) {
    const mm = Math.floor(m.atMin);
    const ss = String(Math.floor((m.atMin - mm) * 60)).padStart(2, "0");
    lines.push(`  ${String(mm).padStart(3, " ")}:${ss}  ${m.text}`);
  }
  return lines;
}
