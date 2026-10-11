// 通しの流れのテスト（ブラウザなし）。第2版。
// 進行役（src/ui/session.ts）を、にせの時計とにせの保存領域で動かし、
// 起動 → 挑戦 → ミッション → 勧誘 → 編成 → 稽古 → 箱 → ボス → 相棒 → 負け → 再挑戦 → 保存 → 開き直し → 放置報酬、
// を通しで確かめる。画面の中身（src/ui/views.ts）が、どの状態でも作れることも確かめる。
// 本物のブラウザでの操作は、tests/e2e/run.ts が確かめる。
//
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { Content } from "../src/core/params.ts";
import { idleGoldPerMin } from "../src/core/params.ts";
import { GAME_VERSION, dailyList, idlePending, missionList, nextGoals, ownedCount } from "../src/core/game.ts";
import type { GameEvent } from "../src/core/game.ts";
import { createSession, playLogLines } from "../src/ui/session.ts";
import type { Session, SessionDeps, StoreKey } from "../src/ui/session.ts";
import {
  TABS,
  badges,
  companionJoinHtml,
  companionsHtml,
  hintText,
  journeyInfoHtml,
  journeyLive,
  memberDetailHtml,
  membersHtml,
  missionsHtml,
  otherHtml,
  partyHtml,
  recruitHtml,
  recruitManyHtml,
  recruitResultHtml,
} from "../src/ui/views.ts";
import type { LastResult, UiState } from "../src/ui/views.ts";
import { companionSkillText, fighterName, formatNumber, passiveText, rewardText, skillText } from "../src/ui/texts.ts";
import { loadContent } from "../scripts/lib/content.ts";

const T0 = 1_760_000_000_000;
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

interface World {
  clock: { now: number };
  store: Map<StoreKey, string>;
  backups: string[];
  deps: SessionDeps;
}

function world(debug = false): World {
  const clock = { now: T0 };
  const store = new Map<StoreKey, string>();
  const backups: string[] = [];
  let seed = 7;
  return {
    clock,
    store,
    backups,
    deps: {
      now: () => clock.now,
      seed: () => seed++,
      dayKey: (ms) => Math.floor(ms / DAY),
      read: (key) => ({ text: store.get(key) ?? null }),
      write: (key, text) => {
        store.set(key, text);
        return { ok: true };
      },
      backup: (text) => {
        backups.push(text);
      },
      debug,
    },
  };
}

/** 1秒ごとに時間を進める。条件を満たしたら止まる。 */
function run(w: World, s: Session, seconds: number, until?: (events: GameEvent[]) => boolean): { events: GameEvent[]; stopped: boolean } {
  const all: GameEvent[] = [];
  for (let i = 0; i < seconds; i++) {
    w.clock.now += 1000;
    const events = s.tick();
    all.push(...events);
    if (until && until(events)) return { events: all, stopped: true };
  }
  return { events: all, stopped: false };
}

/** 挑戦して、結果が出るまで進める。 */
function battle(w: World, s: Session): GameEvent[] {
  const c = s.challenge();
  assert.equal(c.ok, true, c.reason);
  const r = run(w, s, 120, () => s.game().battle === null);
  assert.ok(r.stopped, "2分以内に、戦闘の結果が出る");
  return r.events;
}

/** ひととおり片づける: 報酬を受け取り、勧誘し、空き枠を埋め、相棒を入れて育て、箱を受け取り、稽古する。 */
function tidy(s: Session, ctx: Content): void {
  for (let guard = 0; guard < 200; guard++) {
    const g = s.game();
    const m = missionList(g, ctx).find((x) => x.claimable);
    if (m) {
      assert.equal(s.claimMission(m.def.id).ok, true);
      continue;
    }
    const d = dailyList(g, ctx).find((x) => x.claimable);
    if (d) {
      assert.equal(s.claimDaily(d.def.id).ok, true);
      continue;
    }
    break;
  }
  while (s.recruit().ok) {
    // チケットを使い切る
  }
  for (const id of Object.keys(s.game().members)) {
    const empty = s.game().party.indexOf(null);
    if (empty < 0) break;
    if (!s.game().party.includes(id)) s.setSlot(empty, id);
  }
  const companion = Object.keys(s.game().companions)[0];
  if (companion && s.game().companionSlot === null) s.setCompanion(companion);
  s.collectIdle();
  for (const id of Object.keys(s.game().companions)) while (s.companionLevelUp(id).ok) {
    // 上げられるだけ上げる
  }
  s.trainParty();
}

