// 通しの流れのテスト（ブラウザなし）。第3版。
// 進行役（src/ui/session.ts）を、にせの時計とにせの保存領域で動かし、
// 起動 → 挑戦 → ミッション → 高級勧誘の10連 → 編成 → 稽古（+1・+10・指定）→ リセット → 装備 → 箱 → ボス → 相棒 →
// 負け → 再挑戦 → 保存 → 開き直し → 放置報酬、を通しで確かめる。
// 画面の中身（src/ui/views.ts）が、どの状態でも作れることも確かめる。
// 本物のブラウザでの操作は、tests/e2e/run.ts が確かめる。
//
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { Content } from "../src/core/params.ts";
import { EQUIP_SLOTS, idleGoldPerMin, levelCostTo } from "../src/core/params.ts";
import {
  GAME_VERSION,
  PARTY_SIZE,
  canAutoEquip,
  dailyList,
  enhanceInfo,
  equippedCount,
  equippedOn,
  idlePending,
  levelPlan,
  maxAffordableLevel,
  missionList,
  nextGoals,
  ownedCount,
  pityLeft,
  resetInfo,
} from "../src/core/game.ts";
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
  memberModalHtml,
  membersHtml,
  missionsHtml,
  otherHtml,
  partyHtml,
  ratesHtml,
  recruitHtml,
  recruitResultHtml,
} from "../src/ui/views.ts";
import type { DetailState, HeroState, LastResult, UiState } from "../src/ui/views.ts";
import { companionSkillText, equipEffectText, equipName, fighterName, formatNumber, passiveText, plusText, rarityText, rewardText, skillText } from "../src/ui/texts.ts";
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

/** レア度の高い順（同じなら、能力の高い順）に並べる。 */
function byRarity(ids: string[], ctx: Content): string[] {
  const rank = (id: string): number => {
    const r = ctx.params.recruit.rarities[ctx.byId[id]?.rarity ?? ""];
    return (r?.stars ?? 0) * 10 + (r?.statMult ?? 0);
  };
  return ids.slice().sort((x, y) => rank(y) - rank(x));
}

/** 編成の全員を、同じくらいのレベルになるように「+1」で上げる。上げた数を返す。 */
function trainEvenly(s: Session, ctx: Content): number {
  let levels = 0;
  for (let guard = 0; guard < 2000; guard++) {
    const g = s.game();
    const ids = g.party.filter((id): id is string => id !== null).sort((x, y) => (g.members[x]?.level ?? 0) - (g.members[y]?.level ?? 0));
    const id = ids.find((x) => levelPlan(g, x, (g.members[x]?.level ?? 0) + 1, ctx).ok);
    if (id === undefined) break;
    assert.equal(s.levelUpTo(id, (g.members[id]?.level ?? 0) + 1, "+1").ok, true);
    levels += 1;
  }
  return levels;
}

