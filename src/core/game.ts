// ゲーム本体の状態と、それを進める関数。
//
// 決まり（pipeline/rules/core.md）:
//   - 画面にも実際の時計にも触れない。時刻は nowMs で受け取る。
//   - 状態は書き換えず、新しい状態を返す。
//   - 画面も模擬プレイも、ここにある関数だけでゲームを進める（ルールを二重に書かない）。
//
// 流れ:
//   advance(nowMs) を呼ぶたびに、終わった戦闘を精算し、次の戦闘を始める。
//   勝てば次の面へ進み、負けたら進行を止めて、手前の面で稼ぎ続ける（再挑戦は retry）。
//   しばらく呼ばれなかった場合（画面を閉じていた場合）は、その時間を放置報酬として積む。

import { createRng } from "./rng.ts";
import { runBattle } from "./battle.ts";
import type { BattleResult, FighterSpec } from "./battle.ts";
import {
  chapterOf,
  goldPerWin,
  isBossStage,
  levelCap,
  levelCost,
  maxStar,
  memberPower,
  memberStats,
  offlineGoldPerMin,
  powInt,
  totalStages,
} from "./params.ts";
import type { Content, MemberDef, MemberRole } from "./params.ts";

export const GAME_VERSION = 1;
export const PARTY_SIZE = 4;

export interface OwnedMember {
  level: number;
  star: number;
  /** 昇格に使う「かけら」。 */
  shards: number;
}

export interface BattleSlot {
  stage: number;
  startedAtMs: number;
  endsAtMs: number;
  win: boolean;
  timedOut: boolean;
}

export interface GameStats {
  battles: number;
  wins: number;
  defeats: number;
  /** プレイヤーの操作の回数。 */
  actions: number;
  firstDefeatAtMs: number | null;
  firstJoinAtMs: number | null;
  /** 最後に新しい面を突破した時刻。 */
  lastProgressAtMs: number;
  /** 新しい面を突破できなかった時間の最長。 */
  longestStallMs: number;
}

export interface GameData {
  v: number;
  startedAtMs: number;
  /** 最後に advance が呼ばれた時刻。 */
  lastActiveMs: number;
  /** おひねり（お金）。 */
  gold: number;
  /** まだ受け取っていない放置報酬。 */
  idleGold: number;
  tickets: number;
  /** これまでに勧誘した回数。 */
  recruits: number;
  members: Record<string, OwnedMember>;
  /** 編成。0・1 が前列、2・3 が後列。 */
  party: (string | null)[];
  /** 突破した面の通し番号の最大（まだなければ 0）。 */
  highestCleared: number;
  /** 次の面に挑んでいるか。負けると false になり、手前の面で稼ぐ。 */
  challenging: boolean;
  /** 稼ぐ面。ふだんは突破した最後の面。そこで負けたら、勝てる面まで1つずつ下げる。 */
  farmStage: number;
  battle: BattleSlot | null;
  rngState: number;
  stats: GameStats;
}

export type GameEvent =
  | { type: "battleStart"; atMs: number; stage: number; endsAtMs: number; replay: BattleResult | null; allies: FighterSpec[]; enemies: FighterSpec[] }
  | { type: "win"; atMs: number; stage: number; gold: number; firstClear: boolean }
  | { type: "defeat"; atMs: number; stage: number; timedOut: boolean }
  | { type: "ticket"; atMs: number; stage: number }
  | { type: "join"; atMs: number; id: string; level: number }
  | { type: "shard"; atMs: number; id: string }
  | { type: "offline"; atMs: number; awayMs: number; gold: number; capped: boolean }
  | { type: "clockBack"; atMs: number }
  | { type: "allClear"; atMs: number };

export interface StepResult {
  game: GameData;
  events: GameEvent[];
}

export interface ActionResult {
  game: GameData;
  ok: boolean;
  /** できなかった理由（ok が false のとき）。 */
  reason?: string;
}

function clone(g: GameData): GameData {
  const members: Record<string, OwnedMember> = {};
  for (const id of Object.keys(g.members)) members[id] = { ...(g.members[id] as OwnedMember) };
  return { ...g, members, party: g.party.slice(), battle: g.battle ? { ...g.battle } : null, stats: { ...g.stats } };
}