/** 片づけながら、指定の面を突破するまで進める。 */
function progressTo(w: World, s: Session, ctx: Content, target: number): GameEvent[] {
  const events: GameEvent[] = [];
  for (let guard = 0; guard < 200 && s.game().highestCleared < target; guard++) {
    tidy(s, ctx);
    const got = battle(w, s);
    events.push(...got);
    // 負けたら、少し待って（箱に貯めて）から、また片づけて挑む
    if (got.some((e) => e.type === "defeat")) run(w, s, 60);
  }
  assert.ok(s.game().highestCleared >= target, `${target}面まで進める`);
  return events;
}

function uiState(result: LastResult | null = null): UiState {
  return { tab: "journey", selectedSlot: null, result, feed: ["1-1 を突破"], buildId: "test", debug: false, standalone: false, saveStatus: "保存済み", speed: 1, importMessage: "", exportText: "" };
}

/** すべての画面の中身を作ってみる（例外が出ないこと、空でないこと）。 */
function renderAll(s: Session, ctx: Content, result: LastResult | null = null): string {
  const g = s.game();
  const ui = uiState(result);
  const now = s.now();
  const parts = [
    journeyInfoHtml(g, ctx, ui, now),
    membersHtml(g, ctx),
    partyHtml(g, ctx, { ...ui, selectedSlot: 0 }),
    partyHtml(g, ctx, ui),
    companionsHtml(g, ctx),
    recruitHtml(g, ctx),
    missionsHtml(g, ctx),
    otherHtml(g, ctx, ui),
  ];
  for (const id of Object.keys(g.members)) parts.push(memberDetailHtml(g, ctx, id));
  for (const id of Object.keys(g.companions)) parts.push(companionJoinHtml(g, ctx, id));
  for (const part of parts) assert.ok(part.length > 0);
  return parts.join("\n");
}

