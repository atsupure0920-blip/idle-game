// ゲーム本体（戦闘、挑戦、放置報酬、団員、育成、相棒、ミッション、日課、セーブ）の単体テスト。第2版。
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。
//
// ルールの検査は、テスト専用の小さな数値（P）で行う。本番の数値（params/）を調整しても、ここは壊れない。
// 本番の数値そのものの妥当性は、模擬プレイ（scripts/check/acceptance.ts）が検査する。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createRng } from "../src/core/rng.ts";
import { runBattle } from "../src/core/battle.ts";
import type { CompanionSpec, FighterSpec } from "../src/core/battle.ts";
import {
  buildContent,
  companionCostMinutes,
  companionMatCost,
  companionSkillPower,
  enemyGrowth,
  firstClearGold,
  idleGoldPerMin,
  levelCap,
  levelCost,
  memberStats,
  stageLabel,
  totalStages,
} from "../src/core/params.ts";
import type { CompanionDef, Content, ContentData, DailyDef, MemberDef, MissionDef, Params } from "../src/core/params.ts";
import {
  GAME_VERSION,
  PARTY_SIZE,
  advance,
  allySpecs,
  battleStats,
  challenge,
  claimDaily,
  claimMission,
  collectIdle,
  companionLevelInfo,
  companionLevelUp,
  companionSpec,
  createGame,
  dailyList,
  enemySpecs,
  idlePending,
  isGameData,
  levelUp,
  levelUpMax,
  missionList,
  nextGoals,
  nextStage,
  ownedCount,
  passiveMult,
  promote,
  recruit,
  recruitRates,
  sanitizeGame,
  setCompanion,
  setPartySlot,
  trainParty,
} from "../src/core/game.ts";
import type { BattleSlot, ChallengeResult, GameData, GameEvent } from "../src/core/game.ts";
import { createInitialState } from "../src/core/state.ts";
import { SAVE_FORMAT, deserialize, serialize } from "../src/core/save.ts";
import { simulate } from "../src/sim/run.ts";
import { loadContent } from "../scripts/lib/content.ts";

const T0 = 1_760_000_000_000;
const MIN = 60_000;
const HOUR = 3_600_000;

const P: Params = {
  battle: { timeLimitSec: 60, gaugeMax: 100, gaugePerAttack: 34, damageVariance: 0.1, rallySec: 8, introSec: 2, resultSec: 2 },
  member: {
    baseHp: 100,
    baseAtk: 10,
    levelGrowth: 0.1,
    starBonus: 0.2,
    levelCapBase: 5,
    levelCapPerStar: 5,
    levelCostBase: 10,
    levelCostGrowth: 1.5,
    shardsToPromote: [1, 2],
  },
  enemy: { baseHp: 40, baseAtk: 3, stageGrowth: [1.1], chapterHpMult: [], chapterAtkMult: [], count: 3, intervalSec: 1.6, bossHpMult: 3, bossAtkMult: 1.5, bossIntervalSec: 2, bossSkillPower: 0.9 },
  economy: { idleGoldBase: 60, idleGoldGrowth: 1.5, idleCapHours: 8, firstClearMinutes: [1, 2], ticketStages: [2, 3], firstClearMats: 2 },
  companion: { levelCap: 3, costMinutesBase: 1, costMinutesGrowth: 2, matBase: 2, matGrowth: 2, matPerHour: 6, skillGrowth: 0.5 },
  progress: { chapters: 2, stagesPerChapter: 4 },
  recruit: { firstId: "heal", rarities: { N: { label: "ふつう", weight: 3, statMult: 1 }, S: { label: "すごい", weight: 1, statMult: 1.5 } } },
};

const M: MemberDef[] = [
  { id: "atk", name: "攻撃役", role: "attacker", rarity: "N", hp: 1.0, atk: 1.2, interval: 1.5, skill: { type: "strike", power: 3 }, starter: true },
  { id: "tank", name: "盾役", role: "tank", rarity: "N", hp: 1.7, atk: 0.7, interval: 1.8, skill: { type: "selfheal", power: 0.25 }, starter: true },
  { id: "heal", name: "回復役", role: "healer", rarity: "N", hp: 0.9, atk: 0.7, interval: 1.7, skill: { type: "heal", power: 4 } },
  { id: "aoe", name: "全体攻撃役", role: "attacker", rarity: "N", hp: 0.9, atk: 1.0, interval: 1.4, skill: { type: "aoe", power: 1 } },
  { id: "rare", name: "すごい人", role: "attacker", rarity: "S", hp: 1.0, atk: 1.0, interval: 1.5, skill: { type: "strike", power: 2 } },
];

const COMPANIONS: CompanionDef[] = [
  { id: "c1", name: "相棒1", chapter: 1, skill: { type: "healall", power: 1 }, interval: 4, passiveHp: 0.1, passiveAtk: 0, material: "素材1" },
  { id: "c2", name: "相棒2", chapter: 2, skill: { type: "aoe", power: 2 }, interval: 5, passiveHp: 0, passiveAtk: 0.1, material: "素材2" },
];

const MISSIONS: MissionDef[] = [
  { id: "m-clear1", text: "1面を突破する", kind: "clear", target: 1, reward: { tickets: 1 } },
  { id: "m-levels", text: "レベルを2回上げる", kind: "levelUps", target: 2, reward: { goldMin: 2 } },
  { id: "m-level3", text: "誰かをレベル3にする", kind: "memberLevel", target: 3, reward: { gold: 7 } },
  { id: "m-recruit", text: "勧誘を1回する", kind: "recruits", target: 1, reward: { gold: 5 } },
  { id: "m-party", text: "編成を3人にする", kind: "partySize", target: 3, reward: { tickets: 1 } },
  { id: "m-promote", text: "1回昇格させる", kind: "promotes", target: 1, reward: { tickets: 2 } },
  { id: "m-idle", text: "箱から受け取る", kind: "idleClaims", target: 1, reward: { gold: 3 } },
  { id: "m-comp", text: "ボスを相棒にする", kind: "companions", target: 1, reward: { mats: 3 } },
  { id: "m-equip", text: "相棒を編成に入れる", kind: "companionEquipped", target: 1, reward: { gold: 50 } },
  { id: "m-clv", text: "相棒のレベルを1回上げる", kind: "companionLevelUps", target: 1, reward: { tickets: 1 } },
];

const DAILIES: DailyDef[] = [
  { id: "d-idle", text: "箱から受け取る", kind: "idleClaims", target: 1, reward: { goldMin: 1 } },
  { id: "d-challenge", text: "2回挑戦する", kind: "challenges", target: 2, reward: { gold: 5 } },
  { id: "d-all", text: "日課を2つ達成する", kind: "dailyClaims", target: 2, reward: { tickets: 1 } },
];

const DATA: ContentData = { params: P, members: M, companions: COMPANIONS, missions: MISSIONS, dailies: DAILIES };
const C: Content = buildContent(DATA);

function withParams(patch: (p: Params) => void): Content {
  const p = JSON.parse(JSON.stringify(P)) as Params;
  patch(p);
  return buildContent({ ...DATA, params: p });
}

/** 必ず勝てる数値。 */
function easyContent(): Content {
  return withParams((p) => {
    p.enemy.baseHp = 5;
    p.enemy.baseAtk = 0.5;
    p.enemy.stageGrowth = [1.01];
  });
}

/** 2面目から、必ず負ける数値。 */
function hardContent(): Content {
  return withParams((p) => {
    p.enemy.stageGrowth = [500];
  });
}

/** 挑戦して、結果が反映される時刻まで進める。 */
function fight(game: GameData, nowMs: number, ctx: Content, dayKey = 0): { game: GameData; events: GameEvent[]; atMs: number; result: ChallengeResult } {
  const result = challenge(game, nowMs, ctx);
  assert.equal(result.ok, true, result.reason);
  const atMs = (result.game.battle as BattleSlot).resolveAtMs;
  const r = advance(result.game, atMs, dayKey, ctx);
  return { game: r.game, events: r.events, atMs, result };
}