const ROLE_ORDER: Record<MemberRole, number> = { tank: 0, attacker: 1, support: 2, healer: 3 };

export function createGame(nowMs: number, seed: number, ctx: Content): GameData {
  const starters = ctx.members.filter((m) => m.starter).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const members: Record<string, OwnedMember> = {};
  const party: (string | null)[] = [];
  for (const m of starters) {
    members[m.id] = { level: 1, star: 0, shards: 0 };
    if (party.length < PARTY_SIZE) party.push(m.id);
  }
  while (party.length < PARTY_SIZE) party.push(null);
  return {
    v: GAME_VERSION,
    startedAtMs: nowMs,
    lastActiveMs: nowMs,
    gold: 0,
    idleGold: 0,
    tickets: 0,
    recruits: 0,
    members,
    party,
    highestCleared: 0,
    challenging: true,
    farmStage: 0,
    battle: null,
    rngState: seed >>> 0,
    stats: {
      battles: 0,
      wins: 0,
      defeats: 0,
      actions: 0,
      firstDefeatAtMs: null,
      firstJoinAtMs: null,
      lastProgressAtMs: nowMs,
      longestStallMs: 0,
    },
  };
}

// ---------------------------------------------------------------- 参照

/** いま挑む（または稼ぐ）面。 */
export function currentStage(g: GameData, ctx: Content): number {
  const total = totalStages(ctx.params);
  if (g.highestCleared === 0) return 1;
  if (g.challenging && g.highestCleared < total) return g.highestCleared + 1;
  return Math.max(1, Math.min(g.farmStage > 0 ? g.farmStage : g.highestCleared, total));
}

export function allCleared(g: GameData, ctx: Content): boolean {
  return g.highestCleared >= totalStages(ctx.params);
}

export function enemySpecs(stage: number, ctx: Content): FighterSpec[] {
  const p = ctx.params;
  const grow = powInt(p.enemy.stageGrowth, stage - 1);
  const chapter = chapterOf(stage, p);
  const baseHp = p.enemy.baseHp * grow * (p.enemy.chapterHpMult[chapter - 1] ?? 1);
  const baseAtk = p.enemy.baseAtk * grow * (p.enemy.chapterAtkMult[chapter - 1] ?? 1);
  if (isBossStage(stage, p)) {
    const def = ctx.members.find((m) => m.joinChapter === chapter);
    return [
      {
        key: def ? def.id : `boss-${chapter}`,
        row: 0,
        hp: Math.round(baseHp * p.enemy.bossHpMult),
        atk: Math.round(baseAtk * p.enemy.bossAtkMult),
        interval: p.enemy.bossIntervalSec,
        skill: { type: "aoe", power: p.enemy.bossSkillPower },
      },
    ];
  }
  const specs: FighterSpec[] = [];
  const front = Math.ceil(p.enemy.count / 2);
  for (let i = 0; i < p.enemy.count; i++) {
    specs.push({
      key: `enemy-${((stage + i) % 6) + 1}`,
      row: i < front ? 0 : 1,
      hp: Math.round(baseHp),
      atk: Math.round(baseAtk),
      interval: p.enemy.intervalSec,
      skill: null,
    });
  }
  return specs;
}

export function allySpecs(g: GameData, ctx: Content): FighterSpec[] {
  const specs: FighterSpec[] = [];
  g.party.forEach((id, slot) => {
    if (id === null) return;
    const def = ctx.byId[id];
    const own = g.members[id];
    if (!def || !own) return;
    const s = memberStats(def, own.level, own.star, ctx.params);
    specs.push({ key: id, row: slot < PARTY_SIZE / 2 ? 0 : 1, hp: s.hp, atk: s.atk, interval: def.interval, skill: def.skill, trait: def.trait ?? null });
  });
  return specs;
}

/** 編成の強さの目安。 */
export function partyPower(g: GameData, ctx: Content): number {
  let sum = 0;
  for (const id of g.party) {
    if (id === null) continue;
    const def = ctx.byId[id];
    const own = g.members[id];
    if (def && own) sum += memberPower(def, own.level, own.star, ctx.params);
  }
  return sum;
}