test("通し: 起動 → 挑戦 → ミッション → 勧誘 → 編成 → 稽古 → 箱 → ボス → 相棒 → 負け → 再挑戦 → 開き直し → 放置報酬", () => {
  const ctx = loadContent(".");
  const w = world();
  let s = createSession(w.deps, ctx);

  // 起動: はじめての起動で、団員3人。「1-1 に挑戦」が出ていて、押すまでは戦わない
  assert.equal(s.firstRun(), true);
  assert.equal(ownedCount(s.game()), 3);
  assert.equal(s.game().highestCleared, 0);
  assert.match(renderAll(s, ctx), /1-1 に挑戦/);
  run(w, s, 120);
  assert.equal(s.game().stats.battles, 0, "押すまでは戦わない");
  assert.equal(s.replay(), null);

  // 挑戦: 再生用のデータが届き、戦闘中は挑戦できない。勝つと、初クリア報酬が入る
  const c = s.challenge();
  assert.ok(c.ok && c.stage === 1);
  const replay = s.replay();
  assert.ok(replay !== null && replay.allies.length === 3 && replay.replay.events.length > 0, "戦闘の再生用のデータが届く");
  assert.equal(s.challenge().ok, false, "戦闘中は挑戦できない");
  assert.match(renderAll(s, ctx), /戦闘中/);
  const first = run(w, s, 120, () => s.game().battle === null);
  const win = first.events.find((e) => e.type === "win");
  assert.ok(win && win.type === "win" && win.stage === 1 && win.reward.gold > 0);
  assert.equal(s.replay(), null);
  assert.equal(s.game().gold, win.reward.gold);
  assert.match(renderAll(s, ctx, { type: "win", stage: 1, reward: win.reward, companionId: null }), /1-1 を突破！/);
  assert.match(renderAll(s, ctx), /次の面（1-2）に挑戦/);
  run(w, s, 60);
  assert.equal(s.game().stats.battles, 1, "勝っても、自動では次へ進まない");

  // ミッション: 「1-1 を突破」を達成していて、報酬に勧誘チケットがある
  assert.equal(badges(s.game(), ctx, s.now()).missions, true, "ミッションに印が付く");
  assert.match(hintText(s.game(), ctx, s.now()), /ミッション/);
  const m = s.claimMission("clear-1");
  assert.ok(m.ok && m.reward && m.reward.tickets === 1);
  assert.equal(s.claimMission("clear-1").ok, false);
  assert.equal(badges(s.game(), ctx, s.now()).recruit, true, "勧誘に印が付く");
  assert.match(hintText(s.game(), ctx, s.now()), /勧誘/);

  // 勧誘: 最初は必ず回復役。編成の空きに入れる
  const r = s.recruit();
  assert.ok(r.ok && r.id === ctx.params.recruit.firstId && r.duplicate === false);
  assert.ok(recruitResultHtml(s.game(), ctx, r.id as string, false).includes("place-empty"), "空きに入れるボタンが出る");
  assert.equal(badges(s.game(), ctx, s.now()).party, true, "編成に印が付く");
  const empty = s.game().party.indexOf(null);
  assert.equal(s.setSlot(empty, r.id as string).ok, true);
  assert.equal(s.game().party.includes(null), false);
  assert.equal(s.recruit().ok, false, "チケットがなければ勧誘できない");
  assert.ok(missionList(s.game(), ctx).find((x) => x.def.id === "party-4")?.claimable, "「編成を4人にする」を達成している");

  // 稽古: 初クリア報酬のおひねりで、まとめて上げられる
  assert.equal(badges(s.game(), ctx, s.now()).members, true, "団員に印が付く");
  const trained = s.trainParty();
  assert.ok(trained.ok && (trained.levels ?? 0) >= 2);
  assert.ok(Object.values(s.game().members).some((x) => x.level >= 2));

  // 箱: 時間でたまっていて、受け取れる
  const pending = idlePending(s.game(), s.now(), ctx);
  assert.ok(pending.gold > 0);
  const got = s.collectIdle();
  assert.ok(got.ok && got.gold === pending.gold);
  assert.equal(s.collectIdle().ok, false, "受け取った直後は、何もない");

  // ボス: 1-10 を倒すと、ボスが相棒になる（団員にはならない）。編成に入れると、戦闘で技を使う
  const toBoss = progressTo(w, s, ctx, 10);
  const joined = toBoss.find((e) => e.type === "companion");
  assert.ok(joined && joined.type === "companion" && joined.id === "c_bear");
  assert.equal(ownedCount(s.game()) <= 7, true);
  assert.equal(s.game().members["c_bear"], undefined);
  assert.ok(companionJoinHtml(s.game(), ctx, "c_bear").includes("equip-companion"), "編成に入れるボタンが出る");
  assert.equal(badges(s.game(), ctx, s.now()).companions, true, "相棒に印が付く");
  assert.equal(s.setCompanion("c_bear").ok, true);
  assert.ok(!companionJoinHtml(s.game(), ctx, "c_bear").includes("equip-companion"));
  assert.ok(nextGoals(s.game(), ctx).bossIn !== null);

  // 負け: 稽古せずに挑み続けると、いつか負ける。「稽古が足りない！」と、稽古の画面へのボタンが出る
  let lost: Extract<GameEvent, { type: "defeat" }> | null = null;
  for (let i = 0; i < 40 && lost === null; i++) {
    const before = s.game();
    const events = battle(w, s);
    if (i === 0) assert.ok(s.game().stats.battles === before.stats.battles + 1);
    const d = events.find((e) => e.type === "defeat");
    if (d && d.type === "defeat") lost = d;
  }
  assert.ok(lost !== null, "稽古しなければ、どこかで負ける");
  const stuck = s.game().highestCleared;
  assert.equal(lost.stage, stuck + 1);
  const lostHtml = renderAll(s, ctx, { type: "defeat", stage: lost.stage, timedOut: lost.timedOut });
  assert.match(lostHtml, /稽古が足りない！/);
  assert.ok(lostHtml.includes('data-testid="goto-train"'), "団員の稽古の画面へ行くボタンがある");
  assert.match(lostHtml, /もう一度 .* に挑戦/);
  assert.ok(!lostHtml.includes("勝てる見込み"), "勝てる見込みは出さない");
  run(w, s, 30);
  assert.equal(s.game().battle, null, "勝手には再挑戦しない");

  // 稽古してから、もう一度挑む
  run(w, s, 5 * 60);
  tidy(s, ctx);
  progressTo(w, s, ctx, stuck + 1);

  // 保存 → 開き直し（すぐ）: 状態がそのまま残る
  s.save();
  const before = s.game();
  const opens = s.state().opens;
  w.clock.now += 5000;
  s = createSession(w.deps, ctx);
  assert.equal(s.firstRun(), false);
  assert.equal(s.state().opens, opens + 1);
  assert.deepEqual({ ...s.game(), lastActiveMs: 0 }, { ...before, lastActiveMs: 0 });
  assert.equal(s.tick().length, 0);

  // 2時間あけて開く: 箱に、2時間ぶんが貯まっている
  s.collectIdle();
  s.save();
  w.clock.now += 2 * HOUR;
  s = createSession(w.deps, ctx);
  s.tick();
  const rate = idleGoldPerMin(s.game().highestCleared, ctx.params);
  const back = idlePending(s.game(), s.now(), ctx);
  // 受け取ったときの端数（1未満）が箱に残っているので、差は1以内
  assert.ok(Math.abs(back.gold - rate * 120) <= 1, `2時間ぶん: ${back.gold}`);
  assert.equal(back.capped, false);
  assert.equal(back.mats["c_bear"], 2 * ctx.params.companion.matPerHour);
  assert.equal(badges(s.game(), ctx, s.now()).journey, true, "旅に印が付く");
  const gold = s.game().gold;
  const collected = s.collectIdle();
  assert.ok(collected.ok && s.game().gold === gold + back.gold);

  // 1日あけて開く: 上限（8時間ぶん）で頭打ち
  s.save();
  w.clock.now += DAY;
  s = createSession(w.deps, ctx);
  const events = s.tick();
  assert.ok(events.some((e) => e.type === "dailyReset"), "日付が変わって、日課が入れ替わる");
  const capped = idlePending(s.game(), s.now(), ctx);
  assert.equal(capped.capped, true);
  assert.ok(Math.abs(capped.gold - rate * 8 * 60) <= 1, `8時間ぶん: ${capped.gold}`);
  assert.match(renderAll(s, ctx), /いっぱい/);

  // プレイの記録
  const lines = playLogLines(s.playLog(), s.game(), ctx).join("\n");
  for (const word of ["遊んだ時間", "操作の内訳", "勧誘:", "挑戦 ", "稽古（編成をまとめて）", "を突破", "で負け", "再挑戦:", "箱から受け取り", "ミッション達成: 1-1 を突破する", "もりのくま が相棒になる", "もりのくま を編成に入れた", "デバッグ機能の使用: なし"]) {
    assert.ok(lines.includes(word), `プレイの記録に「${word}」がある`);
  }
  assert.equal(s.playLog().opens, 4);
});

