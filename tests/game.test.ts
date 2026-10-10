// ゲーム本体（戦闘、進行、団員、育成、放置報酬、セーブ）の単体テスト。
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。
//
// ルールの検査は、テスト専用の小さな数値（P）で行う。本番の数値（params/）を調整しても、ここは壊れない。
// 本番の数値そのものの妥当性は、模擬プレイ（scripts/check/acceptance.ts）が検査する。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createRng } from "../src/core/rng.ts";
import { runBattle } from "../src/core/battle.ts";
import type { FighterSpec } from "../src/core/battle.ts";
import { buildContent, goldPerWin, levelCost, memberStats, offlineGoldPerMin, stageLabel, totalStages } from "../src/core/params.ts";
import type { Content, MemberDef, Params } from "../src/core/params.ts";
import {
  GAME_VERSION,
  PARTY_SIZE,
  advance,
  allySpecs,
  claimIdle,
  createGame,
  currentStage,
  isGameData,
  levelUp,
  ownedCount,
  promote,
  recruit,
  recruitRates,
  retry,
  sanitizeGame,
  setPartySlot,
  winChance,
} from "../src/core/game.ts";
import type { GameData, GameEvent } from "../src/core/game.ts";
import { createInitialState } from "../src/core/state.ts";
import { SAVE_FORMAT, deserialize, serialize } from "../src/core/save.ts";
import { simulate } from "../src/sim/run.ts";

const T0 = 1_760_000_000_000;
const HOUR = 3_600_000;

const P: Params = {
  battle: { timeLimitSec: 60, gaugeMax: 100, gaugePerAttack: 34, damageVariance: 0.1, interBattleSec: 2, stageIntroSec: 3, rallySec: 8 },
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
    joinAtPartyMinLevel: true,
  },
  enemy: { baseHp: 40, baseAtk: 3, stageGrowth: 1.1, chapterHpMult: [], chapterAtkMult: [], count: 3, intervalSec: 1.6, bossHpMult: 3, bossAtkMult: 1.5, bossIntervalSec: 2, bossSkillPower: 0.9 },
  economy: { goldPerWinBase: 10, goldGrowth: 1.1, bossGoldMult: 3, offlineWinsPerMin: 2, idleCapHours: 8, ticketEveryStages: 2, monsterShardOffset: 1 },
  progress: { chapters: 2, stagesPerChapter: 4, onlineGapSec: 30 },
  recruit: { firstId: "heal" },
};

const M: MemberDef[] = [
  { id: "atk", name: "攻撃役", kind: "human", role: "attacker", hp: 1.0, atk: 1.2, interval: 1.5, skill: { type: "strike", power: 3 }, starter: true },
  { id: "tank", name: "盾役", kind: "human", role: "tank", hp: 1.7, atk: 0.7, interval: 1.8, skill: { type: "selfheal", power: 0.25 }, starter: true },
  { id: "heal", name: "回復役", kind: "human", role: "healer", hp: 0.9, atk: 0.7, interval: 1.7, skill: { type: "heal", power: 4 } },
  { id: "aoe", name: "全体攻撃役", kind: "human", role: "attacker", hp: 0.9, atk: 1.0, interval: 1.4, skill: { type: "aoe", power: 1 } },
  { id: "boss1", name: "魔物1", kind: "monster", role: "tank", hp: 2, atk: 0.9, interval: 1.8, skill: { type: "selfheal", power: 0.3 }, joinChapter: 1 },
  { id: "boss2", name: "魔物2", kind: "monster", role: "support", hp: 1.2, atk: 0.9, interval: 1.6, skill: { type: "rally", power: 0.3 }, joinChapter: 2 },
];

const C: Content = buildContent(P, M);

function withParams(patch: (p: Params) => void): Content {
  const p = JSON.parse(JSON.stringify(P)) as Params;
  patch(p);
  return buildContent(p, M);
}

