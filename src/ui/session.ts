// 1回の起動のあいだ、ゲームの状態を持って進める「進行役」。
//
// 画面（DOM）には触れない。時計と保存領域は外から受け取るので、ブラウザがなくてもテストできる
// （tests/flow.test.ts が、起動 → 操作 → 保存 → 開き直し、を通しで確かめる）。
// ルールは持たない。core の関数を呼び、結果を保存し、プレイの記録を付けるだけ。

import { createInitialState, onOpen, onTap } from "../core/state.ts";
import type { GameState } from "../core/state.ts";
import { deserialize, serialize } from "../core/save.ts";
import { advance, claimIdle, createGame, currentStage, levelUp, ownedCount, promote, recruit, retry, sanitizeGame, setPartySlot } from "../core/game.ts";
import type { ActionResult, GameData, GameEvent, RecruitResult } from "../core/game.ts";
import { stageLabel } from "../core/params.ts";
import type { Content } from "../core/params.ts";

export type StoreKey = "save" | "playlog" | "debug";

export interface SessionDeps {
  /** 実際の時刻（ミリ秒）。 */
  now: () => number;
  /** 新しいゲームを始めるときの乱数の種。 */
  seed: () => number;
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

const MAX_MARKS = 400;
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
  /** 時間を進める。画面は 0.2 秒ごとに呼ぶ。起きた出来事を返す。 */
  tick: () => GameEvent[];
  levelUp: (id: string) => ActionResult;
  promote: (id: string) => ActionResult;
  recruit: () => RecruitResult;
  setSlot: (slot: number, id: string | null) => ActionResult;
  retry: () => ActionResult;
  claimIdle: () => ActionResult;
  save: () => void;
  exportSave: () => string;
  importSave: (text: string) => ImportResult;
  debugSetSpeed: (speed: number) => void;
  debugAddTime: (ms: number) => void;
  debugGrant: (gold: number, tickets: number) => void;
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
  if (loaded.kind === "ok") {
    state = loaded.state;
    saveText = read.text ?? "";
    if (loaded.migratedFrom !== null) notices.push(`セーブを版${loaded.migratedFrom}から更新しました。`);
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

  // 2. ゲームの状態（S0 のころのセーブにはないので、なければ新しく作る）
  let game: GameData = state.game ? sanitizeGame(state.game, content) : createGame(startMs, deps.seed(), content);

  // 3. 起動を記録する
  const opened = onOpen(state, startMs);
  state = opened.state;
  if (opened.clockWentBack) notices.push("端末の時計が前回より前を指しています。離れていた時間は0として扱いました。");
  const awayMs = firstRun ? 0 : opened.awayMs;

  let log = parsePlayLog(deps.read("playlog").text, deps.now());
  log.opens += 1;

  const mark = (text: string): void => {
    log.marks.push({ atMin: Math.round((log.activeMs / 60_000) * 100) / 100, realMs: deps.now(), text });
    if (log.marks.length > MAX_MARKS) log.marks.shift();
  };
  mark(firstRun ? "はじめての起動" : `起動（${log.opens}回目、前回から ${formatAway(awayMs)}）`);

  const count = (name: string): void => {
    log.counts[name] = (log.counts[name] ?? 0) + 1;
  };

  const label = (stage: number): string => stageLabel(stage, content.params);

  const record = (events: GameEvent[]): void => {
    for (const e of events) {
      if (e.type === "win" && e.firstClear) mark(`${label(e.stage)} を突破`);
      else if (e.type === "defeat") mark(`${label(e.stage)} で負け${e.timedOut ? "（時間切れ）" : ""}`);
      else if (e.type === "join") mark(`${content.byId[e.id]?.name ?? e.id} が入団`);
      else if (e.type === "offline") mark(`放置報酬 ${e.gold}（離れていた ${formatAway(e.awayMs)}${e.capped ? "、上限" : ""}）`);
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
        mark(`■ 遊んで${c}分: ${label(currentStage(game, content))}（突破 ${game.highestCleared}面、団員 ${ownedCount(game)}人、操作 ${actions}回、負け ${game.stats.defeats}回）`);
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
    const step = advance(game, real + offsetMs, content, true);
    game = step.game;
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
    tick,
    levelUp: (id) => act("レベル上げ", (g) => levelUp(g, id, content)),
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
    retry: () => {
      const r = act("再挑戦", (g) => retry(g, content));
      if (r.ok) mark(`再挑戦（${label(game.highestCleared + 1)}）`);
      return r;
    },
    claimIdle: () => act("放置報酬の受け取り", (g) => claimIdle(g)),
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
      if (!canSave) return { ok: false, reason: "いまは保存を止めているので、読み込めません" };
      // いまの状態を保存してから退避する（最後の自動保存からあとの分も、退避に含める）
      save();
      if (saveText !== "") deps.backup(saveText, now());
      state = r.state;
      game = state.game ? sanitizeGame(state.game, content) : createGame(now(), deps.seed(), content);
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
    debugGrant: (gold, tickets) => {
      if (!deps.debug) return;
      game = { ...game, gold: game.gold + Math.max(0, Math.floor(gold)), tickets: game.tickets + Math.max(0, Math.floor(tickets)) };
      log.debugUsed = true;
      mark(`デバッグ: おひねり +${gold}、チケット +${tickets}`);
      save();
    },
    debugReset: () => {
      if (!deps.debug) return;
      save();
      if (saveText !== "") deps.backup(saveText, now());
      const t = now();
      state = { ...createInitialState(t, deps.seed()), opens: 1 };
      game = createGame(t, deps.seed(), content);
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
  lines.push(`遊んだ時間: ${minutes.toFixed(1)}分（起動 ${log.opens}回）`);
  lines.push(`いまの面: ${stageLabel(currentStage(game, content), content.params)}（突破 ${game.highestCleared}面）`);
  lines.push(`団員: ${ownedCount(game)}人 ／ 戦闘 ${game.stats.battles}回（負け ${game.stats.defeats}回）`);
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
