// ゲーム本体の状態と、それを進める関数（第2版）。
//
// 決まり（pipeline/rules/core.md）:
//   - 画面にも実際の時計にも触れない。時刻は nowMs で受け取る。
//   - 状態は書き換えず、新しい状態を返す。
//   - 画面も模擬プレイも、ここにある関数だけでゲームを進める（ルールを二重に書かない）。
//
// 流れ（契約書の第2版）:
//   - 「挑戦」（challenge）を押したときだけ戦う。戦闘は、始まった時点で結末まで計算する。
//     時間がたって advance が呼ばれると、結果が反映される。勝てば初クリア報酬を得て、次の面に挑めるようになる。
//   - おひねりと相棒の素材は、時間でたまる（開いていても閉じていても同じ速さ）。collectIdle で受け取る。
//   - 倒したボスは相棒になる。持っている相棒は全員、団員全体を底上げする。編成に入れた1体は、戦闘中に技を使う。
//   - ミッション（一度きり）と日課（毎日入れ替わる）で、おひねり・チケット・相棒の素材をもらえる。

import { createRng } from "./rng.ts";
import { runBattle } from "./battle.ts";
import type { BattleResult, CompanionSpec, FighterSpec } from "./battle.ts";
import {
  chapterOf,
  companionCostMinutes,
  companionMatCost,
  companionSkillPower,
  enemyGrowth,
  firstClearGold,
  idleGoldPerMin,
  isBossStage,
  levelCap,
  levelCost,
  maxStar,
  memberPower,
  memberStats,
  totalStages,
} from "./params.ts";
import type { Content, DailyDef, DailyKind, MemberDef, MemberRole, MissionDef, MissionKind, Reward } from "./params.ts";

export const GAME_VERSION = 2;
export const PARTY_SIZE = 4;

export interface OwnedMember {
  level: number;
  star: number;
  /** 昇格に使う「かけら」。 */
  shards: number;
}

export interface OwnedCompanion {
  level: number;
}

/** 進行中の挑戦。結果は挑戦を押した時点で決まっていて、resolveAtMs を過ぎると反映される。 */
export interface BattleSlot {
  stage: number;
  /** 戦闘が始まる時刻（挑戦を押してから、面の紹介のあと）。 */
  startedAtMs: number;
  /** 戦闘が終わる時刻。 */
  endsAtMs: number;
  /** 結果が反映される時刻（勝ち負けの表示のあと）。 */
  resolveAtMs: number;
  win: boolean;
  timedOut: boolean;
}

/** 放置報酬のたまり具合。 */
export interface IdleState {
  /** いまの「8時間の枠」が始まった時刻（最後に受け取った時刻）。 */
  windowStartMs: number;
  /** ここまでの分は、下の gold と mats に積んである。 */
  anchorMs: number;
  gold: number;
  mats: Record<string, number>;
}

/** 回数の記録（ミッションと日課が使う）。 */
export interface Counters {
  challenges: number;
  levelUps: number;
  recruits: number;
  promotes: number;
  idleClaims: number;
  companionLevelUps: number;
}

export interface DailyState {
  /** 日付の通し番号（画面が端末の日付から作って渡す）。まだ決まっていなければ -1。 */
  dayKey: number;
  counters: Counters;
  /** 今日、報酬を受け取った日課の数。 */
  claims: number;
  claimed: string[];
}

export interface GameStats {
  battles: number;
  wins: number;
  defeats: number;
  /** プレイヤーの操作の回数。 */
  actions: number;
  firstDefeatAtMs: number | null;
  firstCompanionAtMs: number | null;
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
  tickets: number;
  members: Record<string, OwnedMember>;
  /** 編成。0・1 が前列、2・3 が後列。 */
  party: (string | null)[];
  companions: Record<string, OwnedCompanion>;
  /** 編成に入れている相棒。 */
  companionSlot: string | null;
  /** 相棒ごとの専用の素材。 */
  materials: Record<string, number>;
  /** 突破した面の通し番号の最大（まだなければ 0）。 */
  highestCleared: number;
  battle: BattleSlot | null;
  idle: IdleState;
  counters: Counters;
  /** 報酬を受け取ったミッション。 */
  missionsClaimed: string[];
  daily: DailyState;
  rngState: number;
  stats: GameStats;
}

