// ゲーム本体の状態と、それを進める関数（第3版）。
//
// 決まり（pipeline/rules/core.md）:
//   - 画面にも実際の時計にも触れない。時刻は nowMs で受け取る。
//   - 状態は書き換えず、新しい状態を返す。
//   - 画面も模擬プレイも、ここにある関数だけでゲームを進める（ルールを二重に書かない）。
//
// 流れ（契約書の第3版）:
//   - 「挑戦」（challenge）を押したときだけ戦う。戦闘は、始まった時点で結末まで計算する。
//     時間がたって advance が呼ばれると、結果が反映される。勝てば初クリア報酬（おひねり、装備）を得て、次の面に挑めるようになる。
//   - おひねり、相棒の素材、装備は、時間でたまる（開いていても閉じていても同じ速さ）。collectIdle で受け取る。
//   - 団員は6人で編成する（前列3、後列3）。レア度は ★1〜★3（★3 には通常とエリート）。
//     勧誘は通常と高級の2種類で、1回か10連。レベルは、いつでもリセットしておひねりを取り戻せる。
//   - 倒したボスは相棒になる。持っている相棒は全員、団員全体を底上げする。編成に入れた1体は、戦闘中に技を使う。
//   - 装備は団員ごとに4か所。付け替えは自由で、おひねりで強化する。
//   - ミッション（一度きり）と日課（毎日入れ替わる）で、おひねり・チケット・相棒の素材をもらえる。

import { createRng } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { runBattle } from "./battle.ts";
import type { BattleResult, CompanionSpec, FighterSpec } from "./battle.ts";
import {
  EQUIP_SLOTS,
  EQUIP_STAT,
  chapterOf,
  companionCostMinutes,
  companionMatCost,
  companionSkillPower,
  enemyGrowth,
  equipBonus,
  equipDropWeights,
  equipEnhanceMinutes,
  equipLevelCap,
  firstClearGold,
  idleGoldPerMin,
  isBossStage,
  levelCap,
  levelCostTo,
  maxPlus,
  memberStats,
  powerOf,
  stageLabel,
  totalStages,
} from "./params.ts";
import type { BannerDef, BannerId, Content, DailyDef, DailyKind, DungeonDef, DungeonReward, EquipDef, EquipSlot, MemberDef, MemberRole, MissionDef, MissionKind, Reward } from "./params.ts";

export const GAME_VERSION = 3;
export const PARTY_SIZE = 6;
/** 前列の枠の数（編成の前半）。 */
export const FRONT_SIZE = PARTY_SIZE / 2;

export interface OwnedMember {
  level: number;
  /** 昇格の段階（+1、+2…）。 */
  plus: number;
  /** 昇格に使う「かけら」。 */
  shards: number;
}

export interface OwnedCompanion {
  level: number;
}

/** 持っている装備（1つずつ別のもの）。 */
export interface OwnedEquip {
  /** 通し番号（手に入れた順）。 */
  uid: number;
  /** 装備の種類。 */
  defId: string;
  /** 強化の段階。 */
  level: number;
  /** 付けている団員（だれも付けていなければ null）。 */
  on: string | null;
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
  /** ダンジョンの戦闘なら、その種類と段階（本編の面なら、ない）。 */
  dungeon?: { kind: string; tier: number };
}

/** ダンジョンの進み具合（種類ごと）。 */
export interface DungeonProgress {
  /** 突破した、いちばん上の段階（まだなければ 0）。 */
  cleared: number;
  /** 清掃した回数（sweepDay の日のうち）。 */
  sweeps: number;
  /** 最後に清掃した日（日付の通し番号）。 */
  sweepDay: number;
}

/** 放置報酬のたまり具合。 */
export interface IdleState {
  /** いまの「8時間の枠」が始まった時刻（最後に受け取った時刻）。 */
  windowStartMs: number;
  /** ここまでの分は、下の gold・mats・equip に積んである。 */
  anchorMs: number;
  gold: number;
  mats: Record<string, number>;
  /** 装備（1 で1つぶん）。 */
  equip: number;
}

/** 回数の記録（ミッションと日課が使う）。 */
export interface Counters {
  challenges: number;
  /** 上げたレベルの数（合計）。 */
  levelUps: number;
  /** 勧誘した回数（10連は10回と数える）。 */
  recruits: number;
  promotes: number;
  resets: number;
  idleClaims: number;
  companionLevelUps: number;
  enhances: number;
}

const COUNTER_KEYS: (keyof Counters)[] = ["challenges", "levelUps", "recruits", "promotes", "resets", "idleClaims", "companionLevelUps", "enhances"];

export interface DailyState {
  /** 日付の通し番号（画面が端末の日付から作って渡す）。まだ決まっていなければ -1。 */
  dayKey: number;
  counters: Counters;
  /** 今日、報酬を受け取った日課の数。 */
  claims: number;
  claimed: string[];
}

/** 勧誘の記録。 */
export interface RecruitState {
  /** 天井までの数え（勧誘の種類ごと）。最後に天井の対象（★3）が出てからの回数。 */
  pity: Record<string, number>;
  /** 最初の高級10連（決まった団員が出る）を、もう回したか。 */
  firstTenDone: boolean;
}

export interface GameStats {
  battles: number;
  wins: number;
  defeats: number;
  /** プレイヤーの操作の回数。 */
  actions: number;
  firstDefeatAtMs: number | null;
  firstCompanionAtMs: number | null;
  /** 編成の6枠が、初めて全部埋まった時刻。 */
  partyFullAtMs: number | null;
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
  /** 通常チケット。 */
  tickets: number;
  /** 高級チケット。 */
  premiumTickets: number;
  members: Record<string, OwnedMember>;
  /** 編成。前半（0〜2）が前列、後半（3〜5）が後列。 */
  party: (string | null)[];
  companions: Record<string, OwnedCompanion>;
  /** 編成に入れている相棒。 */
  companionSlot: string | null;
  /** 相棒ごとの専用の素材。 */
  materials: Record<string, number>;
  equips: OwnedEquip[];
  nextEquipUid: number;
  /** 突破した面の通し番号の最大（まだなければ 0）。 */
  highestCleared: number;
  battle: BattleSlot | null;
  idle: IdleState;
  counters: Counters;
  recruit: RecruitState;
  /** 報酬を受け取ったミッション。 */
  missionsClaimed: string[];
  daily: DailyState;
  /** ダンジョン（種類ごと）。古いセーブにはないので、読み込むときに足す。 */
  dungeons: Record<string, DungeonProgress>;
  rngState: number;
  stats: GameStats;
}