/** 指定の面を突破するまで、続けて挑戦する（勝てる数値で使う）。 */
function clearTo(game: GameData, nowMs: number, target: number, ctx: Content): { game: GameData; nowMs: number; events: GameEvent[] } {
  let g = game;
  let t = nowMs;
  const events: GameEvent[] = [];
  while (g.highestCleared < target) {
    const f = fight(g, t, ctx);
    assert.ok(f.game.highestCleared > g.highestCleared, "勝てるはず");
    g = f.game;
    t = f.atMs + 1000;
    events.push(...f.events);
  }
  return { game: g, nowMs: t, events };
}

const spec = (key: string, row: 0 | 1, hp: number, atk: number, interval = 1.5): FighterSpec => ({ key, row, hp, atk, interval, skill: null });

// ---------------------------------------------------------------- 戦闘

test("戦闘: 同じ乱数の種なら、出来事まで同じになる", () => {
  const allies = [spec("a", 0, 200, 12), spec("b", 1, 100, 15)];
  const enemies = [spec("x", 0, 150, 8), spec("y", 1, 100, 8)];
  const r1 = runBattle(allies, enemies, P.battle, createRng(7), true);
  const r2 = runBattle(allies, enemies, P.battle, createRng(7), true);
  assert.deepEqual(r1, r2);
  assert.ok(r1.events.length > 0);
});

test("戦闘: 強いほうが勝ち、弱いほうが負ける", () => {
  const strong = [spec("a", 0, 1000, 100)];
  const weak = [spec("x", 0, 50, 1)];
  assert.equal(runBattle(strong, weak, P.battle, createRng(1), false).win, true);
  assert.equal(runBattle(weak, strong, P.battle, createRng(1), false).win, false);
});

test("戦闘: 決着がつかなければ、制限時間で負けになる", () => {
  const r = runBattle([spec("a", 0, 100000, 1)], [spec("x", 0, 100000, 1)], P.battle, createRng(1), false);
  assert.equal(r.win, false);
  assert.equal(r.timedOut, true);
  assert.equal(r.durationSec, P.battle.timeLimitSec);
});

test("戦闘: 前列が残っている間は、後列は狙われない", () => {
  const allies = [spec("front", 0, 300, 1), spec("back", 1, 300, 1)];
  const enemies = [spec("x", 0, 100000, 20)];
  const r = runBattle(allies, enemies, P.battle, createRng(3), true);
  const frontDown = r.events.findIndex((e) => e.kind === "down" && e.side === 0 && e.actor === 0);
  assert.ok(frontDown > 0, "前列が倒れるはず");
  const hitsBefore = r.events.slice(0, frontDown).filter((e) => e.side === 1 && e.kind === "attack");
  assert.ok(hitsBefore.length > 0);
  assert.ok(hitsBefore.every((e) => e.target === 0), "前列が倒れるまで、後列は攻撃されない");
});

test("戦闘: 狙う相手は運で選ばず、前列の中で残りの体力がいちばん少ない相手", () => {
  const allies = [spec("a", 0, 100000, 40)];
  const enemies = [spec("big", 0, 500, 1), spec("small", 0, 200, 1), spec("back", 1, 50, 1)];
  const r = runBattle(allies, enemies, P.battle, createRng(5), true);
  const hits = r.events.filter((e) => e.side === 0 && e.kind === "attack");
  const smallDown = r.events.findIndex((e) => e.kind === "down" && e.side === 1 && e.actor === 1);
  const bigDown = r.events.findIndex((e) => e.kind === "down" && e.side === 1 && e.actor === 0);
  assert.equal(hits[0]?.target, 1, "体力の少ないほうから狙う");
  assert.ok(smallDown > 0 && bigDown > smallDown, "少ないほうを倒しきってから、次へ移る");
  assert.ok(r.events.slice(0, bigDown).every((e) => !(e.side === 0 && e.target === 2)), "前列が残っている間は、後列を狙わない");
});

test("戦闘: 「挑発」持ちがいると、相手はその団員を先に狙う（後列にいても）", () => {
  const allies: FighterSpec[] = [spec("front", 0, 300, 1), { ...spec("taunter", 1, 300, 1), trait: "taunt" }];
  const enemies = [spec("x", 0, 100000, 20)];
  const r = runBattle(allies, enemies, P.battle, createRng(3), true);
  const taunterDown = r.events.findIndex((e) => e.kind === "down" && e.side === 0 && e.actor === 1);
  assert.ok(taunterDown > 0, "挑発持ちが先に倒れる");
  const before = r.events.slice(0, taunterDown).filter((e) => e.side === 1 && e.kind === "attack");
  assert.ok(before.length > 0 && before.every((e) => e.target === 1), "挑発持ちが倒れるまで、ほかは攻撃されない");
  const after = r.events.slice(taunterDown).filter((e) => e.side === 1 && e.kind === "attack");
  assert.ok(after.length > 0 && after.every((e) => e.target === 0), "倒れたあとは、ふつうに前列を狙う");
});

test("戦闘: 「後列ねらい」は、相手の後列を先に狙う。後列がいなくなれば前列を狙う", () => {
  const allies: FighterSpec[] = [{ ...spec("sniper", 0, 100000, 30), trait: "backline" }];
  const enemies = [spec("front", 0, 300, 1), spec("back", 1, 300, 1)];
  const r = runBattle(allies, enemies, P.battle, createRng(2), true);
  const backDown = r.events.findIndex((e) => e.kind === "down" && e.side === 1 && e.actor === 1);
  assert.ok(backDown > 0);
  assert.ok(r.events.slice(0, backDown).filter((e) => e.side === 0 && e.kind === "attack").every((e) => e.target === 1), "まず後列だけを狙う");
  assert.equal(r.win, true, "後列を倒したあと、前列も倒しきる");

  // 相手に挑発持ちがいれば、後列ねらいでもそちらを狙う
  const taunting: FighterSpec[] = [{ ...spec("front", 0, 300, 1), trait: "taunt" }, spec("back", 1, 300, 1)];
  const r2 = runBattle(allies, taunting, P.battle, createRng(2), true);
  assert.equal(r2.events.find((e) => e.side === 0 && e.kind === "attack")?.target, 0);
});

test("戦闘: 技が使われる（単体、全体、回復、鼓舞）", () => {
  const allies: FighterSpec[] = [
    { key: "s", row: 0, hp: 5000, atk: 10, interval: 1, skill: { type: "strike", power: 3 } },
    { key: "a", row: 0, hp: 5000, atk: 10, interval: 1, skill: { type: "aoe", power: 1 } },
    { key: "h", row: 1, hp: 5000, atk: 10, interval: 1, skill: { type: "heal", power: 4 } },
    { key: "r", row: 1, hp: 5000, atk: 10, interval: 1, skill: { type: "rally", power: 0.5 } },
  ];
  const enemies = [spec("x", 0, 3000, 30), spec("y", 0, 3000, 30)];
  const r = runBattle(allies, enemies, P.battle, createRng(5), true);
  for (const kind of ["strike", "aoe", "heal", "rally"]) {
    assert.ok(r.events.some((e) => e.kind === kind), `${kind} が使われるはず`);
  }
  const strike = r.events.find((e) => e.kind === "strike");
  assert.ok(strike && strike.amount >= 10 * 3 * 0.9, "単体の技は、通常の攻撃より大きい");
});

test("戦闘: 相棒は、決まった間隔で技を使う。場には立たず、狙われない", () => {
  const allies = [spec("a", 0, 100000, 1)];
  const enemies = [spec("x", 0, 100000, 5), spec("y", 1, 100000, 5)];
  const companion: CompanionSpec = { key: "c", atk: 100, interval: 5, skill: { type: "aoe", power: 2 } };
  const r = runBattle(allies, enemies, P.battle, createRng(4), true, companion);
  const acts = r.events.filter((e) => e.side === 0 && e.actor === -1);
  const times = [...new Set(acts.map((e) => e.t))];
  assert.deepEqual(times, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], "5秒ごとに技を使う");
  assert.ok(acts.every((e) => e.kind === "aoe" && e.targetSide === 1 && e.amount >= 100 * 2 * 0.9));
  assert.equal(acts.filter((e) => e.t === 5).length, 2, "全体の技は、敵全員に当たる");
  assert.ok(r.events.every((e) => !(e.side === 1 && e.target === -1)), "相棒は狙われない");

  const none = runBattle(allies, enemies, P.battle, createRng(4), true);
  assert.ok(none.events.every((e) => e.actor !== -1), "相棒を入れなければ、相棒の行動はない");
});