/** 1秒ごとに advance を呼んで、指定の時刻まで進める。 */
function play(game: GameData, fromMs: number, toMs: number, ctx: Content): { game: GameData; events: GameEvent[] } {
  let g = game;
  const events: GameEvent[] = [];
  for (let t = fromMs; t <= toMs; t += 1000) {
    const r = advance(g, t, ctx);
    g = r.game;
    events.push(...r.events);
  }
  return { game: g, events };
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

// ---------------------------------------------------------------- 開始と進行

test("開始: 最初の団員が編成に入り、盾役が前列の先頭になる", () => {
  const g = createGame(T0, 1, C);
  assert.equal(g.v, GAME_VERSION);
  assert.equal(ownedCount(g), 2);
  assert.equal(g.party.length, PARTY_SIZE);
  assert.equal(g.party[0], "tank");
  assert.equal(g.party[1], "atk");
  assert.equal(g.party[2], null);
  assert.equal(currentStage(g, C), 1);
  assert.equal(allySpecs(g, C).length, 2);
});

test("進行: 戦闘が終わると、おひねりを得て次の面へ進む", () => {
  const g0 = createGame(T0, 1, C);
  const first = advance(g0, T0, C, true);
  const start = first.events.find((e) => e.type === "battleStart");
  assert.ok(start && start.type === "battleStart" && start.replay !== null && start.replay.events.length > 0, "再生用のデータが返る");
  assert.equal(g0.battle, null, "元の状態は書き換えない");

  const r = play(first.game, T0, T0 + 60_000, C);
  const win = r.events.find((e) => e.type === "win");
  assert.ok(win && win.type === "win" && win.stage === 1 && win.firstClear);
  assert.ok(r.game.gold >= goldPerWin(1, P));
  assert.ok(r.game.highestCleared >= 1);
  assert.equal(r.game.challenging, true);
});

test("進行: 同じ種なら、同じ結果になる。種が違えば、戦闘の中身が変わる", () => {
  const a = play(createGame(T0, 42, C), T0, T0 + 120_000, C).game;
  const b = play(createGame(T0, 42, C), T0, T0 + 120_000, C).game;
  assert.deepEqual(a, b);
  const c = play(createGame(T0, 43, C), T0, T0 + 120_000, C).game;
  assert.notEqual(a.rngState, c.rngState);
});

test("進行: 何秒おきに呼んでも、結果は変わらない", () => {
  const everySecond = play(createGame(T0, 9, C), T0, T0 + 90_000, C).game;
  let g = createGame(T0, 9, C);
  for (let t = T0; t <= T0 + 90_000; t += 15_000) g = advance(g, t, C).game;
  assert.equal(g.highestCleared, everySecond.highestCleared);
  assert.equal(g.gold, everySecond.gold);
  assert.equal(g.stats.battles, everySecond.stats.battles);
});

test("進行: 挑戦に負けると止まり、手前の面で稼ぎ続ける。再挑戦で、また挑む", () => {
  // 2面以降を極端に強くして、必ず負けるようにする
  const hard = withParams((p) => {
    p.enemy.stageGrowth = 500;
  });
  const r = play(createGame(T0, 1, hard), T0, T0 + 240_000, hard);
  const defeat = r.events.find((e) => e.type === "defeat");
  assert.ok(defeat && defeat.type === "defeat" && defeat.stage === 2);
  assert.equal(r.game.highestCleared, 1);
  assert.equal(r.game.challenging, false);
  assert.equal(currentStage(r.game, hard), 1, "手前の面で稼ぐ");
  assert.ok(r.game.stats.firstDefeatAtMs !== null);
  const farmWins = r.events.filter((e) => e.type === "win" && !e.firstClear).length;
  assert.ok(farmWins >= 2, "負けたあとも稼ぎが続く");
  assert.equal(r.events.filter((e) => e.type === "defeat").length, 1, "勝手には再挑戦しない");

  const again = retry(r.game, hard);
  assert.equal(again.ok, true);
  assert.equal(again.game.challenging, true);
  assert.equal(currentStage(again.game, hard), 2);
  assert.equal(retry(again.game, hard).ok, false, "挑戦中は再挑戦できない");
  const after = advance(again.game, T0 + 241_000, hard);
  const started = after.events.find((e) => e.type === "battleStart");
  assert.ok(started && started.type === "battleStart" && started.stage === 2, "すぐに挑戦の戦闘が始まる");
});

test("進行: 新しい面に進むときだけ、面の紹介のぶん次の戦闘が遅れる", () => {
  // 新しい面に進むとき: 間隔 = 戦闘のあいだ + 面の紹介
  const starts = play(createGame(T0, 1, C), T0, T0 + 60_000, C).events.filter((e) => e.type === "battleStart");
  const first = starts[0];
  const second = starts[1];
  assert.ok(first && first.type === "battleStart" && second && second.type === "battleStart");
  assert.equal(second.stage, 2);
  assert.equal(second.atMs - first.endsAtMs, (P.battle.interBattleSec + P.battle.stageIntroSec) * 1000);

  // 同じ面のくり返し（稼ぎ）: 間隔 = 戦闘のあいだ だけ
  const hard = withParams((p) => {
    p.enemy.stageGrowth = 500;
  });
  const farm = play(createGame(T0, 1, hard), T0, T0 + 240_000, hard).events.filter((e) => e.type === "battleStart" && e.stage === 1);
  const a = farm[farm.length - 2];
  const b = farm[farm.length - 1];
  assert.ok(a && a.type === "battleStart" && b && b.type === "battleStart");
  assert.equal(b.atMs - a.endsAtMs, P.battle.interBattleSec * 1000);
});

test("進行: 最後の面まで突破したら、そこで稼ぎ続ける", () => {
  const easy = withParams((p) => {
    p.enemy.baseHp = 1;
    p.enemy.baseAtk = 0.01;
    p.enemy.stageGrowth = 1;
  });
  const r = play(createGame(T0, 1, easy), T0, T0 + 200_000, easy);
  assert.equal(r.game.highestCleared, totalStages(easy.params));
  assert.ok(r.events.some((e) => e.type === "allClear"));
  assert.equal(currentStage(r.game, easy), totalStages(easy.params));
  assert.equal(retry(r.game, easy).ok, false);
});

// ---------------------------------------------------------------- 団員

function easyContent(): Content {
  return withParams((p) => {
    p.enemy.baseHp = 5;
    p.enemy.baseAtk = 0.5;
    p.enemy.stageGrowth = 1.01;
  });
}

test("団員: チケットは決まった面を初めて突破したときに届く", () => {
  const easy = easyContent();
  const r = play(createGame(T0, 1, easy), T0, T0 + 200_000, easy);
  const tickets = r.events.filter((e) => e.type === "ticket");
  assert.deepEqual(
    tickets.map((e) => (e.type === "ticket" ? e.stage : 0)),
    [2, 4, 6, 8],
  );
  assert.equal(r.game.tickets, 4);
});

test("団員: 最初の勧誘では、決まった団員が必ず出る", () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const g = { ...createGame(T0, seed, C), tickets: 1 };
    const r = recruit(g, C);
    assert.equal(r.ok, true);
    assert.equal(r.id, "heal");
    assert.equal(r.duplicate, false);
    assert.equal(r.game.tickets, 0);
    assert.ok(r.game.members["heal"]);
  }
});