/**
 * 次の面に、いまの編成で勝てる見込み（0〜1）。
 * 実際の戦闘と同じ計算を、乱数を変えて何回か試した勝率。状態は変えない。
 * 再挑戦のボタンに「見込み」として表示し、むだな再挑戦を減らす。
 */
export function winChance(g: GameData, ctx: Content, samples: number = 20): number {
  if (allCleared(g, ctx)) return 0;
  const stage = g.highestCleared + 1;
  const allies = allySpecs(g, ctx);
  const enemies = enemySpecs(stage, ctx);
  let wins = 0;
  for (let i = 0; i < samples; i++) {
    const rng = createRng((g.rngState + 0x9e3779b9 * (i + 1)) >>> 0);
    if (runBattle(allies, enemies, ctx.params.battle, rng, false).win) wins += 1;
  }
  return wins / samples;
}

export interface Goals {
  /** 次の勧誘チケットまで、あと何面突破すればよいか（もう届かないなら null）。 */
  ticketIn: number | null;
  /** 次のボスを倒すまで、あと何面か（すべて突破していれば null）。 */
  bossIn: number | null;
  /** 次のボスがいる面の通し番号。 */
  bossStage: number | null;
}

/** 次の目標（画面に「あと○面」と出す）。 */
export function nextGoals(g: GameData, ctx: Content): Goals {
  const p = ctx.params;
  const total = totalStages(p);
  if (g.highestCleared >= total) return { ticketIn: null, bossIn: null, bossStage: null };
  const next = g.highestCleared + 1;
  const every = p.economy.ticketEveryStages;
  const ticketStage = Math.ceil(next / every) * every;
  const bossStage = Math.ceil(next / p.progress.stagesPerChapter) * p.progress.stagesPerChapter;
  return {
    ticketIn: ticketStage <= total ? ticketStage - g.highestCleared : null,
    bossIn: bossStage - g.highestCleared,
    bossStage,
  };
}

export function ownedCount(g: GameData): number {
  return Object.keys(g.members).length;
}

/** 勧誘での提供割合（画面に表示する）。 */
export function recruitRates(ctx: Content): { id: string; rate: number }[] {
  const humans = ctx.members.filter((m) => m.kind === "human");
  const total = humans.reduce((a, m) => a + (m.weight ?? 1), 0);
  return humans.map((m) => ({ id: m.id, rate: (m.weight ?? 1) / total }));
}

export interface LevelUpInfo {
  ok: boolean;
  cost: number;
  reason?: string;
}

export function levelUpInfo(g: GameData, id: string, ctx: Content): LevelUpInfo {
  const own = g.members[id];
  if (!own) return { ok: false, cost: 0, reason: "その団員はいません" };
  const cost = levelCost(own.level, ctx.params);
  if (own.level >= levelCap(own.star, ctx.params)) return { ok: false, cost, reason: "レベルの上限です（昇格で伸びます）" };
  if (g.gold < cost) return { ok: false, cost, reason: "おひねりが足りません" };
  return { ok: true, cost };
}

export interface PromoteInfo {
  ok: boolean;
  need: number;
  reason?: string;
}

export function promoteInfo(g: GameData, id: string, ctx: Content): PromoteInfo {
  const own = g.members[id];
  if (!own) return { ok: false, need: 0, reason: "その団員はいません" };
  if (own.star >= maxStar(ctx.params)) return { ok: false, need: 0, reason: "これ以上は昇格できません" };
  const need = ctx.params.member.shardsToPromote[own.star] as number;
  if (own.shards < need) return { ok: false, need, reason: "かけらが足りません" };
  return { ok: true, need };
}

// ---------------------------------------------------------------- 進行

/** 新しく入った団員のレベル。育成はレベル1から始める。 */
const JOIN_LEVEL = 1;