/** 実際にもらえる量（「何分ぶん」を、その時点の数に直したもの）。 */
export interface RewardAmounts {
  gold: number;
  tickets: number;
  /** 持っている相棒それぞれの素材。 */
  mats: number;
}

export type GameEvent =
  | { type: "win"; atMs: number; stage: number; reward: RewardAmounts }
  | { type: "defeat"; atMs: number; stage: number; timedOut: boolean }
  | { type: "companion"; atMs: number; id: string }
  | { type: "dailyReset"; atMs: number }
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

function zeroCounters(): Counters {
  return { challenges: 0, levelUps: 0, recruits: 0, promotes: 0, idleClaims: 0, companionLevelUps: 0 };
}

function clone(g: GameData): GameData {
  const members: Record<string, OwnedMember> = {};
  for (const id of Object.keys(g.members)) members[id] = { ...(g.members[id] as OwnedMember) };
  const companions: Record<string, OwnedCompanion> = {};
  for (const id of Object.keys(g.companions)) companions[id] = { ...(g.companions[id] as OwnedCompanion) };
  return {
    ...g,
    members,
    party: g.party.slice(),
    companions,
    materials: { ...g.materials },
    battle: g.battle ? { ...g.battle } : null,
    idle: { ...g.idle, mats: { ...g.idle.mats } },
    counters: { ...g.counters },
    missionsClaimed: g.missionsClaimed.slice(),
    daily: { ...g.daily, counters: { ...g.daily.counters }, claimed: g.daily.claimed.slice() },
    stats: { ...g.stats },
  };
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
    tickets: 0,
    members,
    party,
    companions: {},
    companionSlot: null,
    materials: {},
    highestCleared: 0,
    battle: null,
    idle: { windowStartMs: nowMs, anchorMs: nowMs, gold: 0, mats: {} },
    counters: zeroCounters(),
    missionsClaimed: [],
    daily: { dayKey: -1, counters: zeroCounters(), claims: 0, claimed: [] },
    rngState: seed >>> 0,
    stats: {
      battles: 0,
      wins: 0,
      defeats: 0,
      actions: 0,
      firstDefeatAtMs: null,
      firstCompanionAtMs: null,
      lastProgressAtMs: nowMs,
      longestStallMs: 0,
    },
  };
}

// ---------------------------------------------------------------- 参照

export function allCleared(g: GameData, ctx: Content): boolean {
  return g.highestCleared >= totalStages(ctx.params);
}

/** 次に挑む面（すべて突破していれば null）。 */
export function nextStage(g: GameData, ctx: Content): number | null {
  return allCleared(g, ctx) ? null : g.highestCleared + 1;
}

export function ownedCount(g: GameData): number {
  return Object.keys(g.members).length;
}

/** 持っている相棒による底上げ（体力と攻撃の倍率）。編成に入れていなくても、全員ぶんがかかる。 */
export function passiveMult(g: GameData, ctx: Content): { hp: number; atk: number } {
  let hp = 1;
  let atk = 1;
  for (const id of Object.keys(g.companions)) {
    const def = ctx.companionById[id];
    const own = g.companions[id];
    if (!def || !own) continue;
    hp += def.passiveHp * own.level;
    atk += def.passiveAtk * own.level;
  }
  return { hp, atk };
}