/** ひととおり片づける: 報酬を受け取り、勧誘し、空き枠を埋め、相棒を入れて育て、箱を受け取り、装備を付け、稽古する。 */
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
  while (s.recruit("premium", 10).ok) {
    // 高級チケットは、10連で使う
  }
  while (s.recruit("normal", 10).ok || s.recruit("normal", 1).ok) {
    // 通常チケットを使い切る
  }
  for (const id of byRarity(Object.keys(s.game().members), ctx)) {
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
  // 装備は、画面と同じく1人ずつ: 控えの団員の装備を外し、編成の全員に「おまかせ」
  for (const id of Object.keys(s.game().members)) {
    if (!s.game().party.includes(id) && s.game().equips.some((e) => e.on === id)) s.unequipAll(id);
  }
  for (const id of s.game().party) if (id !== null) s.autoEquip(id);
  trainEvenly(s, ctx);
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

const HERO: HeroState = { id: null, view: "train", filter: "all", sort: "rarity", resetArmed: false };

function uiState(result: LastResult | null = null): UiState {
  return { tab: "journey", selectedSlot: null, result, detail: null, hero: HERO, feed: ["1-1 を突破"], buildId: "test", debug: false, standalone: false, saveStatus: "保存済み", speed: 1, importMessage: "", exportText: "" };
}

function detailOf(id: string, view: DetailState["view"], extra: Partial<DetailState> = {}): DetailState {
  return { id, view, slot: null, target: 1, ...extra };
}

/** すべての画面の中身を作ってみる（例外が出ないこと、空でないこと）。 */
function renderAll(s: Session, ctx: Content, result: LastResult | null = null): string {
  const g = s.game();
  const ui = uiState(result);
  const now = s.now();
  const parts = [
    journeyInfoHtml(g, ctx, ui, now),
    membersHtml(g, ctx, HERO),
    membersHtml(g, ctx, { ...HERO, sort: "level" }),
    ...(["1", "2", "3", "elite"] as const).map((filter) => membersHtml(g, ctx, { ...HERO, filter })),
    partyHtml(g, ctx, { ...ui, selectedSlot: 0 }),
    partyHtml(g, ctx, ui),
    companionsHtml(g, ctx),
    recruitHtml(g, ctx),
    ratesHtml(g, ctx, "normal"),
    ratesHtml(g, ctx, "premium"),
    missionsHtml(g, ctx),
    otherHtml(g, ctx, ui),
  ];
  for (const id of Object.keys(g.members)) {
    const level = g.members[id]?.level ?? 1;
    parts.push(membersHtml(g, ctx, { ...HERO, id }));
    parts.push(membersHtml(g, ctx, { ...HERO, id, resetArmed: true }));
    parts.push(membersHtml(g, ctx, { ...HERO, id, view: "equip" }));
    parts.push(memberModalHtml(g, ctx, detailOf(id, "level", { target: level + 1 })));
    for (const slot of EQUIP_SLOTS) parts.push(memberModalHtml(g, ctx, detailOf(id, "slot", { slot })));
  }
  for (const id of Object.keys(g.companions)) parts.push(companionJoinHtml(g, ctx, id));
  for (const part of parts) assert.ok(part.length > 0);
  return parts.join("\n");
}

test("通し: 起動 → 挑戦 → ミッション → 高級10連 → 編成 → 稽古 → リセット → 装備 → 箱 → ボス → 相棒 → 負け → 再挑戦 → 開き直し → 放置報酬", () => {
  const ctx = loadContent(".");
  const p = ctx.params;
  const w = world();
  let s = createSession(w.deps, ctx);

  // 起動: はじめての起動で、団員3人。「1-1 に挑戦」が出ていて、押すまでは戦わない
  assert.equal(s.firstRun(), true);
  assert.equal(ownedCount(s.game()), 3);
  assert.equal(s.game().party.length, PARTY_SIZE);
  assert.equal(s.game().party.filter((x) => x !== null).length, 3);
  assert.equal(s.game().highestCleared, 0);
  assert.match(renderAll(s, ctx), /1-1 に挑戦/);
  run(w, s, 120);
  assert.equal(s.game().stats.battles, 0, "押すまでは戦わない");
  assert.equal(s.replay(), null);

  // 挑戦: 再生用のデータが届き、戦闘中は挑戦できない。勝つと、初クリア報酬（おひねりと装備）が入る
  const c = s.challenge();
  assert.ok(c.ok && c.stage === 1);
  const replay = s.replay();
  assert.ok(replay !== null && replay.allies.length === 3 && replay.replay.events.length > 0, "戦闘の再生用のデータが届く");
  assert.equal(s.challenge().ok, false, "戦闘中は挑戦できない");
  assert.match(renderAll(s, ctx), /戦闘中/);
  const first = run(w, s, 120, () => s.game().battle === null);
  const win = first.events.find((e) => e.type === "win");
  assert.ok(win && win.type === "win" && win.stage === 1 && win.reward.gold > 0 && win.equipDefId !== null);
  assert.equal(s.replay(), null);
  assert.equal(s.game().gold, win.reward.gold);
  assert.equal(s.game().equips.length, 1, "初クリアで、装備が1つ手に入る");
  const winHtml = renderAll(s, ctx, { type: "win", stage: 1, reward: win.reward, equipDefId: win.equipDefId, companionId: null });
  assert.match(winHtml, /1-1 を突破！/);
  assert.ok(winHtml.includes(ctx.equipById[win.equipDefId]?.name ?? "?"), "手に入れた装備の名前が出る");
  assert.match(renderAll(s, ctx), /次の面（1-2）に挑戦/);
  run(w, s, 60);
  assert.equal(s.game().stats.battles, 1, "勝っても、自動では次へ進まない");

  // ミッション: 「1-1 を突破」の報酬は、高級チケット10枚
  assert.equal(badges(s.game(), ctx, s.now()).missions, true, "ミッションに印が付く");
  assert.match(hintText(s.game(), ctx, s.now()), /ミッション/);
  const m = s.claimMission("clear-1");
  assert.ok(m.ok && m.reward && m.reward.premiumTickets === 10);
  assert.equal(s.claimMission("clear-1").ok, false);
  assert.equal(s.game().premiumTickets, 10);
  assert.equal(badges(s.game(), ctx, s.now()).recruit, true, "勧誘に印が付く");
  assert.match(hintText(s.game(), ctx, s.now()), /高級チケット/);
  assert.ok(recruitHtml(s.game(), ctx).includes('data-testid="first-ten-note"'), "最初の10連の約束が、勧誘の画面に出ている");

  // 高級勧誘の10連: 最初の10連には、★3 の花形役者と、回復役の衣装係が必ず入る。通常勧誘は、チケットがないので回せない
  assert.equal(s.recruit("normal", 1).ok, false, "通常チケットがなければ回せない");
  const ten = s.recruit("premium", 10);
  assert.ok(ten.ok && ten.results && ten.results.length === 10);
  for (const id of p.recruit.firstPremiumTen) assert.ok(ten.results.some((x) => x.id === id), `最初の10連に ${id} が入っている`);
  assert.equal(s.game().premiumTickets, 0);
  assert.equal(s.game().recruit.firstTenDone, true);
  assert.equal(s.game().counters.recruits, 10);
  assert.ok(ownedCount(s.game()) >= 5);
  assert.ok(!recruitHtml(s.game(), ctx).includes('data-testid="first-ten-note"'), "約束は、果たしたら消える");
  const left = pityLeft(s.game(), "premium", ctx);
  assert.ok(left !== null && left >= p.recruit.banners.premium.pity - 9 && left <= p.recruit.banners.premium.pity, "★3 が出たところから、天井を数え直している");
  assert.equal(pityLeft(s.game(), "normal", ctx), null, "通常勧誘に、天井はない");
  assert.equal(s.recruit("premium", 10).ok, false, "チケットがなければ回せない");
  const resultHtml = recruitResultHtml(s.game(), ctx, ten.results);
  assert.ok(resultHtml.includes('data-testid="fill-empty"'), "空きに入れるボタンが出る");
  assert.ok(resultHtml.includes("花形役者") && resultHtml.includes("衣装係"));

  // 編成: 空きの3枠を埋めると、6人そろう
  assert.equal(badges(s.game(), ctx, s.now()).party, true, "編成に印が付く");
  for (const id of byRarity(Object.keys(s.game().members), ctx)) {
    const empty = s.game().party.indexOf(null);
    if (empty < 0) break;
    if (!s.game().party.includes(id)) assert.equal(s.setSlot(empty, id).ok, true);
  }
  assert.equal(s.game().party.includes(null), false);
  assert.ok(s.game().party.includes("h_star"), "★3 が編成に入る");
  assert.ok(s.game().stats.partyFullAtMs !== null);
  assert.ok(missionList(s.game(), ctx).find((x) => x.def.id === "party-6")?.claimable, "「編成を6人にする」を達成している");
  assert.ok(missionList(s.game(), ctx).find((x) => x.def.id === "recruits-10")?.claimable, "「勧誘を合計10回」を達成している");

  // 稽古: 「+1」「+10」「レベルを指定」。まとめて全部、はない
  assert.equal(badges(s.game(), ctx, s.now()).members, true, "団員に印が付く");
  const gold0 = s.game().gold;
  const one = s.levelUpTo("h_star", 2, "+1");
  assert.ok(one.ok && one.levels === 1);
  assert.equal(s.game().gold, gold0 - levelCostTo(1, 2, p));
  assert.equal(s.levelUpTo("h_star", 12, "+10").ok, false, "おひねりが足りなければ、+10 はできない");
  const target = maxAffordableLevel(s.game(), "h_star", ctx);
  assert.ok(target >= 4, `指定できるレベル: ${target}`);
  assert.equal(levelPlan(s.game(), "h_star", target + 1, ctx).ok, false, "それより上は、おひねりが足りない");
  const set = s.levelUpTo("h_star", target, "指定");
  assert.ok(set.ok && set.levels === target - 2);
  assert.equal(s.game().members["h_star"]?.level, target);
  assert.equal(s.game().gold, gold0 - levelCostTo(1, target, p));
  assert.equal(s.levelUpTo("h_star", target, "指定").ok, false, "いまと同じレベルは指定できない");

  // リセット: レベル1に戻り、使ったおひねりが全部戻る。何回でもできる
  const info = resetInfo(s.game(), "h_star", ctx);
  assert.ok(info.ok && info.refund === levelCostTo(1, target, p));
  const reset = s.resetLevel("h_star");
  assert.ok(reset.ok && reset.refund === info.refund);
  assert.equal(s.game().members["h_star"]?.level, 1);
  assert.equal(s.game().gold, gold0, "おひねりが、稽古の前とぴったり同じに戻る");
  assert.equal(s.resetLevel("h_star").ok, false, "レベル1は、リセットするものがない");
  assert.ok(missionList(s.game(), ctx).find((x) => x.def.id === "reset-1")?.claimable);
  assert.equal(s.levelUpTo("h_star", target, "指定").ok, true, "リセットのあと、同じだけ上げ直せる");
  assert.equal(s.resetLevel("h_star").ok, true);
  assert.equal(s.game().gold, gold0);

  // 装備: 初クリアの装備を、1人の「おまかせ」で付ける。全部外す。外して、付け直して、強化する
  const lead = s.game().party[0] as string;
  assert.equal(canAutoEquip(s.game(), lead, ctx), true);
  const auto = s.autoEquip(lead);
  assert.ok(auto.ok && auto.changed === 1);
  assert.equal(equippedCount(s.game()), 1);
  assert.equal(s.autoEquip(lead).ok, false, "付け替えるものがなければ、何も起きない");
  assert.equal(canAutoEquip(s.game(), lead, ctx), false);
  const item = s.game().equips[0];
  assert.ok(item && item.on === lead);
  const wearer = item.on;
  const off = s.unequipAll(lead);
  assert.ok(off.ok && off.removed === 1);
  assert.equal(equippedCount(s.game()), 0);
  assert.equal(s.unequipAll(lead).ok, false, "何も付けていなければ、何もしない");
  assert.equal(s.autoEquip(lead).ok, true, "外したものを、また「おまかせ」で付けられる");
  assert.equal(s.unequip(item.uid).ok, true);
  assert.equal(equippedCount(s.game()), 0);
  assert.equal(s.equip(item.uid, "h_star").ok, true, "付け替えは、何回でもただ");
  const slot = ctx.equipById[item.defId]?.slot;
  assert.ok(slot !== undefined && equippedOn(s.game(), "h_star", ctx)[slot]?.uid === item.uid);
  assert.equal(s.equip(item.uid, wearer).ok, true);
  // 強化に使うおひねりを、箱から用意する（手に入った装備の★によって、要る額が変わるので）
  run(w, s, 180);
  assert.equal(s.collectIdle().ok, true);
  const goldBefore = s.game().gold;
  const cost = enhanceInfo(s.game(), item.uid, ctx);
  assert.ok(cost.ok && cost.gold > 0 && cost.gold <= goldBefore);
  assert.equal(s.enhance(item.uid).ok, true);
  assert.equal(s.game().equips[0]?.level, 1);
  assert.equal(s.game().gold, goldBefore - cost.gold);
  assert.ok(membersHtml(s.game(), ctx, { ...HERO, id: wearer, view: "equip" }).includes(" +1</span>"), "強化した装備は、名前に +1 が付く");

  // 箱: 時間でたまっていて、受け取れる
  run(w, s, 60);
  const pending = idlePending(s.game(), s.now(), ctx);
  assert.ok(pending.gold > 0);
  const got = s.collectIdle();
  assert.ok(got.ok && got.gold === pending.gold);
  assert.equal(s.collectIdle().ok, false, "受け取った直後は、何もない");

  // ボス: 1-10 を倒すと、ボスが相棒になる（団員にはならない）。編成に入れると、戦闘で技を使う
  const toBoss = progressTo(w, s, ctx, 10);
  const joined = toBoss.find((e) => e.type === "companion");
  assert.ok(joined && joined.type === "companion" && joined.id === "c_bear");
  assert.equal(s.game().members["c_bear"], undefined);
  assert.ok(ownedCount(s.game()) <= ctx.members.length);
  assert.ok(equippedCount(s.game()) >= 8, "ここまでの装備が、編成に付いている");
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

  // 2時間あけて開く: 箱に、2時間ぶんのおひねりと、装備が1つ貯まっている
  s.collectIdle();
  s.save();
  w.clock.now += 2 * HOUR;
  s = createSession(w.deps, ctx);
  s.tick();
  const rate = idleGoldPerMin(s.game().highestCleared, p);
  const back = idlePending(s.game(), s.now(), ctx);
  // 受け取ったときの端数（1未満）が箱に残っているので、差は1以内
  assert.ok(Math.abs(back.gold - rate * 120) <= 1, `2時間ぶん: ${back.gold}`);
  assert.equal(back.capped, false);
  assert.equal(back.mats["c_bear"], 2 * p.companion.matPerHour);
  assert.equal(back.equips, Math.floor(2 / p.equipment.idleHoursPerItem), "2時間で、装備が1つ");
  assert.equal(badges(s.game(), ctx, s.now()).journey, true, "旅に印が付く");
  const gold = s.game().gold;
  const owned = s.game().equips.length;
  const collected = s.collectIdle();
  assert.ok(collected.ok && s.game().gold === gold + back.gold);
  assert.equal(collected.equips?.length, back.equips);
  assert.equal(s.game().equips.length, owned + back.equips);

  // 1日あけて開く: 上限（8時間ぶん）で頭打ち
  s.save();
  w.clock.now += DAY;
  s = createSession(w.deps, ctx);
  const events = s.tick();
  assert.ok(events.some((e) => e.type === "dailyReset"), "日付が変わって、日課が入れ替わる");
  const capped = idlePending(s.game(), s.now(), ctx);
  assert.equal(capped.capped, true);
  assert.ok(Math.abs(capped.gold - rate * 8 * 60) <= 1, `8時間ぶん: ${capped.gold}`);
  assert.equal(capped.equips, Math.floor(8 / p.equipment.idleHoursPerItem), "装備も、8時間ぶんまで");
  assert.match(renderAll(s, ctx), /いっぱい/);

  // プレイの記録
  const lines = playLogLines(s.playLog(), s.game(), ctx).join("\n");
  for (const word of [
    "遊んだ時間",
    "操作の内訳",
    "勧誘（高級・10連）: ★3 ×",
    "挑戦 ",
    "稽古（+1）",
    "稽古（指定）: 花形役者 を Lv",
    "リセット: 花形役者",
    "装備を全部外す: ",
    "装備の強化 ",
    "を突破",
    "で負け",
    "再挑戦:",
    "箱から受け取り",
    "ミッション達成: 1-1 を突破する",
    "もりのくま が相棒になる",
    "もりのくま を編成に入れた",
    "デバッグ機能の使用: なし",
  ]) {
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

/** 前の版のセーブで開いたときの、共通の確かめ。 */
function oldSaveResets(file: string, savedAtMs: number, prevOpens: number): void {
  const ctx = loadContent(".");
  const old = readFileSync(file, "utf8").trim();
  const w = world();
  w.clock.now = savedAtMs + 3 * HOUR;
  w.store.set("save", old);
  w.store.set("playlog", JSON.stringify({ v: 1, startedAtMs: 1, activeMs: 40 * MIN, opens: 13, debugUsed: false, counts: { レベル上げ: 105 }, marks: [{ atMin: 1, realMs: 1, text: "前の版の記録" }], checkpoints: [10, 20, 30] }));
  const s = createSession(w.deps, ctx);
  assert.deepEqual(w.backups, [old], "前のセーブを、上書きする前に退避する");
  assert.ok(s.notices().some((n) => n.includes("最初から") && n.includes("退避")));
  assert.equal(s.canSave(), true);
  assert.equal(s.state().opens, prevOpens + 1, "起動の回数は引き継ぐ");
  assert.equal(s.game().v, GAME_VERSION);
  assert.equal(s.game().highestCleared, 0);
  assert.equal(s.game().gold, 0);
  assert.equal(s.game().tickets, 0);
  assert.equal(s.game().premiumTickets, 0);
  assert.deepEqual(s.game().equips, []);
  assert.equal(ownedCount(s.game()), 3);
  assert.equal(s.awayMs(), 0);
  s.tick();
  const pending = idlePending(s.game(), s.now(), ctx);
  assert.equal(pending.gold, 0, "前の版で離れていた時間に、放置報酬は付かない");
  assert.equal(pending.equips, 0);
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
  assert.equal(s.importSave(old).ok, false);
  assert.equal(s.game().highestCleared, 1);
}

test("セーブ: 第1版（build-4 まで）のセーブで開くと、退避して最初からになり、そう知らせる", () => {
  // 2026-10-11 に、ユーザーの iPhone から届いた build-4 のログにあったセーブそのもの
  const text = readFileSync("tests/fixtures/save-build-4.json", "utf8");
  const v = JSON.parse(text) as { savedAtMs: number; state: { opens: number } };
  oldSaveResets("tests/fixtures/save-build-4.json", v.savedAtMs, v.state.opens);
});

test("セーブ: 第2版（build-5）のセーブで開いても、退避して最初からになり、そう知らせる", () => {
  // 2026-10-12 に、ユーザーの iPhone から届いた build-5 のログにあったセーブそのもの
  const text = readFileSync("tests/fixtures/save-build-5.json", "utf8");
  const v = JSON.parse(text) as { savedAtMs: number; state: { opens: number; game: { v: number; highestCleared: number } } };
  assert.equal(v.state.game.v, 2);
  assert.ok(v.state.game.highestCleared > 0);
  oldSaveResets("tests/fixtures/save-build-5.json", v.savedAtMs, v.state.opens);
});

test("セーブ: 第3版（build-6）のセーブは、そのまま続きから遊べる（新しい画面になっても、進み具合は消えない）", () => {
  const ctx = loadContent(".");
  // 2026-10-12 に、ユーザーの iPhone から届いた build-6 のログにあったセーブそのもの
  const text = readFileSync("tests/fixtures/save-build-6.json", "utf8").trim();
  const v = JSON.parse(text) as { savedAtMs: number; state: { opens: number } };
  const w = world();
  w.clock.now = v.savedAtMs + 2 * HOUR;
  w.store.set("save", text);
  const s = createSession(w.deps, ctx);
  assert.deepEqual(w.backups, [], "退避しない（最初からにならない）");
  assert.ok(!s.notices().some((n) => n.includes("最初から")));
  assert.equal(s.state().opens, v.state.opens + 1);
  assert.equal(s.game().highestCleared, 23);
  assert.equal(ownedCount(s.game()), 20);
  assert.equal(s.game().equips.length, 23);
  assert.equal(Object.keys(s.game().companions).length, 2);
  s.tick();
  const back = idlePending(s.game(), s.now(), ctx);
  assert.ok(back.gold > 0, "離れていたあいだの放置報酬がある");
  assert.equal(s.collectIdle().ok, true);
  // 新しい画面で、どの団員を選んでも作れる
  for (const id of Object.keys(s.game().members)) {
    assert.ok(membersHtml(s.game(), ctx, { ...HERO, id }).includes(`data-testid="detail-${id}"`));
    assert.ok(membersHtml(s.game(), ctx, { ...HERO, id, view: "equip" }).includes('data-testid="unequip-all"'));
  }
  // 控えの団員は装備を付けていないので「全部外す」は効かない。編成の団員は外せる
  assert.equal(s.unequipAll("h_clown").ok, false);
  const r = s.unequipAll("h_guard");
  assert.ok(r.ok && r.removed === 4);
  assert.equal(s.autoEquip("h_guard").ok, true);
  battle(w, s);
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
  s.debugGrant({ gold: 1000, tickets: 3, premiumTickets: 2, mats: 5 });
  s.debugSetSpeed(20);
  s.debugAddTime(HOUR);
  assert.equal(s.game().gold, 0);
  assert.equal(s.game().tickets, 0);
  assert.equal(s.game().premiumTickets, 0);
  assert.equal(s.speed(), 1);
  assert.equal(s.now(), rel.clock.now);
  assert.equal(s.playLog().debugUsed, false);

  const dbg = world(true);
  s = createSession(dbg.deps, ctx);
  s.tick();
  s.debugGrant({ gold: 1000, tickets: 3, premiumTickets: 20 });
  assert.equal(s.game().gold, 1000);
  assert.equal(s.game().tickets, 3);
  assert.equal(s.game().premiumTickets, 20);
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
  s.debugGrant({ gold: 10_000_000 });
  progressTo(dbg, s, ctx, 10);
  const mats = s.game().materials["c_bear"] ?? 0;
  s.debugGrant({ mats: 10 });
  assert.equal(s.game().materials["c_bear"], mats + 10);

  // 開き直しても、送った時間のぶん時計が戻ったことにはならない
  s.save();
  const again = createSession(dbg.deps, ctx);
  assert.equal(again.notices().some((n) => n.includes("時計")), false);

  s.debugReset();
  assert.equal(s.game().highestCleared, 0);
  assert.equal(s.game().gold, 0);
  assert.deepEqual(s.game().companions, {});
  assert.deepEqual(s.game().equips, []);
  assert.equal(s.game().premiumTickets, 0);
  assert.equal(s.playLog().debugUsed, false);
});

test("画面の中身: 進んだ状態でも作れ、押せる要素と値に testid が付いている", () => {
  const ctx = loadContent(".");
  const w = world(true);
  const s = createSession(w.deps, ctx);
  s.tick();
  s.debugGrant({ gold: 5_000_000, tickets: 30, premiumTickets: 30 });
  // 昇格できる団員が残るように、かけらを使わずにおく（tidy は昇格しない）
  progressTo(w, s, ctx, 12);
  run(w, s, 20 * 60);
  const g = s.game();
  const outcomes = [{ id: "h_star", duplicate: true }, { id: "h_leader", duplicate: false }];
  const html = renderAll(s, ctx) + recruitResultHtml(g, ctx, outcomes) + recruitResultHtml(g, ctx, [{ id: "h_cook", duplicate: false }]);
  for (const testid of [
    "challenge-button",
    "idle-box",
    "idle-gold",
    "idle-equips",
    "idle-claim",
    "idle-mats-c_bear",
    "goal-mission",
    "goal-boss",
    "goal-pity",
    "goal-daily",
    "hint",
    "party-power",
    "hero-card",
    "hero-portrait",
    "hero-power",
    "hero-tab-train",
    "hero-tab-equip",
    "unequip-all",
    "filter-all",
    "filter-1",
    "filter-2",
    "filter-3",
    "filter-elite",
    "sort-toggle",
    "members-gold",
    "slot-0",
    "slot-5",
    "slot-companion",
    "slot-remove",
    "party-guide",
    "companion-row-c_bear",
    "companion-level-c_bear",
    "companion-levelup-c_bear",
    "companion-unequip-c_bear",
    "companion-row-c_dragon",
    "companion-total",
    "banner-premium",
    "banner-normal",
    "recruit-premium-1",
    "recruit-premium-10",
    "recruit-normal-1",
    "recruit-normal-10",
    "premium-tickets",
    "recruit-tickets",
    "pity-left",
    "rates-premium",
    "rates-normal",
    "rates-title",
    "daily-list",
    "mission-list",
    "claim-all",
    "chapters",
    "build-id",
    "save-status",
    "export-button",
    "import-area",
    "import-button",
    "detail-title",
    "detail-level",
    "detail-hp",
    "detail-atk",
    "detail-shards",
    "reset-button",
    "reset-confirm",
    "promote-button",
    "auto-equip",
    "level-target",
    "level-step-p1",
    "level-step-p10",
    "level-step-m1",
    "level-step-m10",
    "level-max",
    "level-cost",
    "level-confirm",
    "slot-list",
    "modal-close",
    "companion-result",
    "recruit-result",
    "recruit-result-list",
  ]) {
    assert.ok(html.includes(`data-testid="${testid}"`), `testid: ${testid}`);
  }
  for (const slot of EQUIP_SLOTS) {
    for (const prefix of ["slot-open", "enhance", "eq"]) assert.ok(html.includes(`data-testid="${prefix}-${slot}"`), `装備の場所 ${slot} の ${prefix}`);
  }
  for (const id of Object.keys(g.members)) {
    for (const prefix of ["levelup", "levelten", "levelset", "detail", "member-level", "member-row", "place"]) {
      assert.ok(html.includes(`data-testid="${prefix}-${id}"`), `団員 ${id} の ${prefix}`);
    }
  }
  for (const e of g.equips) {
    const used = html.includes(`data-testid="equip-${e.uid}"`) || html.includes(`data-testid="unequip-${e.uid}"`);
    assert.ok(used, `装備 ${e.uid} が、選ぶ一覧に出ている`);
  }
  assert.ok(Object.keys(g.members).some((id) => html.includes(`data-testid="tile-dot-${id}"`)), "昇格できる団員には、一覧の札に赤い印が付く");
  for (const word of ["編成の全員に、おまかせ装備"]) assert.ok(!html.includes(word), `「${word}」は、もう出さない（おまかせ装備は1人ずつ）`);
  assert.ok(ownedCount(g) >= 15, `60回勧誘すれば、団員がそろってくる: ${ownedCount(g)}人`);
  assert.ok(equippedCount(g) >= 8, `編成に付いている装備: ${equippedCount(g)}か所`);
  assert.equal(TABS.length, 6);
  assert.ok(!html.includes("undefined") && !html.includes("NaN"), "undefined や NaN が画面に出ていない");
  assert.ok(!html.includes("勝てる見込み"), "勝てる見込みは、どの画面にも出さない");
  for (const word of ["まとめて稽古", "まとめて上げ", "全部上げる", "属性"]) assert.ok(!html.includes(word), `「${word}」は、どの画面にも出さない`);
  assert.ok(!html.includes("★★★★"), "★は3つまで");

  // 通常勧誘の確率の表に、エリートは出ない。高級勧誘には出る
  const normalRates = ratesHtml(g, ctx, "normal");
  const premiumRates = ratesHtml(g, ctx, "premium");
  for (const m of ctx.members) {
    const elite = ctx.params.recruit.rarities[m.rarity]?.elite === true;
    assert.equal(normalRates.includes(m.name), !elite, `通常勧誘の表: ${m.name}`);
    assert.ok(premiumRates.includes(m.name), `高級勧誘の表: ${m.name}`);
  }

  // 時間とともに変わる値（箱の中身）は、あとから書き込む場所がすべて用意されている
  const journey = journeyInfoHtml(g, ctx, uiState(), s.now());
  const live = journeyLive(g, ctx, s.now());
  const slots = [...journey.matchAll(/data-live(?:-width)?="([^"]+)"/g)].map((x) => x[1] as string);
  assert.ok(slots.length >= 5);
  for (const key of slots) assert.ok(live[key] !== undefined && live[key] !== "", `書き込む値がある: ${key}`);
  for (const key of Object.keys(live)) assert.ok(slots.includes(key), `書き込む場所がある: ${key}`);
  // 箱の中身が変わっても、画面の HTML は変わらない（押している途中のボタンを作り直さないため）
  const later = journeyInfoHtml(g, ctx, uiState(), s.now() + 30_000);
  assert.equal(later, journey);
  assert.notEqual(journeyLive(g, ctx, s.now() + 30_000)["idleGold"], live["idleGold"]);
});

test("言葉: 数の表示、技・相棒・報酬・レア度・装備の説明、戦闘に出る者の名前", () => {
  const ctx = loadContent(".");
  const p = ctx.params;
  assert.equal(formatNumber(9999), "9999");
  assert.equal(formatNumber(12345), "1.23万");
  assert.equal(formatNumber(1234567), "123.5万");
  for (const m of ctx.members) assert.ok(skillText(m.skill, p.battle.rallySec).length > 5);
  for (const c of ctx.companions) {
    assert.match(companionSkillText(c, c.skill.power, p.battle.rallySec), /秒ごとに/);
    assert.match(passiveText(c, 3), /団員全員の/);
  }
  assert.equal(passiveText(ctx.companionById["c_bear"] as (typeof ctx.companions)[number], 3), "団員全員の 体力 +6%");
  assert.equal(rewardText({ gold: 12345, tickets: 2, premiumTickets: 0, mats: 3 }), "おひねり 1.23万、通常チケット 2枚、相棒の素材 3こ");
  assert.equal(rewardText({ gold: 0, tickets: 0, premiumTickets: 10, mats: 0 }), "高級チケット 10枚");
  assert.equal(rewardText({ gold: 0, tickets: 0, premiumTickets: 0, mats: 0 }), "なし");
  const member = (id: string): (typeof ctx.members)[number] => ctx.byId[id] as (typeof ctx.members)[number];
  assert.equal(rarityText(member("h_stagehand"), p), "★");
  assert.equal(rarityText(member("h_costume"), p), "★★");
  assert.equal(rarityText(member("h_star"), p), "★★★");
  assert.equal(rarityText(member("h_leader"), p), "★★★ エリート");
  assert.equal(plusText(0), "");
  assert.equal(plusText(2), "+2");
  const sword = ctx.equipById["e_weapon_2"] as (typeof ctx.equipment)[number];
  assert.equal(equipName(sword, 0), "舞台の剣 ★★");
  assert.equal(equipName(sword, 2), "舞台の剣 ★★ +2");
  assert.equal(equipEffectText(sword, 0, p), "攻撃 +6%");
  assert.equal(equipEffectText(sword, 2, p), "攻撃 +10%");
  assert.equal(equipEffectText(ctx.equipById["e_costume_1"] as (typeof ctx.equipment)[number], 0, p), "体力 +3%");
  assert.equal(fighterName("c_bear", ctx), "もりのくま");
  assert.equal(fighterName("h_star", ctx), "花形役者");
  assert.ok(fighterName("enemy-3", ctx).length > 0);
});
