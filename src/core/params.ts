// 数値のパラメータと、団員の定義。
//
// 数値は式に直接書かず、ここで定義した Params（params/base.json）から受け取る。
// 団員は「データ1行」で定義する（params/members.json）。行を足せば団員が増える。

export interface Params {
  battle: {
    timeLimitSec: number;
    gaugeMax: number;
    gaugePerAttack: number;
    damageVariance: number;
    /** 戦闘と戦闘のあいだの秒数。 */
    interBattleSec: number;
    /** 新しい面に進んだときの、面の紹介の秒数（同じ面のくり返しでは入らない）。 */
    stageIntroSec: number;
    rallySec: number;
  };
  member: {
    baseHp: number;
    baseAtk: number;
    levelGrowth: number;
    starBonus: number;
    levelCapBase: number;
    levelCapPerStar: number;
    levelCostBase: number;
    levelCostGrowth: number;
    shardsToPromote: number[];
    /** 新しく入った団員を、いまの編成でいちばん低いレベルに合わせるか。 */
    joinAtPartyMinLevel: boolean;
  };
  enemy: {
    baseHp: number;
    baseAtk: number;
    stageGrowth: number;
    /** 章ごとの倍率（1章目から順に。書かれていない章は 1）。章の性格づけと、進む速さの調整に使う。 */
    chapterHpMult: number[];
    chapterAtkMult: number[];
    count: number;
    intervalSec: number;
    bossHpMult: number;
    bossAtkMult: number;
    bossIntervalSec: number;
    bossSkillPower: number;
  };
  economy: {
    goldPerWinBase: number;
    goldGrowth: number;
    bossGoldMult: number;
    offlineWinsPerMin: number;
    idleCapHours: number;
    ticketEveryStages: number;
    monsterShardOffset: number;
  };
  progress: {
    chapters: number;
    stagesPerChapter: number;
    onlineGapSec: number;
  };
  recruit: {
    firstId: string;
  };
}

export type SkillType = "strike" | "aoe" | "heal" | "healall" | "selfheal" | "rally";

export interface Skill {
  type: SkillType;
  power: number;
}

export type MemberKind = "human" | "monster";
export type MemberRole = "tank" | "attacker" | "healer" | "support";

export interface MemberDef {
  id: string;
  name: string;
  kind: MemberKind;
  role: MemberRole;
  /** 基準値に対する倍率。 */
  hp: number;
  atk: number;
  /** 攻撃の間隔（秒）。 */
  interval: number;
  skill: Skill;
  /** 最初から持っている団員。 */
  starter?: boolean;
  /** 魔物の団員: この章のボスを初めて倒すと入団する。 */
  joinChapter?: number;
  /** 勧誘での出やすさ（省略すると 1）。 */
  weight?: number;
}

/** ルールが使うデータ一式。 */
export interface Content {
  params: Params;
  members: MemberDef[];
  byId: Record<string, MemberDef>;
}

export function buildContent(params: Params, members: MemberDef[]): Content {
  const byId: Record<string, MemberDef> = {};
  for (const m of members) {
    if (byId[m.id]) throw new Error(`団員のIDが重複しています: ${m.id}`);
    byId[m.id] = m;
  }
  if (!byId[params.recruit.firstId]) throw new Error(`最初の勧誘で出る団員がいません: ${params.recruit.firstId}`);
  if (members.filter((m) => m.starter).length === 0) throw new Error("最初から持っている団員がいません");
  if (members.filter((m) => m.kind === "human").length === 0) throw new Error("勧誘で出る団員がいません");
  return { params, members, byId };
}

/** base の n 乗。Math.pow は環境で末尾の桁が変わりうるので、掛け算で求める。 */
export function powInt(base: number, n: number): number {
  let out = 1;
  for (let i = 0; i < n; i++) out *= base;
  return out;
}

export function totalStages(p: Params): number {
  return p.progress.chapters * p.progress.stagesPerChapter;
}

/** 面の通し番号（1始まり）が、章の最後（ボス）か。 */
export function isBossStage(stage: number, p: Params): boolean {
  return stage % p.progress.stagesPerChapter === 0;
}

export function chapterOf(stage: number, p: Params): number {
  return Math.floor((stage - 1) / p.progress.stagesPerChapter) + 1;
}

/** 「1-3」のような表示。 */
export function stageLabel(stage: number, p: Params): string {
  return `${chapterOf(stage, p)}-${((stage - 1) % p.progress.stagesPerChapter) + 1}`;
}

/** その面で1回勝ったときのおひねり。 */
export function goldPerWin(stage: number, p: Params): number {
  const base = p.economy.goldPerWinBase * powInt(p.economy.goldGrowth, stage - 1);
  return Math.round(base * (isBossStage(stage, p) ? p.economy.bossGoldMult : 1));
}

/** 画面を閉じている間の、1分あたりのおひねり。これまでの最高到達面で決まる。 */
export function offlineGoldPerMin(highestCleared: number, p: Params): number {
  const stage = Math.max(1, highestCleared);
  return p.economy.goldPerWinBase * powInt(p.economy.goldGrowth, stage - 1) * p.economy.offlineWinsPerMin;
}

/** レベル level から level+1 へ上げる費用。 */
export function levelCost(level: number, p: Params): number {
  return Math.round(p.member.levelCostBase * powInt(p.member.levelCostGrowth, level - 1));
}

export function levelCap(star: number, p: Params): number {
  return p.member.levelCapBase + p.member.levelCapPerStar * star;
}

export function maxStar(p: Params): number {
  return p.member.shardsToPromote.length;
}

export interface Stats {
  hp: number;
  atk: number;
}

/** 団員の能力。レベルと★で伸びる。 */
export function memberStats(def: MemberDef, level: number, star: number, p: Params): Stats {
  // レベルが1上がるごとに、一定の割合で伸びる（掛け算）。★は足し算で上乗せする。
  const grow = powInt(1 + p.member.levelGrowth, level - 1) * (1 + p.member.starBonus * star);
  return {
    hp: Math.round(p.member.baseHp * def.hp * grow),
    atk: Math.round(p.member.baseAtk * def.atk * grow),
  };
}

/** 団員1人の強さの目安（編成の比較や表示に使う）。 */
export function memberPower(def: MemberDef, level: number, star: number, p: Params): number {
  const s = memberStats(def, level, star, p);
  return Math.round(s.hp * 0.2 + (s.atk / def.interval) * 6);
}