test("戦闘: 相棒の技で、勝てなかった相手に勝てる。回復と鼓舞の技も使う", () => {
  const allies = [spec("a", 0, 400, 10)];
  const enemies = [spec("x", 0, 2000, 10)];
  assert.equal(runBattle(allies, enemies, P.battle, createRng(1), false).win, false);
  const striker: CompanionSpec = { key: "c", atk: 100, interval: 3, skill: { type: "strike", power: 3 } };
  assert.equal(runBattle(allies, enemies, P.battle, createRng(1), false, striker).win, true);

  const healer: CompanionSpec = { key: "c", atk: 50, interval: 3, skill: { type: "healall", power: 1 } };
  const healed = runBattle(allies, enemies, P.battle, createRng(1), true, healer);
  assert.ok(healed.events.some((e) => e.actor === -1 && e.kind === "healall" && e.targetSide === 0 && e.amount > 0), "味方を回復する");

  const cheer: CompanionSpec = { key: "c", atk: 50, interval: 3, skill: { type: "rally", power: 1 } };
  const rallied = runBattle(allies, enemies, P.battle, createRng(1), true, cheer);
  assert.ok(rallied.events.some((e) => e.actor === -1 && e.kind === "rally"));
  const plain = runBattle(allies, enemies, P.battle, createRng(1), true);
  const dealt = (r: typeof plain): number => r.events.filter((e) => e.side === 0 && e.kind === "attack").reduce((a, e) => a + e.amount, 0) / r.durationSec;
  assert.ok(dealt(rallied) > dealt(plain) * 1.3, "鼓舞で、与えるダメージが増える");
});

// ---------------------------------------------------------------- 開始と挑戦

test("開始: 最初の団員が編成に入り、盾役が前列の先頭になる", () => {
  const g = createGame(T0, 1, C);
  assert.equal(g.v, GAME_VERSION);
  assert.equal(ownedCount(g), 2);
  assert.equal(g.party.length, PARTY_SIZE);
  assert.deepEqual(g.party, ["tank", "atk", null, null]);
  assert.equal(nextStage(g, C), 1);
  assert.equal(g.battle, null);
  assert.equal(g.companionSlot, null);
  assert.equal(allySpecs(g, C).length, 2);
  assert.equal(isGameData(g), true);
});

test("挑戦: 押すまでは戦わない。勝っても、自動では次の面へ進まない", () => {
  let g = createGame(T0, 1, C);
  const events: GameEvent[] = [];
  for (let t = T0; t <= T0 + 5 * MIN; t += 1000) {
    const r = advance(g, t, 0, C);
    g = r.game;
    events.push(...r.events);
  }
  assert.equal(g.stats.battles, 0);
  assert.equal(g.highestCleared, 0);
  assert.equal(events.length, 0);

  const f = fight(g, T0 + 5 * MIN, C);
  assert.equal(f.game.highestCleared, 1);
  const later = advance(f.game, f.atMs + 10 * MIN, 0, C);
  assert.equal(later.game.stats.battles, 1, "勝ったあとも、押すまで次の戦闘は始まらない");
  assert.equal(later.game.battle, null);
  assert.equal(later.events.length, 0);
});

test("挑戦: 結末は押した時点で決まり、戦闘が終わる時刻に反映される", () => {
  const g0 = createGame(T0, 1, C);
  const c = challenge(g0, T0, C);
  assert.equal(c.ok, true);
  assert.equal(g0.battle, null, "元の状態は書き換えない");
  assert.ok(c.replay && c.replay.events.length > 0, "再生用のデータが返る");
  assert.equal(c.stage, 1);
  assert.equal(c.allies?.length, 2);
  assert.equal(c.enemies?.length, 3);
  const b = c.game.battle as BattleSlot;
  assert.equal(b.startedAtMs, T0 + P.battle.introSec * 1000, "面の紹介のあとに始まる");
  assert.equal(b.endsAtMs, b.startedAtMs + Math.round((c.replay?.durationSec ?? 0) * 1000));
  assert.equal(b.resolveAtMs, b.endsAtMs + P.battle.resultSec * 1000);
  assert.equal(c.game.stats.battles, 1);
  assert.equal(challenge(c.game, T0 + 1000, C).ok, false, "戦闘中は、挑戦できない");

  const before = advance(c.game, b.resolveAtMs - 1, 0, C);
  assert.equal(before.events.length, 0);
  assert.ok(before.game.battle !== null);
  assert.equal(before.game.highestCleared, 0);

  const after = advance(before.game, b.resolveAtMs, 0, C);
  const win = after.events.find((e) => e.type === "win");
  assert.ok(win && win.type === "win" && win.stage === 1 && win.atMs === b.resolveAtMs);
  assert.equal(after.game.highestCleared, 1);
  assert.equal(after.game.battle, null);
  assert.equal(after.game.stats.wins, 1);
  assert.equal(nextStage(after.game, C), 2);
});

test("挑戦: 同じ種なら同じ結果になる。種が違えば、戦闘の中身が変わる", () => {
  const a = clearTo(createGame(T0, 42, C), T0, 3, C).game;
  const b = clearTo(createGame(T0, 42, C), T0, 3, C).game;
  assert.deepEqual(a, b);
  const c = clearTo(createGame(T0, 43, C), T0, 3, C).game;
  assert.notEqual(a.rngState, c.rngState);
});

test("進行: 何秒おきに呼んでも、結果は変わらない", () => {
  const start = challenge(createGame(T0, 9, C), T0, C).game;
  let a = start;
  for (let t = T0; t <= T0 + 90_000; t += 1000) a = advance(a, t, 0, C).game;
  const b = advance(start, T0 + 90_000, 0, C).game;
  assert.deepEqual(a, b);
  assert.deepEqual(idlePending(a, T0 + 2 * HOUR, C), idlePending(b, T0 + 2 * HOUR, C));
});

test("挑戦: 負けても失うものはなく、何度でも挑める。勝手には再挑戦しない", () => {
  const hard = hardContent();
  const first = clearTo(createGame(T0, 1, hard), T0, 1, hard);
  const before = first.game;
  const f = fight(before, first.nowMs, hard);
  const defeat = f.events.find((e) => e.type === "defeat");
  assert.ok(defeat && defeat.type === "defeat" && defeat.stage === 2);
  assert.equal(f.game.highestCleared, 1);
  assert.equal(f.game.gold, before.gold, "おひねりは減らない");
  assert.deepEqual(f.game.members, before.members);
  assert.equal(f.game.stats.defeats, 1);
  assert.equal(f.game.stats.firstDefeatAtMs, f.atMs);
  assert.equal(f.events.some((e) => e.type === "win"), false);

  const later = advance(f.game, f.atMs + 10 * MIN, 0, hard);
  assert.equal(later.game.stats.battles, before.stats.battles + 1, "勝手には再挑戦しない");
  const again = challenge(later.game, f.atMs + 10 * MIN, hard);
  assert.equal(again.ok, true);
  assert.equal(again.stage, 2, "同じ面に、もう一度挑める");
});

test("挑戦: 最後の面まで突破したら、もう挑戦できない", () => {
  const easy = easyContent();
  const r = clearTo(createGame(T0, 1, easy), T0, totalStages(easy.params), easy);
  assert.equal(r.game.highestCleared, 8);
  assert.ok(r.events.some((e) => e.type === "allClear"));
  assert.equal(nextStage(r.game, easy), null);
  assert.equal(challenge(r.game, r.nowMs, easy).ok, false);
  assert.deepEqual(nextGoals(r.game, easy), { bossIn: null, bossStage: null });
});

test("初クリア報酬: 面ごとの「何分ぶん」のおひねりと、決まった面のチケットが入る", () => {
  const easy = easyContent();
  const p = easy.params;
  let g = createGame(T0, 1, easy);
  const f1 = fight(g, T0, easy);
  const w1 = f1.events.find((e) => e.type === "win");
  assert.ok(w1 && w1.type === "win");
  assert.deepEqual(w1.reward, { gold: firstClearGold(1, p), tickets: 0, mats: 0 });
  assert.equal(firstClearGold(1, p), Math.round(idleGoldPerMin(1, p) * 1));
  assert.equal(f1.game.gold, firstClearGold(1, p));
  g = f1.game;

  const f2 = fight(g, f1.atMs + 1000, easy);
  const w2 = f2.events.find((e) => e.type === "win");
  assert.ok(w2 && w2.type === "win");
  assert.equal(firstClearGold(2, p), Math.round(idleGoldPerMin(2, p) * 2), "表の最後の値が、その先の面にも使われる");
  assert.deepEqual(w2.reward, { gold: firstClearGold(2, p), tickets: 1, mats: 0 });
  assert.equal(f2.game.tickets, 1);
  assert.equal(f2.game.gold, firstClearGold(1, p) + firstClearGold(2, p));
});

