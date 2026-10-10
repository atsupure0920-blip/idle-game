// 通しの流れのテスト（ブラウザなし）。
// 進行役（src/ui/session.ts）を、にせの時計とにせの保存領域で動かし、
// 起動 → 自動戦闘 → 勧誘 → 編成 → 稽古 → 負け → 再挑戦 → 保存 → 開き直し → 放置報酬、を通しで確かめる。
// 画面の中身（src/ui/views.ts）が、どの状態でも作れることも確かめる。
// 本物のブラウザでの操作は、tests/e2e/run.ts が確かめる。
//
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildContent } from "../src/core/params.ts";
import type { Content, MemberDef, Params } from "../src/core/params.ts";
import { nextGoals, ownedCount, winChance } from "../src/core/game.ts";
import type { GameEvent } from "../src/core/game.ts";
import { createSession, playLogLines } from "../src/ui/session.ts";
import type { Session, SessionDeps, StoreKey } from "../src/ui/session.ts";
import { TABS, badges, hintText, joinHtml, journeyInfoHtml, memberDetailHtml, membersHtml, offlineHtml, otherHtml, partyHtml, recruitHtml, recruitResultHtml } from "../src/ui/views.ts";
import type { UiState } from "../src/ui/views.ts";
import { chanceLabel, fighterName, formatNumber, skillText } from "../src/ui/texts.ts";

const T0 = 1_760_000_000_000;
const MIN = 60_000;
const HOUR = 3_600_000;

function content(): Content {
  const params = JSON.parse(readFileSync("params/base.json", "utf8")) as Params;
  const members = JSON.parse(readFileSync("params/members.json", "utf8")) as MemberDef[];
  return buildContent(params, members);
}

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

/** 1秒ごとに時間を進める。条件を満たしたら止まる。進めた秒数を返す。 */
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

function uiState(): UiState {
  return { tab: "journey", selectedSlot: null, chance: null, feed: ["1-1 を突破"], buildId: "test", debug: false, standalone: false, saveStatus: "保存済み", speed: 1, importMessage: "", exportText: "" };
}

/** すべての画面の中身を作ってみる（例外が出ないこと、空でないこと）。 */
function renderAll(s: Session, ctx: Content): string {
  const g = s.game();
  const ui = uiState();
  if (!g.challenging) ui.chance = winChance(g, ctx, 5);
  const parts = [journeyInfoHtml(g, ctx, ui), membersHtml(g, ctx), partyHtml(g, ctx, { ...ui, selectedSlot: 0 }), partyHtml(g, ctx, ui), recruitHtml(g, ctx), otherHtml(g, ctx, ui)];
  for (const id of Object.keys(g.members)) parts.push(memberDetailHtml(g, ctx, id));
  for (const part of parts) assert.ok(part.length > 0);
  return parts.join("\n");
}