test("日課: 端末の日付が変わると入れ替わる。同じ日のうちは、受け取りが残る", () => {
  const ctx = loadContent(".");
  const w = world();
  let s = createSession(w.deps, ctx);
  s.tick();
  run(w, s, 60);
  assert.equal(s.collectIdle().ok, true);
  const idle = ctx.dailies.find((d) => d.kind === "idleClaims");
  assert.ok(idle, "箱の受け取りの日課がある");
  assert.equal(s.claimDaily(idle.id).ok, true);
  assert.equal(s.claimDaily(idle.id).ok, false);

  // 同じ日のうちに開き直しても、受け取りは残る
  s.save();
  w.clock.now += HOUR;
  s = createSession(w.deps, ctx);
  assert.equal(s.tick().some((e) => e.type === "dailyReset"), false);
  assert.ok(dailyList(s.game(), ctx).find((d) => d.def.id === idle.id)?.claimed);

  // 開いたまま日付が変わると、入れ替わる
  const r = run(w, s, 30 * 60 * 60, (ev) => ev.some((e) => e.type === "dailyReset"));
  assert.ok(r.stopped);
  assert.ok(dailyList(s.game(), ctx).every((d) => !d.claimed && d.progress === 0));
  assert.match(missionsHtml(s.game(), ctx), /今日の日課/);
});

test("時計: 端末の時計が戻っていても壊れず、箱が増えすぎない", () => {
  const ctx = loadContent(".");
  const w = world();
  let s = createSession(w.deps, ctx);
  battle(w, s);
  run(w, s, 120);
  s.save();
  const cleared = s.game().highestCleared;
  const before = idlePending(s.game(), s.now(), ctx).gold;
  w.clock.now -= 3 * HOUR;
  s = createSession(w.deps, ctx);
  assert.ok(s.notices().some((n) => n.includes("時計")));
  const events = s.tick();
  assert.ok(events.some((e) => e.type === "clockBack"));
  const after = idlePending(s.game(), s.now(), ctx).gold;
  assert.ok(after >= 0 && after <= before, "時計を戻しても、箱は増えない");
  battle(w, s);
  assert.ok(s.game().highestCleared >= cleared, "そのまま遊び続けられる");
});