test("敵: 面ごとの伸びの表どおりに強くなる。章の最後はボス1体", () => {
  const ctx = withParams((p) => {
    p.enemy.stageGrowth = [2, 3];
  });
  assert.equal(enemyGrowth(1, ctx.params), 1);
  assert.equal(enemyGrowth(2, ctx.params), 2);
  assert.equal(enemyGrowth(3, ctx.params), 6);
  assert.equal(enemyGrowth(4, ctx.params), 18, "表が足りないぶんは、最後の値をくり返す");
  const normal = enemySpecs(2, ctx);
  assert.equal(normal.length, 3);
  assert.equal(normal[0]?.hp, 80);
  const boss = enemySpecs(4, ctx);
  assert.equal(boss.length, 1);
  assert.equal(boss[0]?.key, "c1", "ボスは、その章の相棒になる魔物");
  assert.equal(boss[0]?.hp, 40 * 18 * 3);
  assert.equal(stageLabel(5, ctx.params), "2-1");
  assert.deepEqual(nextGoals(createGame(T0, 1, ctx), ctx), { bossIn: 4, bossStage: 4 });
});

// ---------------------------------------------------------------- 放置報酬と時刻

test("放置報酬: 時間でたまる。開いていても閉じていても同じ量", () => {
  const g0 = createGame(T0, 1, C);
  const rate = idleGoldPerMin(0, P);
  assert.equal(rate, P.economy.idleGoldBase, "1面も突破していないうちは、1面のぶん");
  const pending = idlePending(g0, T0 + 10 * MIN, C);
  assert.equal(pending.gold, 10 * rate);
  assert.equal(pending.ratePerMin, rate);
  assert.equal(pending.capped, false);
  assert.equal(pending.elapsedMs, 10 * MIN);

  // 開いたまま（1秒ごとに進める）でも、閉じていても（一度に進める）、同じ
  let open = g0;
  for (let t = T0; t <= T0 + 10 * MIN; t += 1000) open = advance(open, t, 0, C).game;
  const closed = advance(g0, T0 + 10 * MIN, 0, C).game;
  assert.equal(idlePending(open, T0 + 10 * MIN, C).gold, idlePending(closed, T0 + 10 * MIN, C).gold);
  assert.equal(open.gold, 0, "受け取るまでは増えない");

  const got = collectIdle(closed, T0 + 10 * MIN, C);
  assert.equal(got.ok, true);
  assert.equal(got.gold, 10 * rate);
  assert.equal(got.game.gold, 10 * rate);
  assert.equal(got.game.counters.idleClaims, 1);
  assert.equal(idlePending(got.game, T0 + 10 * MIN, C).gold, 0);
  assert.equal(collectIdle(got.game, T0 + 10 * MIN, C).ok, false, "何もなければ受け取れない");
  assert.equal(idlePending(got.game, T0 + 11 * MIN, C).gold, rate, "受け取ったあとも、また貯まる");
});

test("放置報酬: 1分あたりの量は、最高到達面で決まる。進む前のぶんは、前の速さで積まれる", () => {
  const easy = easyContent();
  const p = easy.params;
  const r = clearTo(createGame(T0, 1, easy), T0, 2, easy);
  const wins = r.events.filter((e) => e.type === "win");
  const t2 = (wins[1] as { atMs: number }).atMs;
  const now = t2 + 30 * MIN;
  // 1面目と2面目を突破するまでは idleGoldPerMin(0)=idleGoldPerMin(1)、そのあとは idleGoldPerMin(2)
  const expected = (idleGoldPerMin(1, p) * (t2 - T0)) / MIN + idleGoldPerMin(2, p) * 30;
  assert.equal(idlePending(r.game, now, easy).gold, Math.floor(expected));
  assert.equal(idlePending(r.game, now, easy).ratePerMin, idleGoldPerMin(2, p));
  assert.ok(idleGoldPerMin(2, p) > idleGoldPerMin(1, p));
});

test("放置報酬: 上限（8時間ぶん）で頭打ちになる。受け取ると、また貯まり始める", () => {
  const g0 = createGame(T0, 1, C);
  const at8 = idlePending(g0, T0 + 8 * HOUR, C);
  const at30 = idlePending(g0, T0 + 30 * HOUR, C);
  assert.equal(at8.gold, 8 * 60 * P.economy.idleGoldBase);
  assert.equal(at30.gold, at8.gold);
  assert.equal(at30.capped, true);
  assert.equal(at30.elapsedMs, 8 * HOUR);
  assert.equal(idlePending(g0, T0 + 7 * HOUR, C).capped, false);

  const got = collectIdle(g0, T0 + 30 * HOUR, C);
  assert.equal(got.gold, at8.gold);
  const next = idlePending(got.game, T0 + 31 * HOUR, C);
  assert.equal(next.gold, 60 * P.economy.idleGoldBase);
  assert.equal(next.capped, false);
});

test("放置報酬: 相棒の専用の素材も、相棒になった時点からたまる", () => {
  const easy = easyContent();
  const r = clearTo(createGame(T0, 1, easy), T0, 4, easy);
  assert.ok(r.game.companions["c1"]);
  const gotAt = r.game.stats.firstCompanionAtMs as number;
  const pending = idlePending(r.game, gotAt + 2 * HOUR, easy);
  assert.deepEqual(pending.mats, { c1: 2 * easy.params.companion.matPerHour });
  const got = collectIdle(r.game, gotAt + 2 * HOUR, easy);
  assert.equal(got.ok, true);
  assert.deepEqual(got.mats, { c1: 12 });
  assert.equal(got.game.materials["c1"], (r.game.materials["c1"] ?? 0) + 12);
  assert.deepEqual(idlePending(got.game, gotAt + 2 * HOUR, easy).mats, { c1: 0 });
});

test("時刻: 端末の時計が戻っていたら、離れていた時間は0として扱う", () => {
  const base = advance(createGame(T0, 1, C), T0 + 10 * MIN, 0, C).game;
  const banked = idlePending(base, T0 + 10 * MIN, C).gold;
  const back = T0 - 24 * HOUR;
  const r = advance(base, back, 0, C);
  assert.ok(r.events.some((e) => e.type === "clockBack"));
  assert.equal(r.game.gold, base.gold);
  const now = idlePending(r.game, back, C);
  assert.ok(now.gold >= 0 && now.gold <= banked, "戻ったぶんで増えたり、負の数になったりしない");
  assert.equal(idlePending(r.game, back + 10 * MIN, C).gold, now.gold + 10 * P.economy.idleGoldBase, "そこから、また貯まる");
  assert.equal(idlePending(r.game, back + 100 * HOUR, C).capped, true);

  // 戦闘の途中で時計が戻っても、戦闘は続けられる
  const c = challenge(base, T0 + 10 * MIN, C);
  const shifted = advance(c.game, T0, 0, C).game;
  assert.equal(shifted.battle?.startedAtMs, T0);
  const done = advance(shifted, (shifted.battle as BattleSlot).resolveAtMs, 0, C);
  assert.ok(done.events.some((e) => e.type === "win"));
});

// ---------------------------------------------------------------- 団員

test("団員: 最初の勧誘では、決まった団員が必ず出る。新しい団員はレベル1から始まる", () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const g: GameData = { ...createGame(T0, seed, C), tickets: 1, members: { tank: { level: 4, star: 0, shards: 0 }, atk: { level: 3, star: 0, shards: 0 } } };
    const r = recruit(g, C);
    assert.equal(r.ok, true);
    assert.equal(r.id, "heal");
    assert.equal(r.duplicate, false);
    assert.equal(r.game.tickets, 0);
    assert.deepEqual(r.game.members["heal"], { level: 1, star: 0, shards: 0 });
    assert.equal(r.game.counters.recruits, 1);
  }
});