function startBattle(g: GameData, atMs: number, ctx: Content, record: boolean, events: GameEvent[]): void {
  const stage = currentStage(g, ctx);
  const allies = allySpecs(g, ctx);
  const enemies = enemySpecs(stage, ctx);
  const rng = createRng(g.rngState);
  const result = runBattle(allies, enemies, ctx.params.battle, rng, record);
  g.rngState = rng.state();
  const endsAtMs = atMs + Math.max(1000, Math.round(result.durationSec * 1000));
  g.battle = { stage, startedAtMs: atMs, endsAtMs, win: result.win, timedOut: result.timedOut };
  g.stats.battles += 1;
  events.push({ type: "battleStart", atMs, stage, endsAtMs, replay: record ? result : null, allies: record ? allies : [], enemies: record ? enemies : [] });
}

/** 終わった戦闘を精算する。新しい面を突破したときに true を返す。 */
function resolveBattle(g: GameData, ctx: Content, events: GameEvent[]): boolean {
  const b = g.battle;
  if (!b) return false;
  const p = ctx.params;
  const atMs = b.endsAtMs;
  g.battle = null;

  if (!b.win) {
    g.stats.defeats += 1;
    if (g.stats.firstDefeatAtMs === null) g.stats.firstDefeatAtMs = atMs;
    if (b.stage > g.highestCleared) {
      // 挑戦に負けたら進行を止める。まだ1面も突破していないときは、挑み続けるしかない。
      if (g.highestCleared > 0) g.challenging = false;
    } else if (b.stage > 1) {
      // 稼ぎの面で負けた。勝てる面まで1つ下げる（稼ぎが止まらないように）。
      g.farmStage = b.stage - 1;
    }
    events.push({ type: "defeat", atMs, stage: b.stage, timedOut: b.timedOut });
    return false;
  }

  g.stats.wins += 1;
  const gold = goldPerWin(b.stage, p);
  g.gold += gold;
  const firstClear = b.stage > g.highestCleared;
  events.push({ type: "win", atMs, stage: b.stage, gold, firstClear });
  if (!firstClear) return false;

  g.highestCleared = b.stage;
  g.farmStage = b.stage;
  g.stats.longestStallMs = Math.max(g.stats.longestStallMs, atMs - g.stats.lastProgressAtMs);
  g.stats.lastProgressAtMs = atMs;

  if (b.stage % p.economy.ticketEveryStages === 0) {
    g.tickets += 1;
    events.push({ type: "ticket", atMs, stage: b.stage });
  }
  if (isBossStage(b.stage, p)) {
    const def = ctx.members.find((m) => m.joinChapter === chapterOf(b.stage, p));
    if (def && !g.members[def.id]) {
      const level = JOIN_LEVEL;
      g.members[def.id] = { level, star: 0, shards: 0 };
      if (g.stats.firstJoinAtMs === null) g.stats.firstJoinAtMs = atMs;
      events.push({ type: "join", atMs, id: def.id, level });
    }
  }
  if (b.stage % p.progress.stagesPerChapter === p.economy.monsterShardOffset) {
    // 面の節目で、いちばん最近入団した魔物のかけらが手に入る。
    const monsters = ctx.members.filter((m) => m.kind === "monster" && g.members[m.id]).sort((a, b2) => (b2.joinChapter ?? 0) - (a.joinChapter ?? 0));
    const latest = monsters[0];
    if (latest) {
      (g.members[latest.id] as OwnedMember).shards += 1;
      events.push({ type: "shard", atMs, id: latest.id });
    }
  }
  if (g.highestCleared >= totalStages(p)) events.push({ type: "allClear", atMs });
  return true;
}

/**
 * 時刻 nowMs まで進める。画面は数百ミリ秒ごとに、模擬プレイは1秒ごとに呼ぶ。
 * record が true のとき、始まった戦闘の再生用データ（replay）を返す。
 */
