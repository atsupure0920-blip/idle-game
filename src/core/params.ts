// 数値のパラメータと、団員・相棒・装備・ミッションの定義（第3版）。
//
// 数値は式に直接書かず、ここで定義した Params（params/base.json）から受け取る。
// 団員、相棒、装備、ミッション、日課は「データ1行」で定義する（params/*.json）。行を足せば増える。

export interface Params {
  battle: {
    timeLimitSec: number;
    gaugeMax: number;
    gaugePerAttack: number;
    damageVariance: number;
    rallySec: number;
    /** 挑戦を押してから、戦闘が始まるまでの間（面の紹介）。 */
    introSec: number;
    /** 戦闘が終わってから、結果が反映されるまでの間（勝ち負けの表示）。 */
    resultSec: number;
  };
  member: {
    baseHp: number;
    baseAtk: number;
    levelGrowth: number;
    /** 昇格（+1）1つごとの、能力の上乗せ。 */
    promoteBonus: number;
    /** 昇格1つごとに伸びる、レベルの上限。 */
    levelCapPerPromote: number;
    levelCostBase: number;
    levelCostGrowth: number;
    /** 昇格に要る「かけら」の数（+1 にするとき、+2 にするとき…）。 */
    shardsToPromote: number[];
  };
  enemy: {
    baseHp: number;
    baseAtk: number;
    /**
     * 面が1つ進むごとの、敵の伸び。面ごとに決める（2面目から順に。足りない分は最後の値）。
     * 進む速さの山と谷（どこで止まり始め、どこが大きな壁か）は、ここで作る。
     */
    stageGrowth: number[];
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
    /** 放置報酬: 1面を突破した状態での、1分あたりのおひねり。 */
    idleGoldBase: number;
    /** 最高到達面が1つ進むごとの、放置報酬の伸び。 */
    idleGoldGrowth: number;
    idleCapHours: number;
    /** 初クリア報酬のおひねり: その面の放置報酬の「何分ぶん」か（1面目から順に。足りない分は最後の値）。 */
    firstClearMinutes: number[];
    /** 初クリア報酬に通常チケットが付く面（通し番号）。 */
    ticketStages: number[];
    /** 初クリア報酬の、相棒の素材（持っている相棒それぞれに）。 */
    firstClearMats: number;
  };
  companion: {
    levelCap: number;
    /** レベル上げの費用（おひねり）: その時点の放置報酬の「何分ぶん」か。レベルごとに伸びる。 */
    costMinutesBase: number;
    costMinutesGrowth: number;
    /** レベル上げに要る専用の素材。レベルごとに伸びる。 */
    matBase: number;
    matGrowth: number;
    /** 放置でたまる専用の素材（持っている相棒それぞれ、1時間あたり）。 */
    matPerHour: number;
    /** レベル1つごとの、技の伸び。 */
    skillGrowth: number;
  };
  equipment: {
    /** 装備のレア度（★の数 → 効果）。 */
    rarities: Record<string, EquipRarityDef>;
    /** 強化の費用（おひねり）: その時点の放置報酬の「何分ぶん」か。強化の段階ごとに伸びる。 */
    enhanceMinutesBase: number;
    enhanceMinutesGrowth: number;
    /** 手に入る装備の ★ の出やすさ。章ごと（1章目から順に。足りない分は最後の値）に、★1・★2・★3 の順。 */
    dropWeights: number[][];
    /** 初クリア報酬で、装備が1つ手に入る（0 なら出ない）。 */
    firstClearCount: number;
    /** 箱に装備が1つたまるまでの時間。 */
    idleHoursPerItem: number;
  };
  progress: {
    chapters: number;
    stagesPerChapter: number;
  };
  recruit: {
    /** レア度ごとの、★の数・能力の倍率・レベルの上限。 */
    rarities: Record<string, RarityDef>;
    /** 勧誘の種類（通常、高級）。 */
    banners: Record<BannerId, BannerDef>;
    /** 最初の高級10連で、かならず出る団員（★3 の団員と、回復役）。 */
    firstPremiumTen: string[];
  };
}

export interface RarityDef {
  /** 画面に出す名前（「★3 エリート」など）。 */
  label: string;
  /** ★の数。 */
  stars: number;
  /** ★3 の中の「エリート」か。 */
  elite: boolean;
  /** 能力の倍率。 */
  statMult: number;
  /** レベルの上限（昇格で伸びる前の値）。 */
  levelCap: number;
}