test("団員: チケットがなければ勧誘できない。重なると「かけら」になる", () => {
  assert.equal(recruit(createGame(T0, 1, C), C).ok, false);
  let g: GameData = { ...createGame(T0, 11, C), tickets: 80 };
  const seen = new Set<string>();
  let duplicates = 0;
  for (let i = 0; i < 80; i++) {
    const r = recruit(g, C);
    assert.equal(r.ok, true);
    g = r.game;
    seen.add(r.id as string);
    if (r.duplicate) duplicates += 1;
  }
  assert.deepEqual([...seen].sort(), ["aoe", "atk", "heal", "rare", "tank"]);
  const shards = Object.values(g.members).reduce((a, m) => a + m.shards, 0);
  assert.equal(shards, duplicates, "重なった回数だけ、かけらが増える");
  assert.equal(duplicates, 80 - 3, "新しく来たのは3人だけ");
  assert.equal(ownedCount(g), 5);
});

test("団員: 提供割合は、レア度の出やすさで決まり、合計は1", () => {
  const rates = recruitRates(C);
  assert.ok(Math.abs(rates.reduce((a, r) => a + r.rate, 0) - 1) < 1e-9);
  const of = (id: string): number => rates.find((r) => r.id === id)?.rate ?? 0;
  assert.ok(Math.abs(of("rare") - 0.25) < 1e-9, "レア度 S は全体の 1/4（団員は1人）");
  assert.ok(Math.abs(of("atk") - 0.75 / 4) < 1e-9, "レア度 N は全体の 3/4 を、4人で分ける");

  // 団員のいないレア度は、割合に入らない
  const onlyN = buildContent({ ...DATA, members: M.filter((m) => m.rarity === "N") });
  const r2 = recruitRates(onlyN);
  assert.equal(r2.length, 4);
  assert.ok(r2.every((r) => Math.abs(r.rate - 0.25) < 1e-9));
});

test("団員: レア度の倍率が、能力にかかる", () => {
  const rare = C.byId["rare"] as MemberDef;
  const s = memberStats(rare, 1, 0, P);
  assert.equal(s.hp, 150);
  assert.equal(s.atk, 15);
  assert.throws(() => buildContent({ ...DATA, members: [...M, { ...rare, id: "x", rarity: "ない" }] }), /レア度/);
});

test("編成: 置く、入れ替える、外す。空にはできない", () => {
  let g: GameData = { ...createGame(T0, 1, C), tickets: 1 };
  g = recruit(g, C).game;
  const placed = setPartySlot(g, 2, "heal");
  assert.equal(placed.ok, true);
  assert.deepEqual(placed.game.party, ["tank", "atk", "heal", null]);
  const swapped = setPartySlot(placed.game, 0, "heal");
  assert.deepEqual(swapped.game.party, ["heal", "atk", "tank", null], "すでにいる団員を置くと入れ替わる");
  assert.equal(setPartySlot(g, 0, "nobody").ok, false);
  assert.equal(setPartySlot(g, 9, "tank").ok, false);
  const one = setPartySlot(g, 1, null).game;
  assert.equal(setPartySlot(one, 0, null).ok, false, "最後の1人は外せない");
});

// ---------------------------------------------------------------- 育成

test("育成: レベルを上げると、おひねりが減って能力が上がる", () => {
  const g = { ...createGame(T0, 1, C), gold: 100 };
  const r = levelUp(g, "atk", C);
  assert.equal(r.ok, true);
  assert.equal(r.game.gold, 100 - levelCost(1, P));
  assert.equal(r.game.members["atk"]?.level, 2);
  assert.equal(r.game.counters.levelUps, 1);
  const def = C.byId["atk"] as MemberDef;
  assert.ok(memberStats(def, 2, 0, P).atk > memberStats(def, 1, 0, P).atk);
  assert.equal(g.members["atk"]?.level, 1, "元の状態は書き換えない");
});

test("育成: おひねりが足りなければ上げられない。上限を超えては上げられない", () => {
  assert.equal(levelUp(createGame(T0, 1, C), "atk", C).ok, false);
  let g: GameData = { ...createGame(T0, 1, C), gold: 1_000_000 };
  for (let i = 0; i < 20; i++) g = levelUp(g, "atk", C).game;
  assert.equal(g.members["atk"]?.level, P.member.levelCapBase);
  assert.equal(levelUp(g, "atk", C).ok, false);
});

test("育成: 「まとめて上げる」は、おひねりが続くかぎり上げる。操作は1回と数える", () => {
  const cost3 = levelCost(1, P) + levelCost(2, P) + levelCost(3, P);
  const g = { ...createGame(T0, 1, C), gold: cost3 + 5 };
  const r = levelUpMax(g, "atk", C);
  assert.equal(r.ok, true);
  assert.equal(r.levels, 3);
  assert.equal(r.game.members["atk"]?.level, 4);
  assert.equal(r.game.gold, 5);
  assert.equal(r.game.counters.levelUps, 3);
  assert.equal(r.game.stats.actions, g.stats.actions + 1);

  const rich = levelUpMax({ ...g, gold: 1_000_000 }, "atk", C);
  assert.equal(rich.game.members["atk"]?.level, levelCap(0, P), "上限で止まる");
  assert.equal(levelUpMax(createGame(T0, 1, C), "atk", C).ok, false);
});

test("育成: 「編成をまとめて稽古」は、レベルの低い団員から順に上げる", () => {
  let g: GameData = { ...createGame(T0, 1, C), gold: 0 };
  g = { ...g, members: { tank: { level: 3, star: 0, shards: 0 }, atk: { level: 1, star: 0, shards: 0 } } };
  // atk を 1→3 にするぶんだけ渡すと、tank には回らない
  const justEnough = trainParty({ ...g, gold: levelCost(1, P) + levelCost(2, P) }, C);
  assert.equal(justEnough.ok, true);
  assert.equal(justEnough.levels, 2);
  assert.deepEqual([justEnough.game.members["atk"]?.level, justEnough.game.members["tank"]?.level], [3, 3]);
  assert.equal(justEnough.game.gold, 0);

  const rich = trainParty({ ...g, gold: 1_000_000 }, C);
  assert.deepEqual([rich.game.members["atk"]?.level, rich.game.members["tank"]?.level], [5, 5], "全員が上限まで上がる");
  assert.equal(rich.game.stats.actions, g.stats.actions + 1, "操作は1回と数える");
  assert.equal(trainParty(g, C).ok, false, "おひねりがなければ、できない");

  // 控えの団員は上げない
  const bench: GameData = { ...g, gold: 1_000_000, members: { ...g.members, heal: { level: 1, star: 0, shards: 0 } } };
  assert.equal(trainParty(bench, C).game.members["heal"]?.level, 1);
});

test("育成: かけらで昇格すると、上限が伸びて能力が上がる", () => {
  let g: GameData = { ...createGame(T0, 1, C), gold: 1_000_000 };
  assert.equal(promote(g, "atk", C).ok, false, "かけらがなければ昇格できない");
  g = { ...g, members: { ...g.members, atk: { level: 5, star: 0, shards: 3 } } };
  const r = promote(g, "atk", C);
  assert.equal(r.ok, true);
  assert.equal(r.game.members["atk"]?.star, 1);
  assert.equal(r.game.members["atk"]?.shards, 2);
  assert.equal(r.game.counters.promotes, 1);
  assert.equal(levelUp(r.game, "atk", C).ok, true, "上限が伸びたので、また上げられる");
  const def = C.byId["atk"] as MemberDef;
  assert.ok(memberStats(def, 5, 1, P).hp > memberStats(def, 5, 0, P).hp);
  const top = promote(promote(r.game, "atk", C).game, "atk", C);
  assert.equal(top.ok, false, "★の上限を超えては昇格できない");
});

// ---------------------------------------------------------------- 相棒

/** 第1章のボスを倒して、相棒 c1 を持っている状態。 */
function withCompanion(ctx: Content): { game: GameData; nowMs: number; events: GameEvent[] } {
  return clearTo(createGame(T0, 1, ctx), T0, 4, ctx);
}