export function advance(game: GameData, nowMs: number, ctx: Content, record: boolean = false): StepResult {
  const g = clone(game);
  const events: GameEvent[] = [];
  const p = ctx.params;

  if (nowMs < g.lastActiveMs) {
    // 端末の時計が戻っている。離れていた時間は0として扱い、戦闘をやり直す。
    events.push({ type: "clockBack", atMs: nowMs });
    g.battle = null;
  } else {
    const awayMs = nowMs - g.lastActiveMs;
    if (awayMs > p.progress.onlineGapSec * 1000) {
      // 画面を閉じていた。その時間を放置報酬として積み、戦闘をやり直す。
      const capMs = p.economy.idleCapHours * 3_600_000;
      const counted = Math.min(awayMs, capMs);
      const gold = Math.floor((offlineGoldPerMin(g.highestCleared, p) * counted) / 60_000);
      g.idleGold += gold;
      events.push({ type: "offline", atMs: nowMs, awayMs, gold, capped: awayMs > capMs });
      g.battle = null;
    }
  }

  let startAt = nowMs;
  for (let guard = 0; guard < 5000; guard++) {
    if (g.battle === null) startBattle(g, startAt, ctx, record, events);
    const b = g.battle as BattleSlot;
    if (b.endsAtMs > nowMs) break;
    const advanced = resolveBattle(g, ctx, events);
    // 新しい面に進んだときは、面の紹介のぶんだけ次の戦闘が遅れる。
    const introSec = advanced && !allCleared(g, ctx) ? p.battle.stageIntroSec : 0;
    startAt = b.endsAtMs + (p.battle.interBattleSec + introSec) * 1000;
  }
  g.lastActiveMs = nowMs;
  return { game: g, events };
}

// ---------------------------------------------------------------- 操作