test("セーブ: 壊れていたら退避して最初から。新しすぎる版は上書きしない。S0 のころのセーブは引き継ぐ", () => {
  const ctx = loadContent(".");

  const broken = world();
  broken.store.set("save", "{こわれた");
  let s = createSession(broken.deps, ctx);
  assert.deepEqual(broken.backups, ["{こわれた"]);
  assert.ok(s.notices().some((n) => n.includes("退避")));
  assert.equal(s.canSave(), true);
  s.save();
  assert.ok((broken.store.get("save") ?? "").includes("idle-game-save"));

  const tooNew = world();
  const future = JSON.stringify({ format: "idle-game-save", version: 99, savedAtMs: 1, state: {} });
  tooNew.store.set("save", future);
  s = createSession(tooNew.deps, ctx);
  assert.equal(s.canSave(), false);
  battle(tooNew, s);
  s.save();
  assert.equal(tooNew.store.get("save"), future, "新しい版のセーブを上書きしない");
  assert.equal(s.importSave(future).ok, false);

  const old = world();
  old.store.set("save", JSON.stringify({ format: "idle-game-save", version: 1, savedAtMs: T0 - HOUR, state: { version: 1, createdAtMs: T0 - 2 * HOUR, lastSeenAtMs: T0 - HOUR, opens: 6, taps: 10, rngState: 12345 } }));
  s = createSession(old.deps, ctx);
  assert.equal(s.state().opens, 7);
  assert.equal(s.game().highestCleared, 0);
  s.tick();
  assert.equal(idlePending(s.game(), s.now(), ctx).gold, 0, "ゲームを始める前の時間に、放置報酬は付かない");
  s.save();
  const saved = JSON.parse(old.store.get("save") ?? "{}") as { state: { opens: number; taps: number; game?: unknown } };
  assert.equal(saved.state.taps, 10);
  assert.ok(saved.state.game !== undefined);
});

test("セーブ: 第1版（build-4 まで）のセーブで開くと、退避して最初からになり、そう知らせる", () => {
  const ctx = loadContent(".");
  // 2026-10-11 に、ユーザーの iPhone から届いた build-4 のログにあったセーブそのもの
  const v1 = readFileSync("tests/fixtures/save-build-4.json", "utf8").trim();
  const w = world();
  w.clock.now = 1_791_709_019_831 + 3 * HOUR;
  w.store.set("save", v1);
  w.store.set("playlog", JSON.stringify({ v: 1, startedAtMs: 1, activeMs: 40 * MIN, opens: 13, debugUsed: false, counts: { レベル上げ: 105 }, marks: [{ atMin: 1, realMs: 1, text: "前の版の記録" }], checkpoints: [10, 20, 30] }));
  const s = createSession(w.deps, ctx);
  assert.deepEqual(w.backups, [v1], "前のセーブを、上書きする前に退避する");
  assert.ok(s.notices().some((n) => n.includes("最初から") && n.includes("退避")));
  assert.equal(s.canSave(), true);
  assert.equal(s.state().opens, 14, "起動の回数は引き継ぐ");
  assert.equal(s.game().v, GAME_VERSION);
  assert.equal(s.game().highestCleared, 0);
  assert.equal(s.game().gold, 0);
  assert.equal(ownedCount(s.game()), 3);
  assert.equal(s.awayMs(), 0);
  s.tick();
  assert.equal(idlePending(s.game(), s.now(), ctx).gold, 0, "前の版で離れていた時間に、放置報酬は付かない");
  // プレイの記録は、新しいゲームのものとして始め直す
  assert.equal(s.playLog().activeMs, 0);
  assert.equal(s.playLog().opens, 1);
  assert.deepEqual(s.playLog().checkpoints, []);
  assert.ok(!playLogLines(s.playLog(), s.game(), ctx).join("\n").includes("前の版の記録"));
  battle(w, s);
  s.save();
  const saved = JSON.parse(w.store.get("save") ?? "{}") as { state: { game?: { v?: number; highestCleared?: number } } };
  assert.equal(saved.state.game?.v, GAME_VERSION);
  assert.equal(saved.state.game?.highestCleared, 1);
  // 前の版のセーブは、読み込み欄からも読み込まない（いまのゲームを守る）
  assert.equal(s.importSave(v1).ok, false);
  assert.equal(s.game().highestCleared, 1);
});