test("相棒: 章のボスを初めて倒すと、そのボスが相棒になる（団員にはならない）", () => {
  const easy = easyContent();
  const r = withCompanion(easy);
  const got = r.events.filter((e) => e.type === "companion");
  assert.equal(got.length, 1);
  assert.ok(got[0]?.type === "companion" && got[0].id === "c1");
  assert.deepEqual(r.game.companions, { c1: { level: 1 } });
  assert.equal(r.game.members["c1"], undefined);
  assert.equal(ownedCount(r.game), 2);
  assert.ok(r.game.stats.firstCompanionAtMs !== null);
  assert.equal(r.game.companionSlot, null, "編成には、自分で入れる");

  const all = clearTo(r.game, r.nowMs, 8, easy);
  assert.deepEqual(Object.keys(all.game.companions).sort(), ["c1", "c2"]);
});

test("相棒: 持っているだけで、団員全体の能力が底上げされる（編成に入れていなくても、全員ぶん）", () => {
  const easy = easyContent();
  const p = easy.params;
  const g0 = createGame(T0, 1, easy);
  const def = easy.byId["tank"] as MemberDef;
  const raw = memberStats(def, 1, 0, p);
  assert.deepEqual(battleStats(g0, "tank", easy), raw);

  const one = withCompanion(easy).game;
  assert.equal(one.companionSlot, null);
  assert.deepEqual(passiveMult(one, easy), { hp: 1.1, atk: 1 });
  assert.deepEqual(battleStats(one, "tank", easy), { hp: Math.round(raw.hp * 1.1), atk: raw.atk });

  const leveled: GameData = { ...one, companions: { c1: { level: 3 }, c2: { level: 2 } } };
  const m = passiveMult(leveled, easy);
  assert.ok(Math.abs(m.hp - 1.3) < 1e-9 && Math.abs(m.atk - 1.2) < 1e-9, "レベルに比例し、相棒ごとに足される");
  assert.equal(allySpecs(leveled, easy).find((s) => s.key === "tank")?.hp, Math.round(raw.hp * 1.3));
});

test("相棒: 編成に入れた1体が、戦闘中に技を使う。技はレベルで伸びる", () => {
  const easy = easyContent();
  const one = withCompanion(easy);
  assert.equal(companionSpec(one.game, easy), null, "入れていなければ、技は出ない");
  assert.equal(setCompanion(one.game, "nobody").ok, false);
  assert.equal(setCompanion(one.game, null).ok, false);

  const set = setCompanion(one.game, "c1");
  assert.equal(set.ok, true);
  assert.equal(set.game.companionSlot, "c1");
  assert.equal(setCompanion(set.game, "c1").ok, false, "すでに入っている");
  const cs = companionSpec(set.game, easy);
  const allies = allySpecs(set.game, easy);
  assert.ok(cs !== null);
  assert.equal(cs.key, "c1");
  assert.equal(cs.interval, 4);
  assert.equal(cs.atk, allies.reduce((a, s) => a + s.atk, 0) / allies.length, "団員の平均の攻撃をもとにする");
  assert.equal(cs.skill.power, 1);
  const def = easy.companionById["c1"] as CompanionDef;
  assert.equal(companionSkillPower(def, 3, easy.params), 2);
  assert.equal(companionSpec({ ...set.game, companions: { c1: { level: 3 } } }, easy)?.skill.power, 2);

  // 戦闘に出る。長引く戦闘なら、相棒の行動が記録される
  const slow = withParams((p) => {
    p.enemy.baseHp = 200;
    p.enemy.baseAtk = 0.5;
    p.enemy.stageGrowth = [1];
  });
  const c = challenge(set.game, one.nowMs, slow);
  assert.equal(c.ok, true);
  assert.equal(c.companion?.key, "c1");
  assert.ok(c.replay?.events.some((e) => e.side === 0 && e.actor === -1), "相棒の行動が、再生用のデータに入る");

  const off = setCompanion(set.game, null);
  assert.equal(off.ok, true);
  assert.equal(off.game.companionSlot, null);
});

test("相棒: レベル上げには、おひねりと専用の素材が要る", () => {
  const easy = easyContent();
  const p = easy.params;
  const one = withCompanion(easy).game;
  const base: GameData = { ...one, gold: 0, materials: { c1: 0 } };
  const info = companionLevelInfo(base, "c1", easy);
  assert.equal(info.mats, companionMatCost(1, p));
  assert.equal(info.gold, Math.round(companionCostMinutes(1, p) * idleGoldPerMin(base.highestCleared, p)), "おひねりは、その時点の放置報酬の何分ぶん");
  assert.equal(info.ok, false);
  assert.equal(companionLevelUp(base, "c1", easy).ok, false);
  assert.equal(companionLevelUp({ ...base, gold: info.gold }, "c1", easy).ok, false, "素材が足りない");
  assert.equal(companionLevelUp({ ...base, materials: { c1: info.mats } }, "c1", easy).ok, false, "おひねりが足りない");
  assert.equal(companionLevelUp(base, "nobody", easy).ok, false);

  const r = companionLevelUp({ ...base, gold: info.gold + 3, materials: { c1: info.mats + 1 } }, "c1", easy);
  assert.equal(r.ok, true);
  assert.equal(r.game.companions["c1"]?.level, 2);
  assert.equal(r.game.gold, 3);
  assert.equal(r.game.materials["c1"], 1);
  assert.equal(r.game.counters.companionLevelUps, 1);
  assert.ok(companionLevelInfo(r.game, "c1", easy).mats > info.mats, "レベルごとに、要る素材が増える");

  const capped: GameData = { ...base, gold: 1e9, materials: { c1: 1e6 }, companions: { c1: { level: p.companion.levelCap } } };
  assert.equal(companionLevelUp(capped, "c1", easy).ok, false, "上限を超えては上げられない");
});

test("相棒: 初クリア報酬の素材は、持っている相棒それぞれに入る", () => {
  const easy = easyContent();
  const one = withCompanion(easy);
  const before = one.game.materials["c1"] ?? 0;
  const f = fight(one.game, one.nowMs, easy);
  const win = f.events.find((e) => e.type === "win");
  assert.ok(win && win.type === "win" && win.reward.mats === easy.params.economy.firstClearMats);
  assert.equal(f.game.materials["c1"], before + 2);
});

// ---------------------------------------------------------------- ミッションと日課

test("ミッション: 定義の順に並び、達成したら報酬を受け取れる（一度きり）", () => {
  const g0 = createGame(T0, 1, C);
  const list0 = missionList(g0, C);
  assert.deepEqual(
    list0.map((m) => m.def.id),
    MISSIONS.map((m) => m.id),
  );
  assert.ok(list0.every((m) => !m.claimable && !m.claimed));
  assert.equal(claimMission(g0, "m-clear1", C).ok, false, "まだ達成していない");
  assert.equal(claimMission(g0, "nothing", C).ok, false);

  const g1 = fight(g0, T0, C).game;
  const view = missionList(g1, C).find((m) => m.def.id === "m-clear1");
  assert.ok(view && view.claimable && view.progress === 1);
  const r = claimMission(g1, "m-clear1", C);
  assert.equal(r.ok, true);
  assert.deepEqual(r.reward, { gold: 0, tickets: 1, mats: 0 });
  assert.equal(r.game.tickets, g1.tickets + 1);
  assert.deepEqual(r.game.missionsClaimed, ["m-clear1"]);
  assert.equal(claimMission(r.game, "m-clear1", C).ok, false, "二度は受け取れない");
  const after = missionList(r.game, C).find((m) => m.def.id === "m-clear1");
  assert.ok(after && after.claimed && !after.claimable);
});

test("ミッション: 種類ごとに、進み具合が数えられる", () => {
  const easy = easyContent();
  const progress = (g: GameData, id: string): number => missionList(g, easy).find((m) => m.def.id === id)?.progress ?? -1;
  let g: GameData = { ...createGame(T0, 1, easy), gold: 1_000_000, tickets: 1 };
  assert.equal(progress(g, "m-levels"), 0);
  g = levelUpMax(g, "atk", easy).game;
  assert.equal(progress(g, "m-levels"), 2, "目標の数で頭打ち");
  assert.equal(progress(g, "m-level3"), 3);
  g = recruit(g, easy).game;
  assert.equal(progress(g, "m-recruit"), 1);
  assert.equal(progress(g, "m-party"), 2);
  g = setPartySlot(g, 2, "heal").game;
  assert.equal(progress(g, "m-party"), 3);
  g = promote({ ...g, members: { ...g.members, heal: { level: 1, star: 0, shards: 1 } } }, "heal", easy).game;
  assert.equal(progress(g, "m-promote"), 1);
  g = collectIdle(g, T0 + MIN, easy).game;
  assert.equal(progress(g, "m-idle"), 1);
  assert.equal(progress(g, "m-comp"), 0);
  const c = clearTo(g, T0 + MIN, 4, easy);
  g = c.game;
  assert.equal(progress(g, "m-comp"), 1);
  assert.equal(progress(g, "m-equip"), 0);
  g = setCompanion(g, "c1").game;
  assert.equal(progress(g, "m-equip"), 1);
  g = companionLevelUp({ ...g, materials: { c1: 100 } }, "c1", easy).game;
  assert.equal(progress(g, "m-clv"), 1);
});