/** 放置報酬を受け取る。 */
export function claimIdle(game: GameData): ActionResult {
  if (game.idleGold <= 0) return { game, ok: false, reason: "受け取れる放置報酬がありません" };
  const g = clone(game);
  g.gold += g.idleGold;
  g.idleGold = 0;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

/** レベルを1つ上げる。 */
export function levelUp(game: GameData, id: string, ctx: Content): ActionResult {
  const info = levelUpInfo(game, id, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  g.gold -= info.cost;
  (g.members[id] as OwnedMember).level += 1;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

/** かけらを使って昇格する（★が1つ上がり、レベルの上限が伸びる）。 */
export function promote(game: GameData, id: string, ctx: Content): ActionResult {
  const info = promoteInfo(game, id, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  const own = g.members[id] as OwnedMember;
  own.shards -= info.need;
  own.star += 1;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

export interface RecruitResult extends ActionResult {
  id?: string;
  /** すでにいる団員で、かけらになったか。 */
  duplicate?: boolean;
}

/** 勧誘チケットを1枚使う。最初の1回は、決まった団員が必ず出る。 */
export function recruit(game: GameData, ctx: Content): RecruitResult {
  if (game.tickets < 1) return { game, ok: false, reason: "勧誘チケットがありません" };
  const g = clone(game);
  g.tickets -= 1;
  g.recruits += 1;
  g.stats.actions += 1;

  let picked: MemberDef;
  if (g.recruits === 1) {
    picked = ctx.byId[ctx.params.recruit.firstId] as MemberDef;
  } else {
    const humans = ctx.members.filter((m) => m.kind === "human");
    const total = humans.reduce((a, m) => a + (m.weight ?? 1), 0);
    const rng = createRng(g.rngState);
    let roll = rng.next() * total;
    g.rngState = rng.state();
    picked = humans[humans.length - 1] as MemberDef;
    for (const m of humans) {
      roll -= m.weight ?? 1;
      if (roll < 0) {
        picked = m;
        break;
      }
    }
  }

  const own = g.members[picked.id];
  if (own) {
    own.shards += 1;
    return { game: g, ok: true, id: picked.id, duplicate: true };
  }
  g.members[picked.id] = { level: JOIN_LEVEL, star: 0, shards: 0 };
  return { game: g, ok: true, id: picked.id, duplicate: false };
}

/** 編成の枠に団員を置く（null で外す）。すでに別の枠にいる団員を置くと、入れ替わる。 */
export function setPartySlot(game: GameData, slot: number, id: string | null): ActionResult {
  if (!Number.isInteger(slot) || slot < 0 || slot >= PARTY_SIZE) return { game, ok: false, reason: "その枠はありません" };
  if (id !== null && !game.members[id]) return { game, ok: false, reason: "その団員はいません" };
  const g = clone(game);
  const before = g.party[slot] ?? null;
  if (id !== null) {
    const other = g.party.indexOf(id);
    if (other >= 0 && other !== slot) g.party[other] = before;
  }
  g.party[slot] = id;
  if (g.party.every((x) => x === null)) return { game, ok: false, reason: "編成を空にはできません" };
  g.stats.actions += 1;
  return { game: g, ok: true };
}

/** 負けて止まっている面に、もう一度挑む。 */
export function retry(game: GameData, ctx: Content): ActionResult {
  if (game.challenging) return { game, ok: false, reason: "すでに挑戦中です" };
  if (allCleared(game, ctx)) return { game, ok: false, reason: "すべての面を突破しています" };
  const g = clone(game);
  g.challenging = true;
  g.battle = null; // 次の advance で、すぐに挑戦の戦闘が始まる
  g.stats.actions += 1;
  return { game: g, ok: true };
}

// ---------------------------------------------------------------- セーブの検証

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** セーブから読んだ値が、ゲームの状態として正しい形か。 */
export function isGameData(v: unknown): v is GameData {
  if (!isRecord(v)) return false;
  if (v["v"] !== GAME_VERSION) return false;
  for (const k of ["startedAtMs", "lastActiveMs", "gold", "idleGold", "tickets", "recruits", "highestCleared", "farmStage", "rngState"]) {
    if (!isNum(v[k])) return false;
  }
  if ((v["gold"] as number) < 0 || (v["tickets"] as number) < 0 || (v["highestCleared"] as number) < 0) return false;
  if (typeof v["challenging"] !== "boolean") return false;

  const members = v["members"];
  if (!isRecord(members) || Object.keys(members).length === 0) return false;
  for (const m of Object.values(members)) {
    if (!isRecord(m) || !isNum(m["level"]) || !isNum(m["star"]) || !isNum(m["shards"])) return false;
    if (m["level"] < 1 || m["star"] < 0 || m["shards"] < 0) return false;
  }

  const party = v["party"];
  if (!Array.isArray(party) || party.length !== PARTY_SIZE) return false;
  if (!party.every((x) => x === null || (typeof x === "string" && x in members))) return false;
  if (party.every((x) => x === null)) return false;

  const b = v["battle"];
  if (b !== null) {
    if (!isRecord(b) || !isNum(b["stage"]) || !isNum(b["startedAtMs"]) || !isNum(b["endsAtMs"])) return false;
    if (typeof b["win"] !== "boolean" || typeof b["timedOut"] !== "boolean") return false;
  }

  const s = v["stats"];
  if (!isRecord(s)) return false;
  for (const k of ["battles", "wins", "defeats", "actions", "lastProgressAtMs", "longestStallMs"]) {
    if (!isNum(s[k])) return false;
  }
  for (const k of ["firstDefeatAtMs", "firstJoinAtMs"]) {
    if (s[k] !== null && !isNum(s[k])) return false;
  }
  return true;
}

/**
 * 団員の定義が変わったあとでも動くように、セーブを整える。
 * 定義から消えた団員を外し、編成が空になったら、持っている団員で埋める。
 */
export function sanitizeGame(game: GameData, ctx: Content): GameData {
  const g = clone(game);
  for (const id of Object.keys(g.members)) {
    if (!ctx.byId[id]) delete g.members[id];
  }
  g.party = g.party.map((id) => (id !== null && g.members[id] ? id : null));
  if (Object.keys(g.members).length === 0) {
    for (const m of ctx.members.filter((d) => d.starter)) g.members[m.id] = { level: 1, star: 0, shards: 0 };
  }
  if (g.party.every((x) => x === null)) {
    Object.keys(g.members)
      .slice(0, PARTY_SIZE)
      .forEach((id, i) => {
        g.party[i] = id;
      });
  }
  g.highestCleared = Math.min(g.highestCleared, totalStages(ctx.params));
  g.farmStage = Math.min(g.farmStage, g.highestCleared);
  g.battle = null;
  return g;
}