test("セーブの書き出しと読み込み: 別の端末に移せる。壊れた文字は読み込まず、いまのセーブを守る", () => {
  const ctx = loadContent(".");
  const a = world();
  const sa = createSession(a.deps, ctx);
  progressTo(a, sa, ctx, 4);
  const text = sa.exportSave();
  const cleared = sa.game().highestCleared;
  const members = sa.game().members;

  const b = world();
  const sb = createSession(b.deps, ctx);
  battle(b, sb);
  assert.equal(sb.importSave("これはセーブではない").ok, false);
  assert.equal(sb.importSave("").ok, false);
  assert.equal(sb.game().highestCleared, 1, "失敗しても、いまの状態は変わらない");
  assert.equal(sb.importSave(`  ${text}\n`).ok, true, "前後の空白は無視する");
  assert.equal(sb.game().highestCleared, cleared);
  assert.deepEqual(sb.game().members, members);
  assert.ok(b.backups.length === 1 && b.backups[0] !== undefined && b.backups[0] !== text, "置き換える前のセーブを退避する");
  assert.ok((b.backups[0] ?? "").includes("idle-game-save"), "退避したものは、読み込めるセーブ");
  progressTo(b, sb, ctx, cleared + 1);
});

test("確認用の機能: 公開用（debug なし）では何も起きない。確認用では動き、記録に残る", () => {
  const ctx = loadContent(".");
  const rel = world(false);
  let s = createSession(rel.deps, ctx);
  s.debugGrant(1000, 3, 5);
  s.debugSetSpeed(20);
  s.debugAddTime(HOUR);
  assert.equal(s.game().gold, 0);
  assert.equal(s.game().tickets, 0);
  assert.equal(s.speed(), 1);
  assert.equal(s.now(), rel.clock.now);
  assert.equal(s.playLog().debugUsed, false);

  const dbg = world(true);
  s = createSession(dbg.deps, ctx);
  s.tick();
  s.debugGrant(1000, 3);
  assert.equal(s.game().gold, 1000);
  assert.equal(s.game().tickets, 3);
  s.debugAddTime(HOUR);
  assert.equal(s.now(), dbg.clock.now + HOUR);
  s.tick();
  assert.equal(idlePending(s.game(), s.now(), ctx).gold, Math.floor(idleGoldPerMin(0, ctx.params) * 60), "時間を送ると、箱に貯まる");
  s.debugSetSpeed(20);
  const t = s.now();
  dbg.clock.now += 1000;
  s.tick();
  assert.equal(s.now() - t, 20_000, "20倍なら、1秒で20秒進む");
  assert.equal(s.playLog().debugUsed, true);
  assert.ok(playLogLines(s.playLog(), s.game(), ctx).join("\n").includes("デバッグ機能の使用: あり"));

  // 相棒の素材の付与は、持っている相棒それぞれに入る
  s.debugSetSpeed(1);
  s.debugGrant(10_000_000, 0);
  progressTo(dbg, s, ctx, 10);
  const mats = s.game().materials["c_bear"] ?? 0;
  s.debugGrant(0, 0, 10);
  assert.equal(s.game().materials["c_bear"], mats + 10);

  // 開き直しても、送った時間のぶん時計が戻ったことにはならない
  s.save();
  const again = createSession(dbg.deps, ctx);
  assert.equal(again.notices().some((n) => n.includes("時計")), false);

  s.debugReset();
  assert.equal(s.game().highestCleared, 0);
  assert.equal(s.game().gold, 0);
  assert.deepEqual(s.game().companions, {});
  assert.equal(s.playLog().debugUsed, false);
});