test("ミッション: 「何分ぶん」のおひねりは、受け取る時点の速さで決まる。素材は相棒それぞれに入る", () => {
  const easy = easyContent();
  const p = easy.params;
  let g: GameData = { ...createGame(T0, 1, easy), gold: 1_000_000 };
  g = levelUpMax(g, "atk", easy).game;
  const early = missionList(g, easy).find((m) => m.def.id === "m-levels");
  assert.equal(early?.reward.gold, Math.round(2 * idleGoldPerMin(1, p)), "1面も突破していないうちは、1面のぶん");

  const c = clearTo(g, T0, 8, easy);
  const late = missionList(c.game, easy).find((m) => m.def.id === "m-levels");
  assert.equal(late?.reward.gold, Math.round(2 * idleGoldPerMin(8, p)));
  const r = claimMission(c.game, "m-levels", easy);
  assert.equal(r.game.gold, c.game.gold + Math.round(2 * idleGoldPerMin(8, p)));

  const mats = claimMission(c.game, "m-comp", easy);
  assert.equal(mats.ok, true);
  assert.equal(mats.game.materials["c1"], (c.game.materials["c1"] ?? 0) + 3);
  assert.equal(mats.game.materials["c2"], (c.game.materials["c2"] ?? 0) + 3);
});

test("日課: その日のうちの回数で達成する。「日課を○つ達成」は、ほかの日課の受け取りを数える", () => {
  let g = advance(createGame(T0, 1, C), T0, 5, C).game;
  assert.equal(g.daily.dayKey, 5);
  assert.deepEqual(
    dailyList(g, C).map((d) => [d.def.id, d.progress, d.claimable]),
    [
      ["d-idle", 0, false],
      ["d-challenge", 0, false],
      ["d-all", 0, false],
    ],
  );
  assert.equal(claimDaily(g, "d-idle", C).ok, false);

  g = collectIdle(g, T0 + MIN, C).game;
  const f1 = fight(g, T0 + MIN, C, 5);
  const f2 = fight(f1.game, f1.atMs + 1000, C, 5);
  g = f2.game;
  assert.ok(dailyList(g, C).filter((d) => d.def.id !== "d-all").every((d) => d.claimable));

  const a = claimDaily(g, "d-idle", C);
  assert.equal(a.ok, true);
  assert.equal(a.reward?.gold, Math.round(idleGoldPerMin(g.highestCleared, P)));
  assert.equal(claimDaily(a.game, "d-idle", C).ok, false, "同じ日に二度は受け取れない");
  assert.equal(dailyList(a.game, C).find((d) => d.def.id === "d-all")?.progress, 1);
  const b = claimDaily(a.game, "d-challenge", C);
  assert.equal(b.game.gold, a.game.gold + 5);
  const all = claimDaily(b.game, "d-all", C);
  assert.equal(all.ok, true);
  assert.equal(all.game.tickets, b.game.tickets + 1);
  assert.equal(all.game.daily.claims, 2, "「日課を○つ達成」自身は、数に入れない");
});

test("日課: 日付が変わると入れ替わる。ミッションは入れ替わらない。時計が戻ったときは入れ替えない", () => {
  let g = advance(createGame(T0, 1, C), T0, 5, C).game;
  g = collectIdle(g, T0 + MIN, C).game;
  g = fight(g, T0 + MIN, C, 5).game;
  g = claimMission(g, "m-clear1", C).game;
  g = claimDaily(g, "d-idle", C).game;
  assert.deepEqual(g.daily.claimed, ["d-idle"]);

  const same = advance(g, T0 + 2 * HOUR, 5, C);
  assert.equal(same.events.some((e) => e.type === "dailyReset"), false);
  assert.deepEqual(same.game.daily.claimed, ["d-idle"]);

  const next = advance(g, T0 + 20 * HOUR, 6, C);
  assert.ok(next.events.some((e) => e.type === "dailyReset"));
  assert.equal(next.game.daily.dayKey, 6);
  assert.ok(dailyList(next.game, C).every((d) => d.progress === 0 && !d.claimed));
  assert.deepEqual(next.game.missionsClaimed, ["m-clear1"]);
  assert.equal(next.game.counters.idleClaims, 1, "通算の回数は残る");

  const back = advance(g, T0 - 48 * HOUR, 9, C);
  assert.ok(back.events.some((e) => e.type === "clockBack"));
  assert.equal(back.game.daily.dayKey, 5, "時計が戻っているあいだは、入れ替えない");
  assert.deepEqual(back.game.daily.claimed, ["d-idle"]);
});

test("日課: 初めて日付が決まるときは、入れ替えの知らせを出さない", () => {
  const r = advance(createGame(T0, 1, C), T0, 123, C);
  assert.equal(r.game.daily.dayKey, 123);
  assert.equal(r.events.length, 0);
});

// ---------------------------------------------------------------- セーブ

test("セーブ: ゲームの状態ごと（戦闘の途中でも）、書き出して読み込める", () => {
  const easy = easyContent();
  const r = withCompanion(easy);
  const game = challenge(setCompanion(r.game, "c1").game, r.nowMs, easy).game;
  assert.ok(game.battle !== null);
  const state = { ...createInitialState(T0, 5), game };
  const loaded = deserialize(serialize(state, r.nowMs));
  assert.equal(loaded.kind, "ok");
  if (loaded.kind === "ok") {
    assert.deepEqual(loaded.state, state);
    assert.equal(loaded.gameReset, false);
  }
});

test("セーブ: S0 のころのセーブ（ゲームの状態なし）も読み込める", () => {
  // 2026-10-10 に、ユーザーの iPhone から届いたログにあったセーブそのもの
  const s0 =
    '{"format":"idle-game-save","version":1,"savedAtMs":1791631349314,"state":{"version":1,"createdAtMs":1791631062928,"lastSeenAtMs":1791631283208,"opens":6,"taps":10,"rngState":2920891509}}';
  const loaded = deserialize(s0);
  assert.equal(loaded.kind, "ok");
  if (loaded.kind === "ok") {
    assert.equal(loaded.state.opens, 6);
    assert.equal(loaded.state.taps, 10);
    assert.equal(loaded.state.game, undefined, "ゲームの状態はまだない（画面側が新しく作る）");
    assert.equal(loaded.gameReset, false);
  }
});

test("セーブ: 第1版（build-4 まで）のゲームは引き継がず、最初からになる。起動の記録は残る", () => {
  // 2026-10-11 に、ユーザーの iPhone から届いた build-4 のログにあったセーブそのもの（tests/fixtures/save-build-4.json）
  const v1 = readFileSync("tests/fixtures/save-build-4.json", "utf8");
  const loaded = deserialize(v1);
  assert.equal(loaded.kind, "ok");
  if (loaded.kind === "ok") {
    assert.equal(loaded.gameReset, true, "呼び出し側が、元のセーブを退避して知らせるための印");
    assert.equal(loaded.state.game, undefined);
    assert.equal(loaded.state.opens, 13);
    assert.equal(loaded.state.taps, 138);
  }
});