/** ダンジョンで手に入ったもの。 */
export interface DungeonGot {
  gold: number;
  /** 持っている相棒それぞれに入った素材。 */
  mats: number;
  /** 手に入れた装備（種類）。 */
  equips: string[];
}

/** 実際にもらえる量（「何分ぶん」を、その時点の数に直したもの）。 */
export interface RewardAmounts {
  gold: number;
  tickets: number;
  premiumTickets: number;
  /** 持っている相棒それぞれの素材。 */
  mats: number;
}

export type GameEvent =
  | { type: "win"; atMs: number; stage: number; reward: RewardAmounts; /** 初クリア報酬の装備（種類）。 */ equipDefId: string | null }
  | { type: "defeat"; atMs: number; stage: number; timedOut: boolean }
  | { type: "companion"; atMs: number; id: string }
  | { type: "dungeonWin"; atMs: number; kind: string; tier: number; got: DungeonGot }
  | { type: "dungeonDefeat"; atMs: number; kind: string; tier: number; timedOut: boolean }
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
  return { challenges: 0, levelUps: 0, recruits: 0, promotes: 0, resets: 0, idleClaims: 0, companionLevelUps: 0, enhances: 0 };
}

function cloneDungeons(d: Record<string, DungeonProgress> | undefined): Record<string, DungeonProgress> {
  const out: Record<string, DungeonProgress> = {};
  for (const k of Object.keys(d ?? {})) out[k] = { ...((d as Record<string, DungeonProgress>)[k] as DungeonProgress) };
  return out;
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
    equips: g.equips.map((e) => ({ ...e })),
    battle: g.battle ? { ...g.battle } : null,
    idle: { ...g.idle, mats: { ...g.idle.mats } },
    counters: { ...g.counters },
    recruit: { ...g.recruit, pity: { ...g.recruit.pity } },
    missionsClaimed: g.missionsClaimed.slice(),
    daily: { ...g.daily, counters: { ...g.daily.counters }, claimed: g.daily.claimed.slice() },
    dungeons: cloneDungeons(g.dungeons),
    stats: { ...g.stats },
  };
}

const ROLE_ORDER: Record<MemberRole, number> = { tank: 0, attacker: 1, support: 2, healer: 3 };