export type BannerId = "normal" | "premium";

export interface BannerDef {
  /** 画面に出す名前。 */
  label: string;
  /** レア度ごとの出やすさ（書かれていないレア度は出ない）。 */
  weights: Record<string, number>;
  /** 10連で、この ★ 以上が1体かならず出る（0 なら確定なし）。 */
  tenGuaranteeStars: number;
  /** 天井: pityStars 以上が出ないままこの回数になると、その回でかならず出る（0 なら天井なし）。 */
  pity: number;
  pityStars: number;
}

export interface EquipRarityDef {
  /** ★の数。 */
  stars: number;
  /** 強化していないときの上乗せ（割合）。 */
  bonus: number;
  /** 強化1段階ごとの上乗せ。 */
  bonusPerLevel: number;
  /** 強化の上限。 */
  levelCap: number;
  /** 強化の費用の倍率。 */
  costMult: number;
}

export type SkillType = "strike" | "aoe" | "heal" | "healall" | "selfheal" | "rally";

export interface Skill {
  type: SkillType;
  power: number;
}

/**
 * 戦闘での持ち味（なくてもよい）。
 *   taunt    … 挑発。生きている間、相手はこの団員を先に狙う
 *   backline … 後列ねらい。相手の後列を先に狙う
 */
export type Trait = "taunt" | "backline";

export type MemberRole = "tank" | "attacker" | "healer" | "support";

export interface MemberDef {
  id: string;
  name: string;
  role: MemberRole;
  /** レア度（params.recruit.rarities の名前）。 */
  rarity: string;
  /** 基準値に対する倍率。 */
  hp: number;
  atk: number;
  /** 攻撃の間隔（秒）。 */
  interval: number;
  skill: Skill;
  /** 戦闘での持ち味（挑発、後列ねらい）。 */
  trait?: Trait;
  /** 最初から持っている団員。 */
  starter?: boolean;
  /** 同じレア度の中での出やすさ（省略すると 1）。 */
  weight?: number;
}

/** 相棒。各章のボスが、倒されると相棒になる。 */
export interface CompanionDef {
  id: string;
  name: string;
  /** この章のボス。初めて倒すと相棒になる。 */
  chapter: number;
  /** 戦闘中に使う技（団員の平均の攻撃をもとにする）。 */
  skill: Skill;
  /** 技を使う間隔（秒）。 */
  interval: number;
  /** 持っているだけでかかる底上げ（レベル1つごとの割合）。 */
  passiveHp: number;
  passiveAtk: number;
  /** 専用の素材の名前。 */
  material: string;
}

/** 装備を付ける場所。武器と小道具は攻撃、衣装とお守りは体力が上がる。 */
export type EquipSlot = "weapon" | "costume" | "prop" | "charm";
export const EQUIP_SLOTS: readonly EquipSlot[] = ["weapon", "costume", "prop", "charm"];
export const EQUIP_STAT: Record<EquipSlot, "hp" | "atk"> = { weapon: "atk", costume: "hp", prop: "atk", charm: "hp" };

/** 装備の種類。 */
export interface EquipDef {
  id: string;
  name: string;
  slot: EquipSlot;
  /** ★の数（params.equipment.rarities の名前）。 */
  stars: number;
}

export interface Reward {
  /** おひねり（そのままの数）。 */
  gold?: number;
  /** おひねり（受け取る時点の放置報酬の「何分ぶん」か）。 */
  goldMin?: number;
  /** 通常チケット。 */
  tickets?: number;
  /** 高級チケット。 */
  premiumTickets?: number;
  /** 相棒の素材（持っている相棒それぞれに）。 */
  mats?: number;
}

/** 一度きりのミッションの種類。 */
export type MissionKind =
  | "clear" // 突破した面の数
  | "memberLevel" // いちばんレベルの高い団員のレベル
  | "partyLevel" // 編成の団員のレベルの合計
  | "recruits" // 勧誘した回数（通常と高級の合計）
  | "partySize" // 編成に入れている団員の数
  | "promotes" // 昇格した回数
  | "resets" // リセットした回数
  | "idleClaims" // 放置報酬を受け取った回数
  | "companions" // 持っている相棒の数
  | "companionEquipped" // 相棒を編成に入れている（1 か 0）
  | "companionLevelUps" // 相棒のレベルを上げた回数
  | "equipped" // 編成の団員が付けている装備の数
  | "enhances"; // 装備を強化した回数