test("セーブ: ゲームの状態が壊れていたら corrupt、新しすぎる版なら too_new", () => {
  const base = createInitialState(T0, 5);
  const wrap = (game: unknown): string => JSON.stringify({ format: SAVE_FORMAT, version: 1, savedAtMs: T0, state: { ...base, game } });
  const good = createGame(T0, 5, C);
  assert.equal(deserialize(wrap(good)).kind, "ok");
  assert.equal(deserialize(wrap({ ...good, gold: "たくさん" })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, party: ["nobody", null, null, null] })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, party: [null, null, null, null] })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, members: {} })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, companionSlot: "nobody" })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, idle: { ...good.idle, gold: null } })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, daily: { ...good.daily, claimed: [1] } })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, counters: {} })).kind, "corrupt");
  assert.equal(deserialize(wrap({ ...good, v: GAME_VERSION + 1 })).kind, "too_new");
  assert.equal(deserialize(wrap("こわれた")).kind, "corrupt");
  assert.equal(isGameData(good), true);
});

// ---------------------------------------------------------------- あとから足す、外す

test("団員・相棒・ミッションを足しても、それまでのセーブがそのまま動く", () => {
  const easy = easyContent();
  const r = withCompanion(easy);
  const more = buildContent({
    params: easy.params,
    members: [...M, { id: "new", name: "新入り", role: "attacker", rarity: "N", hp: 1, atk: 1, interval: 1.5, skill: { type: "strike", power: 2 } }],
    companions: [...COMPANIONS, { id: "c9", name: "あとから来た相棒", chapter: 9, skill: { type: "strike", power: 2 }, interval: 6, passiveHp: 0.01, passiveAtk: 0.01, material: "素材9" }],
    missions: [...MISSIONS, { id: "m-new", text: "5面を突破する", kind: "clear", target: 5, reward: { tickets: 1 } }],
    dailies: DAILIES,
  });
  assert.equal(isGameData(r.game), true);
  const g = sanitizeGame(r.game, more);
  assert.deepEqual(g, r.game, "足しただけなら、セーブは変わらない");
  const f = fight(g, r.nowMs, more);
  assert.equal(f.game.highestCleared, 5);
  assert.ok(recruitRates(more).some((x) => x.id === "new"), "足した団員が勧誘に出るようになる");
  assert.ok(missionList(f.game, more).find((m) => m.def.id === "m-new")?.claimable);
});

test("団員や相棒を定義から外しても、セーブを整えれば動く", () => {
  const easy = easyContent();
  const r = withCompanion(easy);
  let g: GameData = { ...setCompanion(r.game, "c1").game, tickets: 1 };
  g = setPartySlot(recruit(g, easy).game, 2, "heal").game;
  const fewer = buildContent({
    ...DATA,
    params: { ...easy.params, recruit: { ...easy.params.recruit, firstId: "aoe" } },
    members: M.filter((m) => m.id !== "heal"),
    companions: COMPANIONS.filter((c) => c.id !== "c1"),
  });
  const fixed = sanitizeGame(g, fewer);
  assert.equal(fixed.members["heal"], undefined);
  assert.equal(fixed.party.includes("heal"), false);
  assert.ok(fixed.party.some((x) => x !== null));
  assert.deepEqual(fixed.companions, {});
  assert.equal(fixed.companionSlot, null);
  assert.equal(fixed.materials["c1"], undefined);
  assert.equal(isGameData(fixed), true);
  assert.equal(challenge(fixed, r.nowMs, fewer).ok, true);
});

test("定義の誤り: IDの重複や、いない団員の指定は、読み込みの時点で止める", () => {
  assert.throws(() => buildContent({ ...DATA, members: [...M, M[0] as MemberDef] }), /重複/);
  assert.throws(() => buildContent({ ...DATA, companions: [...COMPANIONS, { ...(COMPANIONS[0] as CompanionDef), id: "atk" }] }), /重複/);
  assert.throws(() => buildContent({ ...DATA, missions: [...MISSIONS, MISSIONS[0] as MissionDef] }), /重複/);
  assert.throws(() => buildContent({ ...DATA, params: { ...P, recruit: { ...P.recruit, firstId: "nobody" } } }), /最初の勧誘/);
  assert.throws(() => buildContent({ ...DATA, members: M.map((m) => ({ ...m, starter: false })) }), /最初から/);
});

// ---------------------------------------------------------------- 本番のデータと模擬プレイ

test("本番のデータ: 契約どおりの構成になっている", () => {
  const ctx = loadContent(".");
  const p = ctx.params;
  assert.equal(p.progress.chapters, 4);
  assert.equal(p.progress.stagesPerChapter, 10);
  assert.equal(totalStages(p), 40);
  assert.equal(stageLabel(11, p), "2-1");
  assert.equal(p.battle.timeLimitSec, 60);
  assert.equal(p.economy.idleCapHours, 8);
  assert.equal(ctx.members.length, 7, "団員は人間の7人");
  assert.equal(ctx.members.filter((m) => m.starter).length, 3, "最初の団員は3人");
  assert.equal(ctx.byId[p.recruit.firstId]?.role, "healer", "最初の勧誘は回復役");
  assert.equal(new Set(ctx.members.map((m) => m.rarity)).size, 1, "最初の7人は、同じレア度");
  assert.equal(ctx.companions.length, 4);
  for (let ch = 1; ch <= 4; ch++) {
    assert.equal(ctx.companions.filter((c) => c.chapter === ch).length, 1, `第${ch}章のボス（相棒）が1体いる`);
  }
  assert.ok(ctx.companions.every((c) => c.passiveHp + c.passiveAtk > 0 && c.material !== ""), "どの相棒も、底上げと専用の素材を持つ");
  assert.ok(ctx.members.some((m) => m.trait === "taunt") && ctx.members.some((m) => m.trait === "backline"), "挑発と後列ねらいの団員がいる");
  const g = createGame(T0, 1, ctx);
  assert.deepEqual(
    g.party.map((id) => (id === null ? null : ctx.byId[id]?.role)),
    ["tank", "attacker", "attacker", null],
    "盾役1、攻撃役2で始まり、4つ目の枠が空いている",
  );
});

test("本番のデータ: ミッションと日課は、達成できる内容になっている", () => {
  const ctx = loadContent(".");
  const p = ctx.params;
  const first = ctx.missions[0];
  assert.ok(first && first.kind === "clear" && first.target === 1 && (first.reward.tickets ?? 0) >= 1, "最初のミッションは「1-1 を突破」で、勧誘チケットがもらえる");
  const topLevel = levelCap(p.member.shardsToPromote.length, p);
  for (const m of ctx.missions) {
    assert.ok(m.target >= 1 && m.text !== "", m.id);
    if (m.kind === "clear") assert.ok(m.target <= totalStages(p), m.id);
    if (m.kind === "companions") assert.ok(m.target <= ctx.companions.length, m.id);
    if (m.kind === "memberLevel") assert.ok(m.target <= topLevel, m.id);
    if (m.kind === "partySize") assert.ok(m.target <= PARTY_SIZE, m.id);
    if (m.kind === "companionEquipped") assert.equal(m.target, 1, m.id);
    assert.ok((m.reward.gold ?? 0) + (m.reward.goldMin ?? 0) + (m.reward.tickets ?? 0) + (m.reward.mats ?? 0) > 0, `${m.id} に報酬がある`);
  }
  assert.ok(ctx.dailies.length >= 3, "日課は3つ以上");
  const others = ctx.dailies.filter((d) => d.kind !== "dailyClaims").length;
  for (const d of ctx.dailies) {
    if (d.kind === "dailyClaims") assert.ok(d.target <= others, `${d.id} は、ほかの日課の数までで達成できる`);
  }
});

test("模擬プレイ: 同じ種と遊び方なら、同じ結果になる", () => {
  const ctx = loadContent(".");
  const a = simulate({ policy: "normal", seed: 3, durationSec: 300, content: ctx });
  const b = simulate({ policy: "normal", seed: 3, durationSec: 300, content: ctx });
  assert.deepEqual(a, b);
  assert.ok(a.battles > 0);
  assert.ok(a.stageReached >= 2, "5分で1面も進まないのはおかしい");
});

test("模擬プレイ: 離れて戻ってきたあとの進み具合も、数えられる", () => {
  const ctx = loadContent(".");
  const r = simulate({ policy: "lazy", seed: 5, durationSec: 240, content: ctx, away: { awaySec: 8 * 3600, afterSec: 300 } });
  assert.ok(r.stagesGainedAfterAway !== null && r.stagesGainedAfterAway >= 0);
  assert.equal(simulate({ policy: "lazy", seed: 5, durationSec: 240, content: ctx }).stagesGainedAfterAway, null);
});