export function createGame(nowMs: number, seed: number, ctx: Content): GameData {
  const starters = ctx.members.filter((m) => m.starter).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const members: Record<string, OwnedMember> = {};
  const party: (string | null)[] = [];
  for (const m of starters) {
    members[m.id] = { level: 1, plus: 0, shards: 0 };
    if (party.length < PARTY_SIZE) party.push(m.id);
  }
  while (party.length < PARTY_SIZE) party.push(null);
  return {
    v: GAME_VERSION,
    startedAtMs: nowMs,
    lastActiveMs: nowMs,
    gold: 0,
    tickets: 0,
    premiumTickets: 0,
    members,
    party,
    companions: {},
    companionSlot: null,
    materials: {},
    equips: [],
    nextEquipUid: 1,
    highestCleared: 0,
    battle: null,
    idle: { windowStartMs: nowMs, anchorMs: nowMs, gold: 0, mats: {}, equip: 0 },
    counters: zeroCounters(),
    recruit: { pity: {}, firstTenDone: false },
    missionsClaimed: [],
    daily: { dayKey: -1, counters: zeroCounters(), claims: 0, claimed: [] },
    dungeons: {},
    rngState: seed >>> 0,
    stats: {
      battles: 0,
      wins: 0,
      defeats: 0,
      actions: 0,
      firstDefeatAtMs: null,
      firstCompanionAtMs: null,
      partyFullAtMs: party.every((x) => x !== null) ? nowMs : null,
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

/** その団員が付けている装備（場所ごと。付けていなければ null）。 */
export function equippedOn(g: GameData, memberId: string, ctx: Content): Record<EquipSlot, OwnedEquip | null> {
  const out: Record<EquipSlot, OwnedEquip | null> = { weapon: null, costume: null, prop: null, charm: null };
  for (const e of g.equips) {
    if (e.on !== memberId) continue;
    const def = ctx.equipById[e.defId];
    if (def) out[def.slot] = e;
  }
  return out;
}

/** 付けている装備による上乗せ（体力と攻撃の倍率）。 */
export function equipMult(g: GameData, memberId: string, ctx: Content): { hp: number; atk: number } {
  let hp = 1;
  let atk = 1;
  for (const e of g.equips) {
    if (e.on !== memberId) continue;
    const def = ctx.equipById[e.defId];
    if (!def) continue;
    const bonus = equipBonus(def, e.level, ctx.params);
    if (EQUIP_STAT[def.slot] === "hp") hp += bonus;
    else atk += bonus;
  }
  return { hp, atk };
}

/** 編成の団員が付けている装備の数（4か所 × 6人のうち）。 */
export function equippedCount(g: GameData): number {
  let n = 0;
  for (const e of g.equips) if (e.on !== null && g.party.includes(e.on)) n += 1;
  return n;
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

/** 団員1人の、戦闘での能力（相棒の底上げと装備を含む）。 */
export function battleStats(g: GameData, id: string, ctx: Content): { hp: number; atk: number } | null {
  const def = ctx.byId[id];
  const own = g.members[id];
  if (!def || !own) return null;
  const s = memberStats(def, own.level, own.plus, ctx.params);
  const m = passiveMult(g, ctx);
  const e = equipMult(g, id, ctx);
  return { hp: Math.round(s.hp * m.hp * e.hp), atk: Math.round(s.atk * m.atk * e.atk) };
}

/** 団員1人の強さの目安（相棒の底上げと装備を含む）。 */
export function memberPowerNow(g: GameData, id: string, ctx: Content): number {
  const def = ctx.byId[id];
  const s = battleStats(g, id, ctx);
  return def && s ? powerOf(s, def.interval) : 0;
}

export function allySpecs(g: GameData, ctx: Content): FighterSpec[] {
  const specs: FighterSpec[] = [];
  g.party.forEach((id, slot) => {
    if (id === null) return;
    const def = ctx.byId[id];
    const s = battleStats(g, id, ctx);
    if (!def || !s) return;
    specs.push({ key: id, row: slot < FRONT_SIZE ? 0 : 1, hp: s.hp, atk: s.atk, interval: def.interval, skill: def.skill, trait: def.trait ?? null });
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

/** 編成の強さの目安（相棒の底上げと装備を含む）。 */
export function partyPower(g: GameData, ctx: Content): number {
  let sum = 0;
  for (const id of g.party) if (id !== null) sum += memberPowerNow(g, id, ctx);
  return sum;
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
    premiumTickets: reward.premiumTickets ?? 0,
    mats: reward.mats ?? 0,
  };
}

function grant(g: GameData, amounts: RewardAmounts): void {
  g.gold += amounts.gold;
  g.tickets += amounts.tickets;
  g.premiumTickets += amounts.premiumTickets;
  if (amounts.mats > 0) {
    for (const id of Object.keys(g.companions)) g.materials[id] = (g.materials[id] ?? 0) + amounts.mats;
  }
}

/** 重みに従って1つ選ぶ（roll は 0以上1未満）。 */
function pick<T>(items: T[], weight: (item: T) => number, roll: number): T {
  const total = items.reduce((a, x) => a + weight(x), 0);
  let left = roll * total;
  for (const item of items) {
    left -= weight(item);
    if (left < 0) return item;
  }
  return items[items.length - 1] as T;
}

/** 装備を1つ作って、手持ちに加える。★は章ごとの出やすさで、場所は均等に決まる。 */
function rollEquip(g: GameData, chapter: number, ctx: Content, rng: Rng): OwnedEquip | null {
  const weights = equipDropWeights(chapter, ctx.params);
  const starsList = weights.map((_, i) => i + 1).filter((stars) => (weights[stars - 1] ?? 0) > 0 && ctx.equipment.some((d) => d.stars === stars));
  if (starsList.length === 0) return null;
  const stars = pick(starsList, (s) => weights[s - 1] ?? 0, rng.next());
  const defs = ctx.equipment.filter((d) => d.stars === stars);
  const def = pick(defs, () => 1, rng.next());
  const item: OwnedEquip = { uid: g.nextEquipUid, defId: def.id, level: 0, on: null };
  g.nextEquipUid += 1;
  g.equips.push(item);
  return item;
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
  if (p.equipment.idleHoursPerItem > 0) g.idle.equip += dt / (p.equipment.idleHoursPerItem * 3_600_000);
  g.idle.anchorMs = end;
}

export interface IdlePending {
  /** 受け取れるおひねり。 */
  gold: number;
  /** 受け取れる相棒の素材（相棒ごと）。 */
  mats: Record<string, number>;
  /** 受け取れる装備の数。 */
  equips: number;
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
    equips: Math.floor(c.idle.equip + 1e-9),
    ratePerMin: idleGoldPerMin(g.highestCleared, ctx.params),
    capped: nowMs - g.idle.windowStartMs >= capMs,
    elapsedMs,
  };
}

export interface CollectResult extends ActionResult {
  gold?: number;
  mats?: Record<string, number>;
  /** 受け取った装備。 */
  equips?: OwnedEquip[];
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
  const count = Math.floor(g.idle.equip + 1e-9);
  if (count > 0) any = true;
  if (!any) return { game, ok: false, reason: "まだ貯まっていません" };
  g.gold += gold;
  g.idle.gold -= gold;
  for (const id of Object.keys(mats)) {
    g.materials[id] = (g.materials[id] ?? 0) + (mats[id] as number);
    g.idle.mats[id] = (g.idle.mats[id] ?? 0) - (mats[id] as number);
  }
  const equips: OwnedEquip[] = [];
  if (count > 0) {
    const rng = createRng(g.rngState);
    const chapter = chapterOf(Math.max(1, g.highestCleared), ctx.params);
    for (let i = 0; i < count; i++) {
      const item = rollEquip(g, chapter, ctx, rng);
      if (item) equips.push({ ...item });
    }
    g.rngState = rng.state();
    g.idle.equip = Math.max(0, g.idle.equip - count);
  }
  // 受け取った時点から、新しい8時間の枠が始まる
  g.idle.windowStartMs = Math.max(nowMs, g.idle.anchorMs);
  g.idle.anchorMs = g.idle.windowStartMs;
  g.counters.idleClaims += 1;
  g.daily.counters.idleClaims += 1;
  g.stats.actions += 1;
  return { game: g, ok: true, gold, mats, equips };
}

// ---------------------------------------------------------------- 進行

function resolveBattle(g: GameData, ctx: Content, events: GameEvent[]): void {
  const b = g.battle;
  if (!b) return;
  const p = ctx.params;
  const atMs = b.resolveAtMs;
  g.battle = null;

  if (b.dungeon) {
    resolveDungeon(g, b.dungeon.kind, b.dungeon.tier, b.win, b.timedOut, atMs, ctx, events);
    return;
  }
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
    premiumTickets: 0,
    mats: Object.keys(g.companions).length > 0 ? p.economy.firstClearMats : 0,
  };
  grant(g, reward);
  let equipDefId: string | null = null;
  if (p.equipment.firstClearCount > 0) {
    const rng = createRng(g.rngState);
    for (let i = 0; i < p.equipment.firstClearCount; i++) {
      const item = rollEquip(g, chapterOf(b.stage, p), ctx, rng);
      if (item && equipDefId === null) equipDefId = item.defId;
    }
    g.rngState = rng.state();
  }
  g.highestCleared = b.stage;
  g.stats.longestStallMs = Math.max(g.stats.longestStallMs, atMs - g.stats.lastProgressAtMs);
  g.stats.lastProgressAtMs = atMs;
  events.push({ type: "win", atMs, stage: b.stage, reward, equipDefId });

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

// ---------------------------------------------------------------- ダンジョン
//
// 挑戦は何回でもできる。報酬が出るのは、その段階を初めて突破したときだけ。
// 毎日の報酬は清掃（戦わずに受け取る。種類ごとに1日の回数が決まっている）で受け取る。清掃の報酬は、初回より少ない。

function dungeonDef(kind: string, ctx: Content): DungeonDef | undefined {
  return ctx.params.dungeon.kinds.find((d) => d.id === kind);
}

function dungeonProgress(g: GameData, kind: string): DungeonProgress {
  return g.dungeons[kind] ?? { cleared: 0, sweeps: 0, sweepDay: -1 };
}

export function dungeonUnlocked(g: GameData, kind: string, ctx: Content): boolean {
  const def = dungeonDef(kind, ctx);
  return def !== undefined && g.highestCleared >= def.unlockStage;
}

/** 突破した、いちばん上の段階（まだなければ 0）。 */
export function dungeonCleared(g: GameData, kind: string): number {
  return dungeonProgress(g, kind).cleared;
}

/** 今日、あと何回清掃できるか。 */
export function sweepsLeft(g: GameData, kind: string, ctx: Content): number {
  const pr = dungeonProgress(g, kind);
  const used = pr.sweepDay === g.daily.dayKey ? pr.sweeps : 0;
  return Math.max(0, ctx.params.dungeon.sweepsPerDay - used);
}

/** 今日、すべてのダンジョンで清掃した回数の合計（日課が使う）。 */
function sweepsToday(g: GameData): number {
  let n = 0;
  for (const pr of Object.values(g.dungeons)) if (pr.sweepDay === g.daily.dayKey) n += pr.sweeps;
  return n;
}

/** 清掃できるダンジョンがあるか（画面の印に使う）。 */
export function canSweepAny(g: GameData, ctx: Content): boolean {
  return ctx.params.dungeon.kinds.some((d) => dungeonUnlocked(g, d.id, ctx) && dungeonCleared(g, d.id) > 0 && sweepsLeft(g, d.id, ctx) > 0);
}

/** 報酬の中身を、実際に手に入るものに直して渡す（装備は、ここで決まる）。 */
function grantDungeon(g: GameData, reward: DungeonReward, ctx: Content): DungeonGot {
  const got: DungeonGot = { gold: reward.gold ?? 0, mats: 0, equips: [] };
  g.gold += got.gold;
  if ((reward.mats ?? 0) > 0 && Object.keys(g.companions).length > 0) {
    got.mats = reward.mats ?? 0;
    for (const id of Object.keys(g.companions)) g.materials[id] = (g.materials[id] ?? 0) + got.mats;
  }
  const n = reward.equips ?? 0;
  if (n > 0) {
    const rng = createRng(g.rngState);
    for (let i = 0; i < n; i++) {
      const item = rollEquip(g, reward.equipChapter ?? 1, ctx, rng);
      if (item) got.equips.push(item.defId);
    }
    g.rngState = rng.state();
  }
  return got;
}

function resolveDungeon(g: GameData, kind: string, tier: number, win: boolean, timedOut: boolean, atMs: number, ctx: Content, events: GameEvent[]): void {
  const def = dungeonDef(kind, ctx);
  const t = def?.tiers[tier - 1];
  if (!def || !t) return;
  if (!win) {
    events.push({ type: "dungeonDefeat", atMs, kind, tier, timedOut });
    return;
  }
  g.stats.wins += 1;
  const pr = dungeonProgress(g, kind);
  if (tier !== pr.cleared + 1) return;
  g.dungeons[kind] = { ...pr, cleared: tier };
  const got = grantDungeon(g, t.first, ctx);
  events.push({ type: "dungeonWin", atMs, kind, tier, got });
}

/** ダンジョンの次の段階に挑戦する（何回でもできる）。 */
export function challengeDungeon(game: GameData, kind: string, nowMs: number, ctx: Content): ChallengeResult {
  const def = dungeonDef(kind, ctx);
  if (!def) return { game, ok: false, reason: "そのダンジョンはありません" };
  if (!dungeonUnlocked(game, kind, ctx)) return { game, ok: false, reason: `${stageLabel(def.unlockStage, ctx.params)} を突破すると開きます` };
  if (game.battle !== null) return { game, ok: false, reason: "いま戦闘中です" };
  const tier = dungeonCleared(game, kind) + 1;
  const t = def.tiers[tier - 1];
  if (!t) return { game, ok: false, reason: "すべての段階を突破しています" };
  const allies = allySpecs(game, ctx);
  if (allies.length === 0) return { game, ok: false, reason: "編成に団員がいません" };
  const g = clone(game);
  const enemies = enemySpecs(t.stage, ctx);
  const companion = companionSpec(g, ctx);
  const rng = createRng(g.rngState);
  const replay = runBattle(allies, enemies, ctx.params.battle, rng, true, companion);
  g.rngState = rng.state();
  const bp = ctx.params.battle;
  const startedAtMs = nowMs + Math.round(bp.introSec * 1000);
  const endsAtMs = startedAtMs + Math.max(1000, Math.round(replay.durationSec * 1000));
  const resolveAtMs = endsAtMs + Math.round(bp.resultSec * 1000);
  g.battle = { stage: t.stage, startedAtMs, endsAtMs, resolveAtMs, win: replay.win, timedOut: replay.timedOut, dungeon: { kind, tier } };
  g.stats.battles += 1;
  g.stats.actions += 1;
  return { game: g, ok: true, stage: t.stage, startedAtMs, endsAtMs, replay, allies, enemies, companion };
}

export interface SweepResult extends ActionResult {
  tier?: number;
  got?: DungeonGot;
}

/** 清掃: 突破した、いちばん上の段階の報酬（初回より少ない）を、戦わずに受け取る。1日の回数に限りがある。 */
export function sweepDungeon(game: GameData, kind: string, ctx: Content): SweepResult {
  const def = dungeonDef(kind, ctx);
  if (!def) return { game, ok: false, reason: "そのダンジョンはありません" };
  if (!dungeonUnlocked(game, kind, ctx)) return { game, ok: false, reason: `${stageLabel(def.unlockStage, ctx.params)} を突破すると開きます` };
  const tier = dungeonCleared(game, kind);
  const t = def.tiers[tier - 1];
  if (tier === 0 || !t) return { game, ok: false, reason: "まだ、突破した段階がありません" };
  if (sweepsLeft(game, kind, ctx) <= 0) return { game, ok: false, reason: "今日の清掃は、もう使い切りました" };
  const g = clone(game);
  const pr = dungeonProgress(g, kind);
  const used = pr.sweepDay === g.daily.dayKey ? pr.sweeps : 0;
  g.dungeons[kind] = { ...pr, sweeps: used + 1, sweepDay: g.daily.dayKey };
  const got = grantDungeon(g, t.sweep, ctx);
  g.stats.actions += 1;
  return { game: g, ok: true, tier, got };
}

// ---------------------------------------------------------------- 育成

export interface LevelPlan {
  ok: boolean;
  /** いまのレベル。 */
  from: number;
  /** 目標のレベル。 */
  target: number;
  /** 要るおひねり。 */
  cost: number;
  reason?: string;
}

/** 団員を、指定のレベルまで上げられるか。要るおひねりも返す。 */
export function levelPlan(g: GameData, id: string, target: number, ctx: Content): LevelPlan {
  const own = g.members[id];
  const def = ctx.byId[id];
  if (!own || !def) return { ok: false, from: 0, target, cost: 0, reason: "その団員はいません" };
  const cap = levelCap(def, own.plus, ctx.params);
  if (!Number.isInteger(target) || target <= own.level) {
    const atCap = own.level >= cap;
    return { ok: false, from: own.level, target, cost: 0, reason: atCap ? "レベルの上限です（昇格で伸びます）" : "いまより上のレベルを指定してください" };
  }
  const cost = levelCostTo(own.level, target, ctx.params);
  if (target > cap) return { ok: false, from: own.level, target, cost, reason: `レベルの上限は ${cap} です（昇格で伸びます）` };
  if (g.gold < cost) return { ok: false, from: own.level, target, cost, reason: "おひねりが足りません" };
  return { ok: true, from: own.level, target, cost };
}

/** いまのおひねりで上げられる、いちばん高いレベル（上げられなければ、いまのレベル）。 */
export function maxAffordableLevel(g: GameData, id: string, ctx: Content): number {
  const own = g.members[id];
  const def = ctx.byId[id];
  if (!own || !def) return 0;
  const cap = levelCap(def, own.plus, ctx.params);
  let level = own.level;
  let left = g.gold;
  while (level < cap) {
    const cost = levelCostTo(level, level + 1, ctx.params);
    if (cost > left) break;
    left -= cost;
    level += 1;
  }
  return level;
}

export interface LevelUpResult extends ActionResult {
  /** 上がったレベルの数。 */
  levels?: number;
}

/** 団員を、指定のレベルまで上げる（+1、+10、レベルの指定は、どれもこれを呼ぶ）。 */
export function levelUpTo(game: GameData, id: string, target: number, ctx: Content): LevelUpResult {
  const plan = levelPlan(game, id, target, ctx);
  if (!plan.ok) return { game, ok: false, reason: plan.reason };
  const g = clone(game);
  const levels = plan.target - plan.from;
  g.gold -= plan.cost;
  (g.members[id] as OwnedMember).level = plan.target;
  g.counters.levelUps += levels;
  g.daily.counters.levelUps += levels;
  g.stats.actions += 1;
  return { game: g, ok: true, levels };
}

export interface ResetInfo {
  ok: boolean;
  /** 戻ってくるおひねり。 */
  refund: number;
  reason?: string;
}

export function resetInfo(g: GameData, id: string, ctx: Content): ResetInfo {
  const own = g.members[id];
  if (!own) return { ok: false, refund: 0, reason: "その団員はいません" };
  if (own.level <= 1) return { ok: false, refund: 0, reason: "レベル1なので、リセットするものがありません" };
  return { ok: true, refund: levelCostTo(1, own.level, ctx.params) };
}

export interface ResetResult extends ActionResult {
  refund?: number;
}

/** 団員のレベルを1に戻す。レベル上げに使ったおひねりが、全部戻る。昇格と装備は、そのまま。 */
export function resetLevel(game: GameData, id: string, ctx: Content): ResetResult {
  const info = resetInfo(game, id, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  (g.members[id] as OwnedMember).level = 1;
  g.gold += info.refund;
  g.counters.resets += 1;
  g.stats.actions += 1;
  return { game: g, ok: true, refund: info.refund };
}

export interface PromoteInfo {
  ok: boolean;
  need: number;
  reason?: string;
}

export function promoteInfo(g: GameData, id: string, ctx: Content): PromoteInfo {
  const own = g.members[id];
  if (!own) return { ok: false, need: 0, reason: "その団員はいません" };
  if (own.plus >= maxPlus(ctx.params)) return { ok: false, need: 0, reason: "これ以上は昇格できません" };
  const need = ctx.params.member.shardsToPromote[own.plus] as number;
  if (own.shards < need) return { ok: false, need, reason: "かけらが足りません" };
  return { ok: true, need };
}

/** かけらを使って昇格する（+1 され、能力が上がり、レベルの上限が伸びる）。 */
export function promote(game: GameData, id: string, ctx: Content): ActionResult {
  const info = promoteInfo(game, id, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  const own = g.members[id] as OwnedMember;
  own.shards -= info.need;
  own.plus += 1;
  g.counters.promotes += 1;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

// ---------------------------------------------------------------- 勧誘

export interface RecruitRate {
  id: string;
  rate: number;
}

function bannerRarities(banner: BannerDef, ctx: Content, minStars: number): string[] {
  const usable = Object.keys(banner.weights).filter((r) => (banner.weights[r] ?? 0) > 0 && ctx.members.some((m) => m.rarity === r));
  const filtered = usable.filter((r) => (ctx.params.recruit.rarities[r]?.stars ?? 0) >= minStars);
  return filtered.length > 0 ? filtered : usable;
}

/** 勧誘での提供割合（画面に表示する）。団員ごと。 */
export function recruitRates(ctx: Content, bannerId: BannerId): RecruitRate[] {
  const banner = ctx.params.recruit.banners[bannerId];
  const used = bannerRarities(banner, ctx, 0);
  const totalRarity = used.reduce((a, r) => a + (banner.weights[r] ?? 0), 0);
  const out: RecruitRate[] = [];
  for (const r of used) {
    const group = ctx.members.filter((m) => m.rarity === r);
    const totalWeight = group.reduce((a, m) => a + (m.weight ?? 1), 0);
    for (const m of group) {
      out.push({ id: m.id, rate: ((banner.weights[r] ?? 0) / totalRarity) * ((m.weight ?? 1) / totalWeight) });
    }
  }
  return out;
}

/** 勧誘での、レア度ごとの割合。 */
export function recruitRarityRates(ctx: Content, bannerId: BannerId): { rarity: string; rate: number }[] {
  const banner = ctx.params.recruit.banners[bannerId];
  const used = bannerRarities(banner, ctx, 0);
  const total = used.reduce((a, r) => a + (banner.weights[r] ?? 0), 0);
  return used.map((r) => ({ rarity: r, rate: (banner.weights[r] ?? 0) / total }));
}

/** 天井まで、あと何回か（次の1回が確定なら 1。天井のない勧誘は null）。 */
export function pityLeft(g: GameData, bannerId: BannerId, ctx: Content): number | null {
  const banner = ctx.params.recruit.banners[bannerId];
  if (banner.pity <= 0) return null;
  return Math.max(1, banner.pity - (g.recruit.pity[bannerId] ?? 0));
}

function ticketsOf(g: GameData, bannerId: BannerId): number {
  return bannerId === "premium" ? g.premiumTickets : g.tickets;
}

export interface RecruitOutcome {
  id: string;
  /** すでにいる団員で、かけらになったか。 */
  duplicate: boolean;
}

export interface RecruitResult extends ActionResult {
  results?: RecruitOutcome[];
}

/** 勧誘する。count は 1（1回）か 10（10連）。チケットを count 枚使う。 */
export function recruit(game: GameData, bannerId: BannerId, count: number, ctx: Content): RecruitResult {
  const banner = ctx.params.recruit.banners[bannerId];
  if (!banner) return { game, ok: false, reason: "その勧誘はありません" };
  if (count !== 1 && count !== 10) return { game, ok: false, reason: "勧誘は、1回か10連です" };
  if (ticketsOf(game, bannerId) < count) return { game, ok: false, reason: bannerId === "premium" ? "高級チケットが足りません" : "通常チケットが足りません" };
  const g = clone(game);
  if (bannerId === "premium") g.premiumTickets -= count;
  else g.tickets -= count;

  // 最初の高級10連では、決まった団員（★3 の団員と、回復役）がかならず出る
  let forced: string[] = [];
  if (bannerId === "premium" && count === 10 && !g.recruit.firstTenDone) {
    forced = ctx.params.recruit.firstPremiumTen.slice(0, count);
    g.recruit.firstTenDone = true;
  }

  const rarities = ctx.params.recruit.rarities;
  const rng = createRng(g.rngState);
  const results: RecruitOutcome[] = [];
  let guaranteed = banner.tenGuaranteeStars <= 0;
  for (let i = 0; i < count; i++) {
    let def: MemberDef;
    const forcedId = forced[i];
    if (forcedId !== undefined) {
      def = ctx.byId[forcedId] as MemberDef;
    } else {
      let minStars = 0;
      // 天井: 対象が出ないままこの回になったら、かならず出す
      if (banner.pity > 0 && (g.recruit.pity[bannerId] ?? 0) + 1 >= banner.pity) minStars = banner.pityStars;
      // 10連の確定: 最後の1回まで出ていなければ、最後の1回でかならず出す
      if (count === 10 && !guaranteed && i === count - 1) minStars = Math.max(minStars, banner.tenGuaranteeStars);
      const pool = bannerRarities(banner, ctx, minStars);
      const rarity = pick(pool, (r) => banner.weights[r] ?? 0, rng.next());
      def = pick(
        ctx.members.filter((m) => m.rarity === rarity),
        (m) => m.weight ?? 1,
        rng.next(),
      );
    }
    const stars = rarities[def.rarity]?.stars ?? 0;
    if (stars >= banner.tenGuaranteeStars) guaranteed = true;
    if (banner.pity > 0) g.recruit.pity[bannerId] = stars >= banner.pityStars ? 0 : (g.recruit.pity[bannerId] ?? 0) + 1;

    const own = g.members[def.id];
    if (own) {
      own.shards += 1;
      results.push({ id: def.id, duplicate: true });
    } else {
      // 新しい団員は、レベル1から始まる
      g.members[def.id] = { level: 1, plus: 0, shards: 0 };
      results.push({ id: def.id, duplicate: false });
    }
  }
  g.rngState = rng.state();
  g.counters.recruits += count;
  g.daily.counters.recruits += count;
  g.stats.actions += 1;
  return { game: g, ok: true, results };
}

// ---------------------------------------------------------------- 編成

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
  if (g.stats.partyFullAtMs === null && g.party.every((x) => x !== null)) g.stats.partyFullAtMs = g.lastActiveMs;
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

// ---------------------------------------------------------------- 装備

function findEquip(g: GameData, uid: number): OwnedEquip | undefined {
  return g.equips.find((e) => e.uid === uid);
}

/** 装備を団員に付ける。同じ場所に付けていた装備は外れる。ほかの団員が付けていた装備なら、そちらから移る。 */
export function equipItem(game: GameData, uid: number, memberId: string, ctx: Content): ActionResult {
  const item = findEquip(game, uid);
  const def = item ? ctx.equipById[item.defId] : undefined;
  if (!item || !def) return { game, ok: false, reason: "その装備はありません" };
  if (!game.members[memberId]) return { game, ok: false, reason: "その団員はいません" };
  if (item.on === memberId) return { game, ok: false, reason: "すでに付けています" };
  const g = clone(game);
  for (const e of g.equips) {
    if (e.on === memberId && ctx.equipById[e.defId]?.slot === def.slot) e.on = null;
  }
  (findEquip(g, uid) as OwnedEquip).on = memberId;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

/** 装備を外す。 */
export function unequipItem(game: GameData, uid: number): ActionResult {
  const item = findEquip(game, uid);
  if (!item) return { game, ok: false, reason: "その装備はありません" };
  if (item.on === null) return { game, ok: false, reason: "付けていません" };
  const g = clone(game);
  (findEquip(g, uid) as OwnedEquip).on = null;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

export interface UnequipAllResult extends ActionResult {
  /** 外した数。 */
  removed?: number;
}

/** 団員が付けている装備を、全部外す（外したものは、ほかの団員の「おまかせ」に使える）。 */
export function unequipAll(game: GameData, memberId: string): UnequipAllResult {
  if (!game.members[memberId]) return { game, ok: false, reason: "その団員はいません" };
  const removed = game.equips.filter((e) => e.on === memberId).length;
  if (removed === 0) return { game, ok: false, reason: "装備を付けていません" };
  const g = clone(game);
  for (const e of g.equips) if (e.on === memberId) e.on = null;
  g.stats.actions += 1;
  return { game: g, ok: true, removed };
}

export interface EnhanceInfo {
  ok: boolean;
  /** 要るおひねり。 */
  gold: number;
  reason?: string;
}

export function enhanceInfo(g: GameData, uid: number, ctx: Content): EnhanceInfo {
  const item = findEquip(g, uid);
  const def = item ? ctx.equipById[item.defId] : undefined;
  if (!item || !def) return { ok: false, gold: 0, reason: "その装備はありません" };
  const p = ctx.params;
  const gold = Math.round(equipEnhanceMinutes(def, item.level, p) * idleGoldPerMin(Math.max(1, g.highestCleared), p));
  if (item.level >= equipLevelCap(def, p)) return { ok: false, gold, reason: "強化の上限です" };
  if (g.gold < gold) return { ok: false, gold, reason: "おひねりが足りません" };
  return { ok: true, gold };
}

/** 装備を1段階強化する（おひねりを使う）。強化は、付け替えても残る。 */
export function enhanceEquip(game: GameData, uid: number, ctx: Content): ActionResult {
  const info = enhanceInfo(game, uid, ctx);
  if (!info.ok) return { game, ok: false, reason: info.reason };
  const g = clone(game);
  g.gold -= info.gold;
  (findEquip(g, uid) as OwnedEquip).level += 1;
  g.counters.enhances += 1;
  g.daily.counters.enhances += 1;
  g.stats.actions += 1;
  return { game: g, ok: true };
}

/** 1人ぶんの「おまかせ」。pool に入っている装備の中から、場所ごとにいちばん良いものを付ける。付け替えた数を返す。 */
function autoEquipInto(g: GameData, memberId: string, ctx: Content, usable: (e: OwnedEquip) => boolean): number {
  let changed = 0;
  for (const slot of EQUIP_SLOTS) {
    let best: OwnedEquip | null = null;
    let bestBonus = -1;
    for (const e of g.equips) {
      const def = ctx.equipById[e.defId];
      if (!def || def.slot !== slot) continue;
      if (e.on !== memberId && !usable(e)) continue;
      const bonus = equipBonus(def, e.level, ctx.params);
      // 同じ良さなら、いま付けているものを優先し、その次に、先に手に入れたもの
      const better = bonus > bestBonus + 1e-12 || (Math.abs(bonus - bestBonus) <= 1e-12 && best !== null && best.on !== memberId && e.on === memberId);
      if (better) {
        best = e;
        bestBonus = bonus;
      }
    }
    if (best === null || best.on === memberId) continue;
    for (const e of g.equips) {
      if (e.on === memberId && ctx.equipById[e.defId]?.slot === slot) e.on = null;
    }
    best.on = memberId;
    changed += 1;
  }
  return changed;
}

export interface AutoEquipResult extends ActionResult {
  /** 付け替えた数。 */
  changed?: number;
}

/** 1人に「おまかせ装備」。だれも付けていない装備の中から、場所ごとにいちばん良いものを付ける。 */
export function autoEquip(game: GameData, memberId: string, ctx: Content): AutoEquipResult {
  if (!game.members[memberId]) return { game, ok: false, reason: "その団員はいません" };
  const g = clone(game);
  const changed = autoEquipInto(g, memberId, ctx, (e) => e.on === null);
  if (changed === 0) return { game, ok: false, reason: "いまより良い装備が、手持ちにありません" };
  g.stats.actions += 1;
  return { game: g, ok: true, changed };
}

/**
 * 編成の全員に「おまかせ装備」。編成の並び順に、場所ごとにいちばん良いものを付けていく。
 * だれも付けていない装備と、編成に入っていない団員が付けている装備を使う。
 */
export function autoEquipParty(game: GameData, ctx: Content): AutoEquipResult {
  const g = clone(game);
  let changed = 0;
  for (const id of g.party) {
    if (id === null) continue;
    changed += autoEquipInto(g, id, ctx, (e) => e.on === null || !g.party.includes(e.on));
  }
  if (changed === 0) return { game, ok: false, reason: "いまより良い装備が、手持ちにありません" };
  g.stats.actions += 1;
  return { game: g, ok: true, changed };
}

/** 1人の「おまかせ装備」で、付け替えが起きるか（画面の印に使う。状態は写さずに調べる）。 */
export function canAutoEquip(g: GameData, memberId: string, ctx: Content): boolean {
  if (!g.members[memberId]) return false;
  for (const slot of EQUIP_SLOTS) {
    let mine = -1;
    let bestFree = -1;
    for (const e of g.equips) {
      const def = ctx.equipById[e.defId];
      if (!def || def.slot !== slot) continue;
      const bonus = equipBonus(def, e.level, ctx.params);
      if (e.on === memberId) mine = bonus;
      else if (e.on === null && bonus > bestFree) bestFree = bonus;
    }
    if (bestFree > mine + 1e-12) return true;
  }
  return false;
}

/** 「おまかせ装備（編成の全員）」で、付け替えが起きるか（画面の印に使う）。 */
export function canAutoEquipParty(g: GameData, ctx: Content): boolean {
  return autoEquipParty(g, ctx).ok;
}

// ---------------------------------------------------------------- ミッションと日課

function missionProgress(kind: MissionKind, g: GameData): number {
  switch (kind) {
    case "clear":
      return g.highestCleared;
    case "memberLevel": {
      let max = 0;
      for (const m of Object.values(g.members)) if (m.level > max) max = m.level;
      return max;
    }
    case "partyLevel": {
      let sum = 0;
      for (const id of g.party) if (id !== null) sum += g.members[id]?.level ?? 0;
      return sum;
    }
    case "recruits":
      return g.counters.recruits;
    case "partySize":
      return g.party.filter((x) => x !== null).length;
    case "promotes":
      return g.counters.promotes;
    case "resets":
      return g.counters.resets;
    case "idleClaims":
      return g.counters.idleClaims;
    case "companions":
      return Object.keys(g.companions).length;
    case "companionEquipped":
      return g.companionSlot !== null ? 1 : 0;
    case "companionLevelUps":
      return g.counters.companionLevelUps;
    case "equipped":
      return equippedCount(g);
    case "enhances":
      return g.counters.enhances;
    case "dungeonTier": {
      let max = 0;
      for (const pr of Object.values(g.dungeons)) if (pr.cleared > max) max = pr.cleared;
      return max;
    }
  }
}

function dailyProgress(kind: DailyKind, g: GameData): number {
  if (kind === "dailyClaims") return g.daily.claims;
  if (kind === "sweeps") return sweepsToday(g);
  return g.daily.counters[kind];
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
  return COUNTER_KEYS.every((k) => isNum(v[k]) && (v[k] as number) >= 0);
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
  for (const k of ["startedAtMs", "lastActiveMs", "gold", "tickets", "premiumTickets", "highestCleared", "rngState", "nextEquipUid"]) {
    if (!isNum(v[k])) return false;
  }
  if ((v["gold"] as number) < 0 || (v["tickets"] as number) < 0 || (v["premiumTickets"] as number) < 0 || (v["highestCleared"] as number) < 0) return false;

  const members = v["members"];
  if (!isRecord(members) || Object.keys(members).length === 0) return false;
  for (const m of Object.values(members)) {
    if (!isRecord(m) || !isNum(m["level"]) || !isNum(m["plus"]) || !isNum(m["shards"])) return false;
    if (m["level"] < 1 || m["plus"] < 0 || m["shards"] < 0) return false;
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

  const equips = v["equips"];
  if (!Array.isArray(equips)) return false;
  const uids = new Set<number>();
  for (const e of equips) {
    if (!isRecord(e) || !isNum(e["uid"]) || typeof e["defId"] !== "string" || !isNum(e["level"]) || e["level"] < 0) return false;
    if (e["on"] !== null && !(typeof e["on"] === "string" && e["on"] in members)) return false;
    if (uids.has(e["uid"]) || e["uid"] >= (v["nextEquipUid"] as number)) return false;
    uids.add(e["uid"]);
  }

  const b = v["battle"];
  if (b !== null) {
    if (!isRecord(b) || !isNum(b["stage"]) || !isNum(b["startedAtMs"]) || !isNum(b["endsAtMs"]) || !isNum(b["resolveAtMs"])) return false;
    if (typeof b["win"] !== "boolean" || typeof b["timedOut"] !== "boolean") return false;
  }
  const idle = v["idle"];
  if (!isRecord(idle) || !isNum(idle["windowStartMs"]) || !isNum(idle["anchorMs"]) || !isNum(idle["gold"]) || !isNumberMap(idle["mats"]) || !isNum(idle["equip"])) return false;
  if (!isCounters(v["counters"]) || !isStringList(v["missionsClaimed"])) return false;
  const rec = v["recruit"];
  if (!isRecord(rec) || !isNumberMap(rec["pity"]) || typeof rec["firstTenDone"] !== "boolean") return false;
  const daily = v["daily"];
  if (!isRecord(daily) || !isNum(daily["dayKey"]) || !isNum(daily["claims"]) || !isCounters(daily["counters"]) || !isStringList(daily["claimed"])) return false;

  // ダンジョンは、あとから足したもの。古いセーブにはないので、あるときだけ形を確かめる
  const dg = v["dungeons"];
  if (dg !== undefined) {
    if (!isRecord(dg)) return false;
    for (const d of Object.values(dg)) {
      if (!isRecord(d) || !isNum(d["cleared"]) || !isNum(d["sweeps"]) || !isNum(d["sweepDay"]) || d["cleared"] < 0 || d["sweeps"] < 0) return false;
    }
  }

  const s = v["stats"];
  if (!isRecord(s)) return false;
  for (const k of ["battles", "wins", "defeats", "actions", "lastProgressAtMs", "longestStallMs"]) {
    if (!isNum(s[k])) return false;
  }
  for (const k of ["firstDefeatAtMs", "firstCompanionAtMs", "partyFullAtMs"]) {
    if (s[k] !== null && !isNum(s[k])) return false;
  }
  return true;
}

/**
 * 団員・相棒・装備の定義が変わったあとでも動くように、セーブを整える。
 * 定義から消えたものを外し、編成が空になったら、持っている団員で埋める。
 */
export function sanitizeGame(game: GameData, ctx: Content): GameData {
  const g = clone(game);
  for (const id of Object.keys(g.members)) {
    if (!ctx.byId[id]) delete g.members[id];
  }
  g.party = g.party.map((id) => (id !== null && g.members[id] ? id : null));
  if (Object.keys(g.members).length === 0) {
    for (const m of ctx.members.filter((d) => d.starter)) g.members[m.id] = { level: 1, plus: 0, shards: 0 };
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
  g.equips = g.equips.filter((e) => ctx.equipById[e.defId] !== undefined);
  for (const e of g.equips) {
    if (e.on !== null && !g.members[e.on]) e.on = null;
  }
  g.highestCleared = Math.min(g.highestCleared, totalStages(ctx.params));
  // ダンジョン: 定義から消えた種類を外し、段階を定義の数に収める
  const dungeons: Record<string, DungeonProgress> = {};
  for (const d of ctx.params.dungeon.kinds) {
    const pr = g.dungeons[d.id];
    if (pr) dungeons[d.id] = { cleared: Math.min(Math.max(0, Math.floor(pr.cleared)), d.tiers.length), sweeps: Math.max(0, Math.floor(pr.sweeps)), sweepDay: pr.sweepDay };
  }
  g.dungeons = dungeons;
  if (g.battle !== null) {
    const bd = g.battle.dungeon;
    const ok = bd ? dungeonDef(bd.kind, ctx)?.tiers[bd.tier - 1] !== undefined && bd.tier === dungeonCleared(g, bd.kind) + 1 : g.battle.stage === g.highestCleared + 1;
    if (!ok) g.battle = null;
  }
  return g;
}