export function enemySpecs(stage: number, ctx: Content): FighterSpec[] {
  const p = ctx.params;
  const grow = enemyGrowth(stage, p);
  const chapter = chapterOf(stage, p);
  const baseHp = p.enemy.baseHp * grow * (p.enemy.chapterHpMult[chapter - 1] ?? 1);
  const baseAtk = p.enemy.baseAtk * grow * (p.enemy.chapterAtkMult[chapter - 1] ?? 1);
  if (isBossStage(stage, p)) {
    const def = ctx.companions.find((c) => c.chapter === chapter);
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

/** 団員1人の、戦闘での能力（相棒の底上げを含む）。 */
export function battleStats(g: GameData, id: string, ctx: Content): { hp: number; atk: number } | null {
  const def = ctx.byId[id];
  const own = g.members[id];
  if (!def || !own) return null;
  const s = memberStats(def, own.level, own.star, ctx.params);
  const m = passiveMult(g, ctx);
  return { hp: Math.round(s.hp * m.hp), atk: Math.round(s.atk * m.atk) };
}

export function allySpecs(g: GameData, ctx: Content): FighterSpec[] {
  const specs: FighterSpec[] = [];
  g.party.forEach((id, slot) => {
    if (id === null) return;
    const def = ctx.byId[id];
    const s = battleStats(g, id, ctx);
    if (!def || !s) return;
    specs.push({ key: id, row: slot < PARTY_SIZE / 2 ? 0 : 1, hp: s.hp, atk: s.atk, interval: def.interval, skill: def.skill, trait: def.trait ?? null });
  });
  return specs;
}

/** 編成に入れている相棒の、戦闘での姿。技は、団員の平均の攻撃をもとにする。 */
export function companionSpec(g: GameData, ctx: Content): CompanionSpec | null {
  const id = g.companionSlot;
  if (id === null) return null;
  const def = ctx.companionById[id];
  const own = g.companions[id];
  if (!def || !own) return null;
  const allies = allySpecs(g, ctx);
  if (allies.length === 0) return null;
  const avgAtk = allies.reduce((a, s) => a + s.atk, 0) / allies.length;
  return { key: id, atk: avgAtk, interval: def.interval, skill: { type: def.skill.type, power: companionSkillPower(def, own.level, ctx.params) } };
}

/** 編成の強さの目安（相棒の底上げを含む）。 */
export function partyPower(g: GameData, ctx: Content): number {
  const m = passiveMult(g, ctx);
  let sum = 0;
  for (const id of g.party) {
    if (id === null) continue;
    const def = ctx.byId[id];
    const own = g.members[id];
    if (def && own) sum += memberPower(def, own.level, own.star, ctx.params);
  }
  return Math.round(sum * (m.hp + m.atk) * 0.5);
}

/** 勧誘での提供割合（画面に表示する）。 */
export function recruitRates(ctx: Content): { id: string; rate: number }[] {
  const rarities = ctx.params.recruit.rarities;
  const used = Object.keys(rarities).filter((r) => ctx.members.some((m) => m.rarity === r));
  const totalRarity = used.reduce((a, r) => a + (rarities[r]?.weight ?? 0), 0);
  const out: { id: string; rate: number }[] = [];
  for (const r of used) {
    const group = ctx.members.filter((m) => m.rarity === r);
    const totalWeight = group.reduce((a, m) => a + (m.weight ?? 1), 0);
    for (const m of group) {
      out.push({ id: m.id, rate: ((rarities[r]?.weight ?? 0) / totalRarity) * ((m.weight ?? 1) / totalWeight) });
    }
  }
  return out;
}

export interface Goals {
  /** 次のボスを倒すまで、あと何面か（すべて突破していれば null）。 */
  bossIn: number | null;
  /** 次のボスがいる面の通し番号。 */
  bossStage: number | null;
}

/** 次の目標（画面に「あと○面」と出す）。 */
export function nextGoals(g: GameData, ctx: Content): Goals {
  const p = ctx.params;
  if (allCleared(g, ctx)) return { bossIn: null, bossStage: null };
  const next = g.highestCleared + 1;
  const bossStage = Math.ceil(next / p.progress.stagesPerChapter) * p.progress.stagesPerChapter;
  return { bossIn: bossStage - g.highestCleared, bossStage };
}

// ---------------------------------------------------------------- 報酬

/** 報酬を、その時点の実際の量に直す。 */
export function rewardAmounts(g: GameData, reward: Reward, ctx: Content): RewardAmounts {
  const rate = idleGoldPerMin(Math.max(1, g.highestCleared), ctx.params);
  return {
    gold: Math.round((reward.gold ?? 0) + (reward.goldMin ?? 0) * rate),
    tickets: reward.tickets ?? 0,
    mats: reward.mats ?? 0,
  };
}

function grant(g: GameData, amounts: RewardAmounts): void {
  g.gold += amounts.gold;
  g.tickets += amounts.tickets;
  if (amounts.mats > 0) {
    for (const id of Object.keys(g.companions)) g.materials[id] = (g.materials[id] ?? 0) + amounts.mats;
  }
}

// ---------------------------------------------------------------- 放置報酬

/** 放置報酬を、時刻 toMs のぶんまで積む。8時間の枠を超えたぶんは積まない。 */
function accrue(g: GameData, toMs: number, ctx: Content): void {
  const p = ctx.params;
  const end = Math.min(toMs, g.idle.windowStartMs + p.economy.idleCapHours * 3_600_000);
  const dt = end - g.idle.anchorMs;
  if (dt <= 0) return;
  g.idle.gold += (idleGoldPerMin(g.highestCleared, p) * dt) / 60_000;
  for (const id of Object.keys(g.companions)) {
    g.idle.mats[id] = (g.idle.mats[id] ?? 0) + (p.companion.matPerHour * dt) / 3_600_000;
  }
  g.idle.anchorMs = end;
}

export interface IdlePending {
  /** 受け取れるおひねり。 */
  gold: number;
  /** 受け取れる相棒の素材（相棒ごと）。 */
  mats: Record<string, number>;
  /** いまの、1分あたりのおひねり。 */
  ratePerMin: number;
  /** 上限（8時間ぶん）に達していて、これ以上たまらない。 */
  capped: boolean;
  /** いまの枠で、たまっていた時間（ミリ秒）。 */
  elapsedMs: number;
}

/** いま受け取れる放置報酬。状態は変えない。 */
export function idlePending(g: GameData, nowMs: number, ctx: Content): IdlePending {
  const c = clone(g);
  accrue(c, nowMs, ctx);
  const mats: Record<string, number> = {};
  for (const id of Object.keys(c.idle.mats)) mats[id] = Math.floor(c.idle.mats[id] ?? 0);
  const capMs = ctx.params.economy.idleCapHours * 3_600_000;
  const elapsedMs = Math.max(0, Math.min(nowMs - g.idle.windowStartMs, capMs));
  return {
    gold: Math.floor(c.idle.gold),
    mats,
    ratePerMin: idleGoldPerMin(g.highestCleared, ctx.params),
    capped: nowMs - g.idle.windowStartMs >= capMs,
    elapsedMs,
  };
}

export interface CollectResult extends ActionResult {
  gold?: number;
  mats?: Record<string, number>;
}

/** 放置報酬を受け取る（旅の画面の箱）。 */
export function collectIdle(game: GameData, nowMs: number, ctx: Content): CollectResult {
  const g = clone(game);
  accrue(g, nowMs, ctx);
  const gold = Math.floor(g.idle.gold);
  const mats: Record<string, number> = {};
  let any = gold > 0;
  for (const id of Object.keys(g.idle.mats)) {
    const n = Math.floor(g.idle.mats[id] ?? 0);
    if (n > 0) {
      mats[id] = n;
      any = true;
    }
  }
  if (!any) return { game, ok: false, reason: "まだ貯まっていません" };
  g.gold += gold;
  g.idle.gold -= gold;
  for (const id of Object.keys(mats)) {
    g.materials[id] = (g.materials[id] ?? 0) + (mats[id] as number);
    g.idle.mats[id] = (g.idle.mats[id] ?? 0) - (mats[id] as number);
  }
  // 受け取った時点から、新しい8時間の枠が始まる
  g.idle.windowStartMs = Math.max(nowMs, g.idle.anchorMs);
  g.idle.anchorMs = g.idle.windowStartMs;
  g.counters.idleClaims += 1;
  g.daily.counters.idleClaims += 1;
  g.stats.actions += 1;
  return { game: g, ok: true, gold, mats };
}

// ---------------------------------------------------------------- 進行

function resolveBattle(g: GameData, ctx: Content, events: GameEvent[]): void {
  const b = g.battle;
  if (!b) return;
  const p = ctx.params;
  const atMs = b.resolveAtMs;
  g.battle = null;

  if (!b.win) {
    g.stats.defeats += 1;
    if (g.stats.firstDefeatAtMs === null) g.stats.firstDefeatAtMs = atMs;
    events.push({ type: "defeat", atMs, stage: b.stage, timedOut: b.timedOut });
    return;
  }
  g.stats.wins += 1;
  if (b.stage <= g.highestCleared) return;

  // 放置報酬は「最高到達面」で量が決まるので、進む前のぶんを先に積んでおく
  accrue(g, atMs, ctx);
  const reward: RewardAmounts = {
    gold: firstClearGold(b.stage, p),
    tickets: p.economy.ticketStages.includes(b.stage) ? 1 : 0,
    mats: Object.keys(g.companions).length > 0 ? p.economy.firstClearMats : 0,
  };
  grant(g, reward);
  g.highestCleared = b.stage;
  g.stats.longestStallMs = Math.max(g.stats.longestStallMs, atMs - g.stats.lastProgressAtMs);
  g.stats.lastProgressAtMs = atMs;
  events.push({ type: "win", atMs, stage: b.stage, reward });

  if (isBossStage(b.stage, p)) {
    const def = ctx.companions.find((c) => c.chapter === chapterOf(b.stage, p));
    if (def && !g.companions[def.id]) {
      g.companions[def.id] = { level: 1 };
      g.materials[def.id] = g.materials[def.id] ?? 0;
      g.idle.mats[def.id] = g.idle.mats[def.id] ?? 0;
      if (g.stats.firstCompanionAtMs === null) g.stats.firstCompanionAtMs = atMs;
      events.push({ type: "companion", atMs, id: def.id });
    }
  }
  if (g.highestCleared >= totalStages(p)) events.push({ type: "allClear", atMs });
}

/**
 * 時刻 nowMs まで進める。画面は数百ミリ秒ごとに、模擬プレイは1秒ごとに呼ぶ。
 * dayKey は日付の通し番号（日課の入れ替えに使う。画面が端末の日付から作る）。
 */
export function advance(game: GameData, nowMs: number, dayKey: number, ctx: Content): StepResult {
  const g = clone(game);
  const events: GameEvent[] = [];

  if (nowMs < g.lastActiveMs) {
    // 端末の時計が戻っている。離れていた時間は0として扱い、たまり具合の基準を、いまの時刻に合わせ直す。
    events.push({ type: "clockBack", atMs: nowMs });
    if (g.idle.anchorMs > nowMs) g.idle.anchorMs = nowMs;
    if (g.idle.windowStartMs > nowMs) g.idle.windowStartMs = nowMs;
    if (g.battle && g.battle.startedAtMs > nowMs) {
      const shift = g.battle.startedAtMs - nowMs;
      g.battle = { ...g.battle, startedAtMs: nowMs, endsAtMs: g.battle.endsAtMs - shift, resolveAtMs: g.battle.resolveAtMs - shift };
    }
  } else if (dayKey > g.daily.dayKey) {
    // 日付が変わった（時計が戻っているときは、入れ替えない）
    const first = g.daily.dayKey === -1;
    g.daily = { dayKey, counters: zeroCounters(), claims: 0, claimed: [] };
    if (!first) events.push({ type: "dailyReset", atMs: nowMs });
  }

  if (g.battle !== null && g.battle.resolveAtMs <= nowMs) resolveBattle(g, ctx, events);
  g.lastActiveMs = nowMs;
  return { game: g, events };
}

export interface ChallengeResult extends ActionResult {
  stage?: number;
  startedAtMs?: number;
  endsAtMs?: number;
  /** 戦闘の再生用のデータ。 */
  replay?: BattleResult;
  allies?: FighterSpec[];
  enemies?: FighterSpec[];
  companion?: CompanionSpec | null;
}

/** 次の面に挑戦する。戦闘の結末は、この時点で決まる（反映は、戦闘が終わる時刻に advance が行う）。 */
export function challenge(game: GameData, nowMs: number, ctx: Content): ChallengeResult {
  if (game.battle !== null) return { game, ok: false, reason: "いま戦闘中です" };
  const stage = nextStage(game, ctx);
  if (stage === null) return { game, ok: false, reason: "すべての面を突破しています" };
  const allies = allySpecs(game, ctx);
  if (allies.length === 0) return { game, ok: false, reason: "編成に団員がいません" };
  const g = clone(game);
  const enemies = enemySpecs(stage, ctx);
  const companion = companionSpec(g, ctx);
  const rng = createRng(g.rngState);
  const replay = runBattle(allies, enemies, ctx.params.battle, rng, true, companion);
  g.rngState = rng.state();
  const bp = ctx.params.battle;
  const startedAtMs = nowMs + Math.round(bp.introSec * 1000);
  const endsAtMs = startedAtMs + Math.max(1000, Math.round(replay.durationSec * 1000));
  const resolveAtMs = endsAtMs + Math.round(bp.resultSec * 1000);
  g.battle = { stage, startedAtMs, endsAtMs, resolveAtMs, win: replay.win, timedOut: replay.timedOut };
  g.stats.battles += 1;
  g.stats.actions += 1;
  g.counters.challenges += 1;
  g.daily.counters.challenges += 1;
  return { game: g, ok: true, stage, startedAtMs, endsAtMs, replay, allies, enemies, companion };
}

// ---------------------------------------------------------------- 育成

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

function addLevels(g: GameData, n: number): void {
  g.counters.levelUps += n;
  g.daily.counters.levelUps += n;
}

/** レベルを1つ上げる。 */
export function levelUp(game: GameData, id: string, ctx: Content): ActionResult {
  const info = levelUpInfo(game, id, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  g.gold -= info.cost;
  (g.members[id] as OwnedMember).level += 1;
  addLevels(g, 1);
  g.stats.actions += 1;
  return { game: g, ok: true };
}

export interface BulkResult extends ActionResult {
  /** 上がったレベルの数（合計）。 */
  levels?: number;
}

/** 1人を、おひねりが続くかぎり（上限まで）まとめて上げる。 */
export function levelUpMax(game: GameData, id: string, ctx: Content): BulkResult {
  const first = levelUpInfo(game, id, ctx);
  if (!first.ok) return { game, ok: false, reason: first.reason };
  const g = clone(game);
  let levels = 0;
  for (let guard = 0; guard < 1000; guard++) {
    const info = levelUpInfo(g, id, ctx);
    if (!info.ok) break;
    g.gold -= info.cost;
    (g.members[id] as OwnedMember).level += 1;
    levels += 1;
  }
  addLevels(g, levels);
  g.stats.actions += 1;
  return { game: g, ok: true, levels };
}

/** 編成の全員を、レベルの低い団員から順に、おひねりが続くかぎりまとめて上げる。 */
export function trainParty(game: GameData, ctx: Content): BulkResult {
  const g = clone(game);
  let levels = 0;
  for (let guard = 0; guard < 4000; guard++) {
    let target: string | null = null;
    for (const id of g.party) {
      if (id === null || !levelUpInfo(g, id, ctx).ok) continue;
      if (target === null || (g.members[id] as OwnedMember).level < (g.members[target] as OwnedMember).level) target = id;
    }
    if (target === null) break;
    g.gold -= levelCost((g.members[target] as OwnedMember).level, ctx.params);
    (g.members[target] as OwnedMember).level += 1;
    levels += 1;
  }
  if (levels === 0) return { game, ok: false, reason: "おひねりが足りないか、全員が上限です" };
  addLevels(g, levels);
  g.stats.actions += 1;
  return { game: g, ok: true, levels };
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

/** かけらを使って昇格する（★が1つ上がり、レベルの上限が伸びる）。 */
export function promote(game: GameData, id: string, ctx: Content): ActionResult {
  const info = promoteInfo(game, id, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  const own = g.members[id] as OwnedMember;
  own.shards -= info.need;
  own.star += 1;
  g.counters.promotes += 1;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

// ---------------------------------------------------------------- 団員

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
  g.counters.recruits += 1;
  g.daily.counters.recruits += 1;
  g.stats.actions += 1;

  let picked: MemberDef;
  if (g.counters.recruits === 1) {
    picked = ctx.byId[ctx.params.recruit.firstId] as MemberDef;
  } else {
    const rates = recruitRates(ctx);
    const rng = createRng(g.rngState);
    let roll = rng.next();
    g.rngState = rng.state();
    picked = ctx.byId[(rates[rates.length - 1] as { id: string }).id] as MemberDef;
    for (const r of rates) {
      roll -= r.rate;
      if (roll < 0) {
        picked = ctx.byId[r.id] as MemberDef;
        break;
      }
    }
  }

  const own = g.members[picked.id];
  if (own) {
    own.shards += 1;
    return { game: g, ok: true, id: picked.id, duplicate: true };
  }
  // 新しい団員は、レベル1から始まる
  g.members[picked.id] = { level: 1, star: 0, shards: 0 };
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

// ---------------------------------------------------------------- 相棒

/** 相棒を編成に入れる（null で外す）。 */
export function setCompanion(game: GameData, id: string | null): ActionResult {
  if (id !== null && !game.companions[id]) return { game, ok: false, reason: "その相棒はいません" };
  if (game.companionSlot === id) return { game, ok: false, reason: id === null ? "相棒は入っていません" : "すでに編成に入っています" };
  const g = clone(game);
  g.companionSlot = id;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

export interface CompanionLevelInfo {
  ok: boolean;
  /** 要るおひねりと、専用の素材。 */
  gold: number;
  mats: number;
  reason?: string;
}

export function companionLevelInfo(g: GameData, id: string, ctx: Content): CompanionLevelInfo {
  const own = g.companions[id];
  if (!own) return { ok: false, gold: 0, mats: 0, reason: "その相棒はいません" };
  const p = ctx.params;
  const gold = Math.round(companionCostMinutes(own.level, p) * idleGoldPerMin(Math.max(1, g.highestCleared), p));
  const mats = companionMatCost(own.level, p);
  if (own.level >= p.companion.levelCap) return { ok: false, gold, mats, reason: "レベルの上限です" };
  if ((g.materials[id] ?? 0) < mats) return { ok: false, gold, mats, reason: "専用の素材が足りません" };
  if (g.gold < gold) return { ok: false, gold, mats, reason: "おひねりが足りません" };
  return { ok: true, gold, mats };
}

/** 相棒のレベルを1つ上げる（おひねりと、その相棒専用の素材を使う）。 */
export function companionLevelUp(game: GameData, id: string, ctx: Content): ActionResult {
  const info = companionLevelInfo(game, id, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  g.gold -= info.gold;
  g.materials[id] = (g.materials[id] ?? 0) - info.mats;
  (g.companions[id] as OwnedCompanion).level += 1;
  g.counters.companionLevelUps += 1;
  g.daily.counters.companionLevelUps += 1;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

// ---------------------------------------------------------------- ミッションと日課

function missionProgress(kind: MissionKind, g: GameData): number {
  switch (kind) {
    case "clear":
      return g.highestCleared;
    case "levelUps":
      return g.counters.levelUps;
    case "memberLevel": {
      let max = 0;
      for (const m of Object.values(g.members)) if (m.level > max) max = m.level;
      return max;
    }
    case "recruits":
      return g.counters.recruits;
    case "partySize":
      return g.party.filter((x) => x !== null).length;
    case "promotes":
      return g.counters.promotes;
    case "idleClaims":
      return g.counters.idleClaims;
    case "companions":
      return Object.keys(g.companions).length;
    case "companionEquipped":
      return g.companionSlot !== null ? 1 : 0;
    case "companionLevelUps":
      return g.counters.companionLevelUps;
  }
}

function dailyProgress(kind: DailyKind, g: GameData): number {
  return kind === "dailyClaims" ? g.daily.claims : g.daily.counters[kind];
}

export interface GoalView<T> {
  def: T;
  progress: number;
  /** 達成していて、まだ報酬を受け取っていない。 */
  claimable: boolean;
  claimed: boolean;
  reward: RewardAmounts;
}

/** ミッションの一覧（定義の順）。 */
export function missionList(g: GameData, ctx: Content): GoalView<MissionDef>[] {
  return ctx.missions.map((def) => {
    const progress = Math.min(def.target, missionProgress(def.kind, g));
    const claimed = g.missionsClaimed.includes(def.id);
    return { def, progress, claimable: !claimed && progress >= def.target, claimed, reward: rewardAmounts(g, def.reward, ctx) };
  });
}

/** 今日の日課の一覧。 */
export function dailyList(g: GameData, ctx: Content): GoalView<DailyDef>[] {
  return ctx.dailies.map((def) => {
    const progress = Math.min(def.target, dailyProgress(def.kind, g));
    const claimed = g.daily.claimed.includes(def.id);
    return { def, progress, claimable: !claimed && progress >= def.target, claimed, reward: rewardAmounts(g, def.reward, ctx) };
  });
}

export interface ClaimResult extends ActionResult {
  reward?: RewardAmounts;
}

/** 達成したミッションの報酬を受け取る。 */
export function claimMission(game: GameData, id: string, ctx: Content): ClaimResult {
  const view = missionList(game, ctx).find((m) => m.def.id === id);
  if (!view) return { game, ok: false, reason: "そのミッションはありません" };
  if (view.claimed) return { game, ok: false, reason: "すでに受け取っています" };
  if (!view.claimable) return { game, ok: false, reason: "まだ達成していません" };
  const g = clone(game);
  grant(g, view.reward);
  g.missionsClaimed.push(id);
  g.stats.actions += 1;
  return { game: g, ok: true, reward: view.reward };
}

/** 達成した日課の報酬を受け取る。 */
export function claimDaily(game: GameData, id: string, ctx: Content): ClaimResult {
  const view = dailyList(game, ctx).find((m) => m.def.id === id);
  if (!view) return { game, ok: false, reason: "その日課はありません" };
  if (view.claimed) return { game, ok: false, reason: "すでに受け取っています" };
  if (!view.claimable) return { game, ok: false, reason: "まだ達成していません" };
  const g = clone(game);
  grant(g, view.reward);
  g.daily.claimed.push(id);
  if (view.def.kind !== "dailyClaims") g.daily.claims += 1;
  g.stats.actions += 1;
  return { game: g, ok: true, reward: view.reward };
}

// ---------------------------------------------------------------- セーブの検証

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isCounters(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return ["challenges", "levelUps", "recruits", "promotes", "idleClaims", "companionLevelUps"].every((k) => isNum(v[k]) && (v[k] as number) >= 0);
}

function isNumberMap(v: unknown): boolean {
  return isRecord(v) && Object.values(v).every((x) => isNum(x));
}

function isStringList(v: unknown): boolean {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/** セーブから読んだ値が、ゲームの状態として正しい形か。 */
export function isGameData(v: unknown): v is GameData {
  if (!isRecord(v)) return false;
  if (v["v"] !== GAME_VERSION) return false;
  for (const k of ["startedAtMs", "lastActiveMs", "gold", "tickets", "highestCleared", "rngState"]) {
    if (!isNum(v[k])) return false;
  }
  if ((v["gold"] as number) < 0 || (v["tickets"] as number) < 0 || (v["highestCleared"] as number) < 0) return false;

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

  const companions = v["companions"];
  if (!isRecord(companions)) return false;
  for (const c of Object.values(companions)) {
    if (!isRecord(c) || !isNum(c["level"]) || c["level"] < 1) return false;
  }
  const slot = v["companionSlot"];
  if (slot !== null && !(typeof slot === "string" && slot in companions)) return false;
  if (!isNumberMap(v["materials"])) return false;

  const b = v["battle"];
  if (b !== null) {
    if (!isRecord(b) || !isNum(b["stage"]) || !isNum(b["startedAtMs"]) || !isNum(b["endsAtMs"]) || !isNum(b["resolveAtMs"])) return false;
    if (typeof b["win"] !== "boolean" || typeof b["timedOut"] !== "boolean") return false;
  }
  const idle = v["idle"];
  if (!isRecord(idle) || !isNum(idle["windowStartMs"]) || !isNum(idle["anchorMs"]) || !isNum(idle["gold"]) || !isNumberMap(idle["mats"])) return false;
  if (!isCounters(v["counters"]) || !isStringList(v["missionsClaimed"])) return false;
  const daily = v["daily"];
  if (!isRecord(daily) || !isNum(daily["dayKey"]) || !isNum(daily["claims"]) || !isCounters(daily["counters"]) || !isStringList(daily["claimed"])) return false;

  const s = v["stats"];
  if (!isRecord(s)) return false;
  for (const k of ["battles", "wins", "defeats", "actions", "lastProgressAtMs", "longestStallMs"]) {
    if (!isNum(s[k])) return false;
  }
  for (const k of ["firstDefeatAtMs", "firstCompanionAtMs"]) {
    if (s[k] !== null && !isNum(s[k])) return false;
  }
  return true;
}

/**
 * 団員や相棒の定義が変わったあとでも動くように、セーブを整える。
 * 定義から消えたものを外し、編成が空になったら、持っている団員で埋める。
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
  for (const id of Object.keys(g.companions)) {
    if (!ctx.companionById[id]) {
      delete g.companions[id];
      delete g.materials[id];
      delete g.idle.mats[id];
    }
  }
  if (g.companionSlot !== null && !g.companions[g.companionSlot]) g.companionSlot = null;
  g.highestCleared = Math.min(g.highestCleared, totalStages(ctx.params));
  if (g.battle !== null && g.battle.stage !== g.highestCleared + 1) g.battle = null;
  return g;
}