/** 日課の種類（その日のうちの回数）。 */
export type DailyKind = "challenges" | "levelUps" | "recruits" | "idleClaims" | "companionLevelUps" | "enhances" | "dailyClaims";

export interface MissionDef {
  id: string;
  text: string;
  kind: MissionKind;
  target: number;
  reward: Reward;
}

export interface DailyDef {
  id: string;
  text: string;
  kind: DailyKind;
  target: number;
  reward: Reward;
}

/** ルールが使うデータ一式。 */
export interface Content {
  params: Params;
  members: MemberDef[];
  byId: Record<string, MemberDef>;
  companions: CompanionDef[];
  companionById: Record<string, CompanionDef>;
  equipment: EquipDef[];
  equipById: Record<string, EquipDef>;
  missions: MissionDef[];
  dailies: DailyDef[];
}

export interface ContentData {
  params: Params;
  members: MemberDef[];
  companions: CompanionDef[];
  equipment: EquipDef[];
  missions: MissionDef[];
  dailies: DailyDef[];
}

function index<T extends { id: string }>(list: T[], what: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of list) {
    if (out[item.id]) throw new Error(`${what}のIDが重複しています: ${item.id}`);
    out[item.id] = item;
  }
  return out;
}

export function buildContent(data: ContentData): Content {
  const { params, members, companions, equipment, missions, dailies } = data;
  const byId = index(members, "団員");
  const companionById = index(companions, "相棒");
  const equipById = index(equipment, "装備");
  index(missions, "ミッション");
  index(dailies, "日課");
  for (const id of Object.keys(companionById)) {
    if (byId[id]) throw new Error(`団員と相棒でIDが重複しています: ${id}`);
  }
  if (members.filter((m) => m.starter).length === 0) throw new Error("最初から持っている団員がいません");
  for (const m of members) {
    if (!params.recruit.rarities[m.rarity]) throw new Error(`団員 ${m.id} のレア度が定義されていません: ${m.rarity}`);
  }
  for (const id of params.recruit.firstPremiumTen) {
    if (!byId[id]) throw new Error(`最初の高級10連で出る団員がいません: ${id}`);
  }
  for (const [name, banner] of Object.entries(params.recruit.banners)) {
    const usable = Object.keys(banner.weights).filter((r) => (banner.weights[r] ?? 0) > 0);
    if (usable.length === 0) throw new Error(`勧誘「${name}」から出るレア度がありません`);
    for (const r of usable) {
      if (!params.recruit.rarities[r]) throw new Error(`勧誘「${name}」のレア度が定義されていません: ${r}`);
      if (!members.some((m) => m.rarity === r)) throw new Error(`勧誘「${name}」のレア度 ${r} に、団員がいません`);
    }
  }
  for (const e of equipment) {
    if (!params.equipment.rarities[String(e.stars)]) throw new Error(`装備 ${e.id} の ★ が定義されていません: ${e.stars}`);
    if (!EQUIP_SLOTS.includes(e.slot)) throw new Error(`装備 ${e.id} の場所が正しくありません: ${String(e.slot)}`);
  }
  return { params, members, byId, companions, companionById, equipment, equipById, missions, dailies };
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

/** その面の敵の強さの倍率（1面目を1として、面ごとの伸びを掛け合わせたもの）。 */
export function enemyGrowth(stage: number, p: Params): number {
  const table = p.enemy.stageGrowth;
  let out = 1;
  for (let s = 2; s <= stage; s++) {
    out *= table.length === 0 ? 1 : (table[Math.min(s - 1, table.length) - 1] as number);
  }
  return out;
}

/** 放置報酬の、1分あたりのおひねり。これまでの最高到達面で決まる（1面も突破していないうちは、1面のぶん）。 */
export function idleGoldPerMin(highestCleared: number, p: Params): number {
  return p.economy.idleGoldBase * powInt(p.economy.idleGoldGrowth, Math.max(0, highestCleared - 1));
}

/** その面の初クリア報酬のおひねり。 */
export function firstClearGold(stage: number, p: Params): number {
  const table = p.economy.firstClearMinutes;
  const minutes = table.length === 0 ? 0 : (table[Math.min(stage, table.length) - 1] as number);
  return Math.round(idleGoldPerMin(stage, p) * minutes);
}

/** レベル level から level+1 へ上げる費用。 */
export function levelCost(level: number, p: Params): number {
  return Math.round(p.member.levelCostBase * powInt(p.member.levelCostGrowth, level - 1));
}

/** レベル from から to まで上げる費用の合計（リセットで戻る量も、これで求める）。 */
export function levelCostTo(from: number, to: number, p: Params): number {
  let sum = 0;
  for (let l = from; l < to; l++) sum += levelCost(l, p);
  return sum;
}

/** レベルの上限。レア度で決まり、昇格で伸びる。 */
export function levelCap(def: MemberDef, plus: number, p: Params): number {
  return (p.recruit.rarities[def.rarity]?.levelCap ?? 1) + p.member.levelCapPerPromote * plus;
}

/** 昇格の上限（+いくつまで）。 */
export function maxPlus(p: Params): number {
  return p.member.shardsToPromote.length;
}

export interface Stats {
  hp: number;
  atk: number;
}

/** 団員の能力（相棒の底上げと装備を含まない素の値）。レベルと昇格とレア度で決まる。 */
export function memberStats(def: MemberDef, level: number, plus: number, p: Params): Stats {
  // レベルが1上がるごとに、一定の割合で伸びる（掛け算）。昇格は足し算で上乗せする。
  const rarity = p.recruit.rarities[def.rarity]?.statMult ?? 1;
  const grow = powInt(1 + p.member.levelGrowth, level - 1) * (1 + p.member.promoteBonus * plus) * rarity;
  return {
    hp: Math.round(p.member.baseHp * def.hp * grow),
    atk: Math.round(p.member.baseAtk * def.atk * grow),
  };
}

/** 能力から求める、強さの目安（編成の比較や表示に使う）。 */
export function powerOf(stats: Stats, interval: number): number {
  return Math.round(stats.hp * 0.2 + (stats.atk / interval) * 6);
}

/** 団員1人の強さの目安（素の値）。 */
export function memberPower(def: MemberDef, level: number, plus: number, p: Params): number {
  return powerOf(memberStats(def, level, plus, p), def.interval);
}

/** 相棒のレベルを level から level+1 へ上げるのに要る、専用の素材。 */
export function companionMatCost(level: number, p: Params): number {
  return Math.round(p.companion.matBase * powInt(p.companion.matGrowth, level - 1));
}

/** 相棒のレベル上げのおひねり: その時点の放置報酬の何分ぶんか。 */
export function companionCostMinutes(level: number, p: Params): number {
  return p.companion.costMinutesBase * powInt(p.companion.costMinutesGrowth, level - 1);
}

/** 相棒の技の倍率（レベルで伸びる）。 */
export function companionSkillPower(def: CompanionDef, level: number, p: Params): number {
  return def.skill.power * (1 + p.companion.skillGrowth * (level - 1));
}

/** 装備の上乗せ（割合）。★と強化の段階で決まる。 */
export function equipBonus(def: EquipDef, level: number, p: Params): number {
  const r = p.equipment.rarities[String(def.stars)];
  return r ? r.bonus + r.bonusPerLevel * level : 0;
}

/** 装備の強化の上限。 */
export function equipLevelCap(def: EquipDef, p: Params): number {
  return p.equipment.rarities[String(def.stars)]?.levelCap ?? 0;
}

/** 装備を level から level+1 へ強化する費用: その時点の放置報酬の何分ぶんか。 */
export function equipEnhanceMinutes(def: EquipDef, level: number, p: Params): number {
  const mult = p.equipment.rarities[String(def.stars)]?.costMult ?? 1;
  return p.equipment.enhanceMinutesBase * powInt(p.equipment.enhanceMinutesGrowth, level) * mult;
}

/** その章で手に入る装備の、★ごとの出やすさ（★1、★2、★3 の順）。 */
export function equipDropWeights(chapter: number, p: Params): number[] {
  const table = p.equipment.dropWeights;
  return table.length === 0 ? [1] : (table[Math.min(chapter, table.length) - 1] as number[]);
}