test("通し: 起動 → 勧誘 → 編成 → 稽古 → 負け → 再挑戦 → 保存 → 開き直し → 放置報酬", () => {
  const ctx = content();
  const w = world();
  let s = createSession(w.deps, ctx);

  // 起動: はじめての起動で、団員3人、1-1 から
  assert.equal(s.firstRun(), true);
  assert.equal(ownedCount(s.game()), 3);
  assert.equal(s.game().highestCleared, 0);
  const first = s.tick();
  const start = first.find((e) => e.type === "battleStart");
  assert.ok(start && start.type === "battleStart" && start.replay !== null && start.allies.length === 3, "戦闘の再生用のデータが届く");
  assert.match(renderAll(s, ctx), /挑戦中/);

  // 自動で進み、チケットが届く
  const toTicket = run(w, s, 10 * 60, (ev) => ev.some((e) => e.type === "ticket"));
  assert.ok(toTicket.stopped, "10分以内に、最初のチケットが届く");
  assert.equal(badges(s.game(), ctx).recruit, true, "勧誘に印が付く");
  assert.match(hintText(s.game(), ctx), /勧誘/);

  // 勧誘: 最初は必ず回復役。編成の空きに入れる
  const r = s.recruit();
  assert.ok(r.ok && r.id === ctx.params.recruit.firstId && r.duplicate === false);
  assert.ok(recruitResultHtml(s.game(), ctx, r.id as string, false).includes("place-empty"), "空きに入れるボタンが出る");
  assert.equal(badges(s.game(), ctx).party, true, "編成に印が付く");
  const empty = s.game().party.indexOf(null);
  assert.equal(s.setSlot(empty, r.id as string).ok, true);
  assert.equal(s.game().party.includes(null), false);
  assert.equal(s.recruit().ok, false, "チケットがなければ勧誘できない");

  // 稽古: おひねりが貯まったら、レベルを上げられる
  const toGold = run(w, s, 10 * 60, () => badges(s.game(), ctx).members);
  assert.ok(toGold.stopped, "10分以内に、稽古ができるだけのおひねりが貯まる");
  const id = s.game().party.find((x) => x !== null && s.levelUp(x).ok);
  assert.ok(id, "編成の誰かのレベルを上げられる");
  assert.equal(s.game().members[id as string]?.level, 2);

  // 負け: 進行が止まり、勝てる見込みが出せる。再挑戦で、また挑む
  const toDefeat = run(w, s, 40 * 60, () => !s.game().challenging);
  assert.ok(toDefeat.stopped, "40分以内に、初めての負けが来る");
  assert.match(renderAll(s, ctx), /稽古が足りない/);
  assert.match(renderAll(s, ctx), /勝てる見込み/);
  assert.ok(nextGoals(s.game(), ctx).bossIn !== null);
  assert.equal(s.retry().ok, true);
  assert.equal(s.game().challenging, true);
  assert.equal(s.retry().ok, false, "挑戦中は再挑戦できない");

  // 保存 → 開き直し（すぐ）: 状態がそのまま残る
  s.save();
  const before = s.game();
  const opens = s.state().opens;
  w.clock.now += 5000;
  s = createSession(w.deps, ctx);
  assert.equal(s.firstRun(), false);
  assert.equal(s.state().opens, opens + 1);
  assert.equal(s.game().highestCleared, before.highestCleared);
  assert.equal(s.game().gold, before.gold);
  assert.deepEqual(s.game().members, before.members);
  assert.deepEqual(s.game().party, before.party);
  assert.equal(s.tick().some((e) => e.type === "offline"), false, "すぐ開き直したときは、放置報酬は出ない");

  // 2時間あけて開く: 放置報酬が出て、受け取れる
  s.save();
  w.clock.now += 2 * HOUR;
  s = createSession(w.deps, ctx);
  const back = s.tick();
  const offline = back.find((e) => e.type === "offline");
  assert.ok(offline && offline.type === "offline" && offline.gold > 0 && !offline.capped);
  assert.ok(offlineHtml("2時間0分", offline.gold, false).includes("offline-claim"));
  assert.equal(badges(s.game(), ctx).journey, true);
  const gold = s.game().gold;
  assert.equal(s.claimIdle().ok, true);
  assert.equal(s.game().gold, gold + offline.gold);
  assert.equal(s.claimIdle().ok, false);

  // 1日あけて開く: 上限で頭打ち
  s.save();
  w.clock.now += 24 * HOUR;
  s = createSession(w.deps, ctx);
  const capped = s.tick().find((e) => e.type === "offline");
  assert.ok(capped && capped.type === "offline" && capped.capped);

  // プレイの記録
  const lines = playLogLines(s.playLog(), s.game(), ctx).join("\n");
  for (const word of ["遊んだ時間", "操作の内訳", "勧誘 1", "レベル上げ 1", "再挑戦 1", "を突破", "デバッグ機能の使用: なし", "放置報酬"]) {
    assert.ok(lines.includes(word), `プレイの記録に「${word}」がある`);
  }
  assert.equal(s.playLog().opens, 4);
});

test("時計: 端末の時計が戻っていても壊れず、放置報酬は出ない", () => {
  const ctx = content();
  const w = world();
  let s = createSession(w.deps, ctx);
  run(w, s, 120);
  s.save();
  const cleared = s.game().highestCleared;
  w.clock.now -= 3 * HOUR;
  s = createSession(w.deps, ctx);
  assert.ok(s.notices().some((n) => n.includes("時計")));
  const events = s.tick();
  assert.equal(events.some((e) => e.type === "offline"), false);
  assert.ok(events.some((e) => e.type === "clockBack"));
  assert.equal(s.game().idleGold, 0);
  run(w, s, 120);
  assert.ok(s.game().highestCleared >= cleared, "そのまま遊び続けられる");
});

test("セーブ: 壊れていたら退避して最初から。新しすぎる版は上書きしない。S0 のころのセーブは引き継ぐ", () => {
  const ctx = content();

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
  run(tooNew, s, 60);
  s.save();
  assert.equal(tooNew.store.get("save"), future, "新しい版のセーブを上書きしない");
  assert.equal(s.importSave(future).ok, false);

  const old = world();
  old.store.set("save", JSON.stringify({ format: "idle-game-save", version: 1, savedAtMs: T0 - HOUR, state: { version: 1, createdAtMs: T0 - 2 * HOUR, lastSeenAtMs: T0 - HOUR, opens: 6, taps: 10, rngState: 12345 } }));
  s = createSession(old.deps, ctx);
  assert.equal(s.state().opens, 7);
  assert.equal(s.game().highestCleared, 0);
  assert.equal(s.tick().some((e) => e.type === "offline"), false, "ゲームを始める前の時間に、放置報酬は付かない");
  s.save();
  const saved = JSON.parse(old.store.get("save") ?? "{}") as { state: { opens: number; taps: number; game?: unknown } };
  assert.equal(saved.state.taps, 10);
  assert.ok(saved.state.game !== undefined);
});