test("画面の中身: 進んだ状態でも作れ、押せる要素と値に testid が付いている", () => {
  const ctx = loadContent(".");
  const w = world(true);
  const s = createSession(w.deps, ctx);
  s.tick();
  s.debugGrant(5_000_000, 30);
  progressTo(w, s, ctx, 12);
  run(w, s, 20 * 60);
  // 昇格できる団員が残るように、かけらを使わずにおく（tidy は昇格しない）
  const html = renderAll(s, ctx) + recruitManyHtml(s.game(), ctx, [{ id: "h_star", duplicate: true }, { id: "h_narrator", duplicate: false }]);
  for (const testid of [
    "challenge-button",
    "idle-box",
    "idle-gold",
    "idle-claim",
    "idle-mats-c_bear",
    "goal-mission",
    "goal-boss",
    "goal-daily",
    "hint",
    "party-power",
    "train-party",
    "members-gold",
    "slot-0",
    "slot-3",
    "slot-companion",
    "slot-remove",
    "party-guide",
    "companion-row-c_bear",
    "companion-level-c_bear",
    "companion-levelup-c_bear",
    "companion-unequip-c_bear",
    "companion-row-c_dragon",
    "companion-total",
    "recruit-button",
    "recruit-all",
    "recruit-rates",
    "daily-list",
    "mission-list",
    "claim-all",
    "chapters",
    "build-id",
    "save-status",
    "export-button",
    "import-area",
    "import-button",
    "promote-button",
    "modal-close",
    "companion-result",
    "recruit-many-result",
  ]) {
    assert.ok(html.includes(`data-testid="${testid}"`), `testid: ${testid}`);
  }
  for (const id of Object.keys(s.game().members)) {
    for (const prefix of ["levelup", "levelmax", "detail", "member-level", "place"]) {
      assert.ok(html.includes(`data-testid="${prefix}-${id}"`), `団員 ${id} の ${prefix}`);
    }
  }
  assert.ok(Object.keys(s.game().members).some((id) => html.includes(`data-testid="promote-${id}"`)), "昇格できる団員には、一覧に昇格のボタンが出る");
  assert.equal(ownedCount(s.game()), 7, "30回勧誘すれば、7人そろう");
  assert.equal(TABS.length, 6);
  assert.ok(!html.includes("undefined") && !html.includes("NaN"), "undefined や NaN が画面に出ていない");
  assert.ok(!html.includes("勝てる見込み"), "勝てる見込みは、どの画面にも出さない");

  // 時間とともに変わる値（箱の中身）は、あとから書き込む場所がすべて用意されている
  const journey = journeyInfoHtml(s.game(), ctx, uiState(), s.now());
  const live = journeyLive(s.game(), ctx, s.now());
  const slots = [...journey.matchAll(/data-live(?:-width)?="([^"]+)"/g)].map((x) => x[1] as string);
  assert.ok(slots.length >= 4);
  for (const key of slots) assert.ok(live[key] !== undefined && live[key] !== "", `書き込む値がある: ${key}`);
  for (const key of Object.keys(live)) assert.ok(slots.includes(key), `書き込む場所がある: ${key}`);
  // 箱の中身が変わっても、画面の HTML は変わらない（押している途中のボタンを作り直さないため）
  const later = journeyInfoHtml(s.game(), ctx, uiState(), s.now() + 30_000);
  assert.equal(later, journey);
  assert.notEqual(journeyLive(s.game(), ctx, s.now() + 30_000)["idleGold"], live["idleGold"]);
});

test("言葉: 数の表示、技・相棒・報酬の説明、戦闘に出る者の名前", () => {
  const ctx = loadContent(".");
  assert.equal(formatNumber(9999), "9999");
  assert.equal(formatNumber(12345), "1.23万");
  assert.equal(formatNumber(1234567), "123.5万");
  for (const m of ctx.members) assert.ok(skillText(m.skill, ctx.params.battle.rallySec).length > 5);
  for (const c of ctx.companions) {
    assert.match(companionSkillText(c, c.skill.power, ctx.params.battle.rallySec), /秒ごとに/);
    assert.match(passiveText(c, 3), /団員全員の/);
  }
  assert.equal(passiveText(ctx.companionById["c_bear"] as (typeof ctx.companions)[number], 3), "団員全員の 体力 +6%");
  assert.equal(rewardText({ gold: 12345, tickets: 2, mats: 3 }), "おひねり 1.23万、勧誘チケット 2枚、相棒の素材 3こ");
  assert.equal(rewardText({ gold: 0, tickets: 1, mats: 0 }), "勧誘チケット 1枚");
  assert.equal(fighterName("c_bear", ctx), "もりのくま");
  assert.equal(fighterName("h_star", ctx), "花形役者");
  assert.ok(fighterName("enemy-3", ctx).length > 0);
});