test("団員: チケットがなければ勧誘できない。魔物は勧誘では出ない。重なるとかけらになる", () => {
  assert.equal(recruit(createGame(T0, 1, C), C).ok, false);
  let g: GameData = { ...createGame(T0, 11, C), tickets: 60 };
  const seen = new Set<string>();
  let duplicates = 0;
  for (let i = 0; i < 60; i++) {
    const r = recruit(g, C);
    assert.equal(r.ok, true);
    g = r.game;
    seen.add(r.id as string);
    if (r.duplicate) duplicates += 1;
  }
  assert.deepEqual([...seen].sort(), ["aoe", "atk", "heal", "tank"]);
  assert.ok(duplicates > 40);
  const shards = Object.values(g.members).reduce((a, m) => a + m.shards, 0);
  assert.equal(shards, duplicates, "重なった回数だけ、かけらが増える");
  assert.equal(ownedCount(g), 4);
});

test("団員: 提供割合の合計は1で、魔物は含まれない", () => {
  const rates = recruitRates(C);
  assert.ok(Math.abs(rates.reduce((a, r) => a + r.rate, 0) - 1) < 1e-9);
  assert.ok(rates.every((r) => C.byId[r.id]?.kind === "human"));
});

test("団員: ボスを初めて倒すと、その魔物が入団する。レベルは編成でいちばん低い団員に合わせる", () => {
  const easy = easyContent();
  let g = createGame(T0, 1, easy);
  g = { ...g, members: { tank: { level: 4, star: 0, shards: 0 }, atk: { level: 3, star: 0, shards: 0 } } };
  const r = play(g, T0, T0 + 200_000, easy);
  const joins = r.events.filter((e) => e.type === "join");
  assert.equal(joins.length, 2, "章ごとに1体、合わせて2体");
  const first = joins[0];
  assert.ok(first && first.type === "join" && first.id === "boss1" && first.level === 3);
  assert.ok(r.game.members["boss1"] && r.game.members["boss2"]);
  assert.ok(r.game.stats.firstJoinAtMs !== null);
  const shard = r.events.find((e) => e.type === "shard");
  assert.ok(shard && shard.type === "shard" && shard.id === "boss1", "面の節目で、入団した魔物のかけらが届く");
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

test("育成: かけらで昇格すると、上限が伸びて能力が上がる", () => {
  let g: GameData = { ...createGame(T0, 1, C), gold: 1_000_000 };
  assert.equal(promote(g, "atk", C).ok, false, "かけらがなければ昇格できない");
  g = { ...g, members: { ...g.members, atk: { level: 5, star: 0, shards: 3 } } };
  const r = promote(g, "atk", C);
  assert.equal(r.ok, true);
  assert.equal(r.game.members["atk"]?.star, 1);
  assert.equal(r.game.members["atk"]?.shards, 2);
  assert.equal(levelUp(r.game, "atk", C).ok, true, "上限が伸びたので、また上げられる");
  const def = C.byId["atk"] as MemberDef;
  assert.ok(memberStats(def, 5, 1, P).hp > memberStats(def, 5, 0, P).hp);
});

// ---------------------------------------------------------------- 放置報酬と時刻

test("放置報酬: 画面を閉じていた時間のぶんが積まれ、受け取るとおひねりになる", () => {
  const base = play(createGame(T0, 1, C), T0, T0 + 60_000, C).game;
  const away = 2 * HOUR;
  const r = advance(base, T0 + 60_000 + away, C);
  const off = r.events.find((e) => e.type === "offline");
  assert.ok(off && off.type === "offline");
  const expected = Math.floor((offlineGoldPerMin(base.highestCleared, P) * away) / 60_000);
  assert.equal(off.gold, expected);
  assert.equal(off.capped, false);
  assert.equal(r.game.idleGold, expected);
  assert.equal(r.game.gold, base.gold, "受け取るまでは増えない");
  const claimed = claimIdle(r.game);
  assert.equal(claimed.ok, true);
  assert.equal(claimed.game.gold, base.gold + expected);
  assert.equal(claimed.game.idleGold, 0);
  assert.equal(claimIdle(claimed.game).ok, false);
});

test("放置報酬: 上限（8時間）で頭打ちになる", () => {
  const base = play(createGame(T0, 1, C), T0, T0 + 60_000, C).game;
  const at8 = advance(base, T0 + 60_000 + 8 * HOUR, C).game.idleGold;
  const at30 = advance(base, T0 + 60_000 + 30 * HOUR, C);
  assert.equal(at30.game.idleGold, at8);
  const off = at30.events.find((e) => e.type === "offline");
  assert.ok(off && off.type === "offline" && off.capped === true);
});

test("放置報酬: 短い中断（30秒以内）は、放置として扱わない", () => {
  const base = play(createGame(T0, 1, C), T0, T0 + 60_000, C).game;
  const r = advance(base, T0 + 60_000 + 20_000, C);
  assert.equal(r.events.some((e) => e.type === "offline"), false);
  assert.equal(r.game.idleGold, 0);
});

test("時刻: 端末の時計が戻っていたら、放置報酬は0で、戦闘をやり直す", () => {
  const base = play(createGame(T0, 1, C), T0, T0 + 60_000, C).game;
  const r = advance(base, T0 - 24 * HOUR, C);
  assert.ok(r.events.some((e) => e.type === "clockBack"));
  assert.equal(r.game.idleGold, 0);
  assert.equal(r.game.gold, base.gold);
  assert.ok(r.game.battle !== null && r.game.battle.startedAtMs === T0 - 24 * HOUR);
});

// ---------------------------------------------------------------- 勝てる見込み

test("勝てる見込み: 楽に勝てる面は1、勝てない面は0。状態は変えない", () => {
  const g = play(createGame(T0, 1, C), T0, T0 + 30_000, C).game;
  const before = JSON.stringify(g);
  const easy = easyContent();
  assert.equal(winChance(g, easy), 1);
  const hard = withParams((p) => {
    p.enemy.stageGrowth = 500;
  });
  assert.equal(winChance({ ...g, highestCleared: 1 }, hard), 0);
  assert.equal(JSON.stringify(g), before);
});

// ---------------------------------------------------------------- セーブ

test("セーブ: ゲームの状態ごと、書き出して読み込める", () => {
  const game = play(createGame(T0, 5, C), T0, T0 + 90_000, C).game;
  const state = { ...createInitialState(T0, 5), game };
  const loaded = deserialize(serialize(state, T0 + 90_000));
  assert.equal(loaded.kind, "ok");
  if (loaded.kind === "ok") assert.deepEqual(loaded.state, state);
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
  assert.equal(deserialize(wrap({ ...good, v: GAME_VERSION + 1 })).kind, "too_new");
  assert.equal(isGameData(good), true);
});

// ---------------------------------------------------------------- あとから団員を足す

test("団員を足しても、それまでのセーブがそのまま動く", () => {
  const game = play(createGame(T0, 5, C), T0, T0 + 90_000, C).game;
  const more = buildContent(P, [...M, { id: "new", name: "新入り", kind: "human", role: "attacker", hp: 1, atk: 1, interval: 1.5, skill: { type: "strike", power: 2 } }]);
  assert.equal(isGameData(game), true);
  const r = play(sanitizeGame(game, more), T0 + 91_000, T0 + 150_000, more);
  assert.ok(r.game.stats.battles > game.stats.battles);
  assert.ok(recruitRates(more).some((x) => x.id === "new"), "足した団員が勧誘に出るようになる");
});

test("団員を定義から外しても、セーブを整えれば動く", () => {
  let g: GameData = { ...createGame(T0, 5, C), tickets: 1 };
  g = setPartySlot(recruit(g, C).game, 2, "heal").game;
  const fewer = buildContent({ ...P, recruit: { firstId: "aoe" } }, M.filter((m) => m.id !== "heal"));
  const fixed = sanitizeGame(g, fewer);
  assert.equal(fixed.members["heal"], undefined);
  assert.equal(fixed.party.includes("heal"), false);
  assert.ok(fixed.party.some((x) => x !== null));
  assert.equal(isGameData(fixed), true);
});

// ---------------------------------------------------------------- 本番の数値と模擬プレイ

function realContent(): Content {
  const params = JSON.parse(readFileSync("params/base.json", "utf8")) as Params;
  const members = JSON.parse(readFileSync("params/members.json", "utf8")) as MemberDef[];
  return buildContent(params, members);
}

test("本番のデータ: 契約どおりの構成になっている", () => {
  const ctx = realContent();
  assert.equal(ctx.params.progress.chapters, 4);
  assert.equal(ctx.params.progress.stagesPerChapter, 10);
  assert.equal(totalStages(ctx.params), 40);
  assert.equal(stageLabel(11, ctx.params), "2-1");
  assert.equal(ctx.params.battle.timeLimitSec, 60);
  assert.equal(ctx.params.economy.idleCapHours, 8);
  assert.equal(ctx.members.filter((m) => m.starter).length, 3, "最初の団員は3人");
  assert.equal(ctx.byId[ctx.params.recruit.firstId]?.role, "healer", "最初の勧誘は回復役");
  for (let ch = 1; ch <= 4; ch++) {
    assert.equal(ctx.members.filter((m) => m.joinChapter === ch).length, 1, `第${ch}章のボスが1体いる`);
  }
  const g = createGame(T0, 1, ctx);
  assert.deepEqual(
    g.party.map((id) => (id === null ? null : ctx.byId[id]?.role)),
    ["tank", "attacker", "attacker", null],
    "盾役1、攻撃役2で始まり、4つ目の枠が空いている",
  );
});

test("模擬プレイ: 同じ種と遊び方なら、同じ結果になる", () => {
  const ctx = realContent();
  const a = simulate({ policy: "normal", seed: 3, durationSec: 300, content: ctx });
  const b = simulate({ policy: "normal", seed: 3, durationSec: 300, content: ctx });
  assert.deepEqual(a, b);
  assert.ok(a.battles > 0);
  assert.ok(a.stageReached >= 2, "5分で1面も進まないのはおかしい");
});