test("セーブの書き出しと読み込み: 別の端末に移せる。壊れた文字は読み込まず、いまのセーブを守る", () => {
  const ctx = content();
  const a = world();
  const sa = createSession(a.deps, ctx);
  run(a, sa, 5 * MIN / 1000);
  const text = sa.exportSave();
  const cleared = sa.game().highestCleared;
  assert.ok(cleared >= 2);

  const b = world();
  const sb = createSession(b.deps, ctx);
  run(b, sb, 30);
  assert.equal(sb.importSave("これはセーブではない").ok, false);
  assert.equal(sb.importSave("").ok, false);
  assert.equal(sb.game().highestCleared <= 1, true, "失敗しても、いまの状態は変わらない");
  assert.equal(sb.importSave(`  ${text}\n`).ok, true, "前後の空白は無視する");
  assert.equal(sb.game().highestCleared, cleared);
  assert.ok(b.backups.length === 1 && b.backups[0] !== undefined && b.backups[0] !== text, "置き換える前のセーブを退避する");
  assert.ok((b.backups[0] ?? "").includes("idle-game-save"), "退避したものは、読み込めるセーブ");
  run(b, sb, 60);
  assert.ok(sb.game().highestCleared >= cleared);
});

test("確認用の機能: 公開用（debug なし）では何も起きない。確認用では動き、記録に残る", () => {
  const ctx = content();
  const rel = world(false);
  let s = createSession(rel.deps, ctx);
  s.debugGrant(1000, 3);
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
  assert.ok(s.tick().some((e) => e.type === "offline"), "時間を送ると、放置報酬が出る");
  s.debugSetSpeed(20);
  const t = s.now();
  dbg.clock.now += 1000;
  s.tick();
  assert.equal(s.now() - t, 20_000, "20倍なら、1秒で20秒進む");
  assert.equal(s.playLog().debugUsed, true);
  assert.ok(playLogLines(s.playLog(), s.game(), ctx).join("\n").includes("デバッグ機能の使用: あり"));

  // 開き直しても、送った時間のぶん時計が戻ったことにはならない
  s.save();
  const again = createSession(dbg.deps, ctx);
  assert.equal(again.notices().some((n) => n.includes("時計")), false);

  s.debugReset();
  assert.equal(s.game().highestCleared, 0);
  assert.equal(s.game().gold, 0);
  assert.equal(s.playLog().debugUsed, false);
});

test("画面の中身: 進んだ状態でも作れ、押せる要素と値に testid が付いている", () => {
  const ctx = content();
  const w = world(true);
  const s = createSession(w.deps, ctx);
  s.tick();
  s.debugGrant(500_000, 12);
  while (s.recruit().ok) {
    // チケットを使い切る
  }
  for (let round = 0; round < 25; round++) for (const id of s.game().party) if (id !== null) s.levelUp(id);
  run(w, s, 15 * 60, (ev) => ev.some((e) => e.type === "join"));
  const html = renderAll(s, ctx);
  for (const testid of ["status-text", "hint", "goal-boss", "party-power", "recruit-button", "recruit-rates", "slot-0", "slot-3", "slot-remove", "party-guide", "chapters", "build-id", "save-status", "export-button", "import-area", "import-button", "promote-button", "modal-close"]) {
    assert.ok(html.includes(`data-testid="${testid}"`), `testid: ${testid}`);
  }
  for (const id of Object.keys(s.game().members)) {
    assert.ok(html.includes(`data-testid="levelup-${id}"`) && html.includes(`data-testid="place-${id}"`), `団員 ${id} の行がある`);
  }
  assert.ok(Object.keys(s.game().members).some((id) => ctx.byId[id]?.kind === "monster"), "ボスが入団している");
  assert.ok(joinHtml(ctx, "m_bear").includes("goto-party"));
  assert.equal(TABS.length, 5);
  assert.ok(!html.includes("undefined") && !html.includes("NaN"), "undefined や NaN が画面に出ていない");
});

test("言葉: 数の表示、見込みの段階、技と敵の名前", () => {
  const ctx = content();
  assert.equal(formatNumber(9999), "9999");
  assert.equal(formatNumber(12345), "1.23万");
  assert.equal(formatNumber(1234567), "123.5万");
  assert.equal(chanceLabel(1).tone, "high");
  assert.equal(chanceLabel(0.5).tone, "even");
  assert.equal(chanceLabel(0).tone, "low");
  for (const m of ctx.members) assert.ok(skillText(m.skill, ctx.params.battle.rallySec).length > 5);
  assert.equal(fighterName("m_bear", ctx), "もりのくま");
  assert.ok(fighterName("enemy-3", ctx).length > 0);
});
