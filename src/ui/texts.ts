// 画面に出す言葉。数値の計算はしない（core が返した値を、言葉にするだけ）。

import type { BattleEventKind } from "../core/battle.ts";
import type { RewardAmounts } from "../core/game.ts";
import { EQUIP_STAT, equipBonus } from "../core/params.ts";
import type { CompanionDef, Content, EquipDef, EquipSlot, MemberDef, MemberRole, Params, Skill, Trait } from "../core/params.ts";

export const ROLE_LABEL: Record<MemberRole, string> = {
  tank: "盾役",
  attacker: "攻撃役",
  healer: "回復役",
  support: "支援役",
};

export const TRAIT_LABEL: Record<Trait, string> = {
  taunt: "挑発",
  backline: "後列ねらい",
};

export const TRAIT_TEXT: Record<Trait, string> = {
  taunt: "生きている間、敵はこの団員を先に狙う。",
  backline: "敵の後列を先に狙う。",
};

/** 技の名前（戦闘中に、技を使った者の上に出す）。 */
export const SKILL_LABEL: Record<Skill["type"], string> = {
  strike: "強打",
  aoe: "全体攻撃",
  heal: "回復",
  healall: "全体回復",
  selfheal: "立て直し",
  rally: "鼓舞",
};

const percent = (v: number): string => `${Math.round(v * 100)}%`;
/** 倍率などを、小数2桁までで出す（1.60 → 1.6）。 */
const times = (v: number): string => String(Math.round(v * 100) / 100);

export function skillText(skill: Skill, rallySec: number): string {
  switch (skill.type) {
    case "strike":
      return `敵1体に、攻撃の ${times(skill.power)}倍 のダメージ。`;
    case "aoe":
      return `敵全員に、攻撃の ${times(skill.power)}倍 のダメージ。`;
    case "heal":
      return `いちばん傷ついた味方を、攻撃の ${times(skill.power)}倍 回復。`;
    case "healall":
      return `味方全員を、攻撃の ${times(skill.power)}倍 回復。`;
    case "selfheal":
      return `自分の体力を、最大の ${percent(skill.power)} 回復。`;
    case "rally":
      return `${rallySec}秒間、味方全員の与えるダメージが ${percent(skill.power)} 増える。`;
  }
}

/** 相棒の技の説明。power は、レベルを反映した倍率。相棒の技は、団員の平均の攻撃をもとにする。 */
export function companionSkillText(def: CompanionDef, power: number, rallySec: number): string {
  const every = `${def.interval}秒ごとに、`;
  switch (def.skill.type) {
    case "strike":
      return `${every}敵1体に、団員の平均の攻撃の ${times(power)}倍 のダメージ。`;
    case "aoe":
      return `${every}敵全員に、団員の平均の攻撃の ${times(power)}倍 のダメージ。`;
    case "rally":
      return `${every}${rallySec}秒間、味方全員の与えるダメージが ${percent(power)} 増える。`;
    default:
      return `${every}味方全員を、団員の平均の攻撃の ${times(power)}倍 回復。`;
  }
}

/** 相棒の底上げの説明（持っているだけでかかる）。 */
export function passiveText(def: CompanionDef, level: number): string {
  const parts: string[] = [];
  if (def.passiveHp > 0) parts.push(`体力 +${percent(def.passiveHp * level)}`);
  if (def.passiveAtk > 0) parts.push(`攻撃 +${percent(def.passiveAtk * level)}`);
  return parts.length === 0 ? "なし" : `団員全員の ${parts.join("、")}`;
}

/** 報酬の中身を、言葉にする。 */
export function rewardText(r: RewardAmounts): string {
  const parts: string[] = [];
  if (r.gold > 0) parts.push(`おひねり ${formatNumber(r.gold)}`);
  if (r.premiumTickets > 0) parts.push(`高級チケット ${r.premiumTickets}枚`);
  if (r.tickets > 0) parts.push(`通常チケット ${r.tickets}枚`);
  if (r.mats > 0) parts.push(`相棒の素材 ${r.mats}こ`);
  return parts.length === 0 ? "なし" : parts.join("、");
}

/** ★の並び（★3 なら「★★★」）。 */
export function starsText(n: number): string {
  return "★".repeat(Math.max(0, n));
}

/** 団員のレア度の表示（「★★★ エリート」など）。 */
export function rarityText(def: MemberDef, p: Params): string {
  const r = p.recruit.rarities[def.rarity];
  if (!r) return "";
  return `${starsText(r.stars)}${r.elite ? " エリート" : ""}`;
}

/** 昇格の表示（「+2」。昇格していなければ空）。 */
export function plusText(plus: number): string {
  return plus > 0 ? `+${plus}` : "";
}

export const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: "武器",
  costume: "衣装",
  prop: "小道具",
  charm: "お守り",
};

/** 装備の名前（「舞台の剣 ★★ +2」）。 */
export function equipName(def: EquipDef, level: number): string {
  return `${def.name} ${starsText(def.stars)}${level > 0 ? ` +${level}` : ""}`;
}

/** 装備の効果（「攻撃 +8%」）。 */
export function equipEffectText(def: EquipDef, level: number, p: Params): string {
  const bonus = equipBonus(def, level, p);
  return `${EQUIP_STAT[def.slot] === "hp" ? "体力" : "攻撃"} +${Math.round(bonus * 1000) / 10}%`;
}

/** 戦闘の出来事が「技」なら、その名前。通常の攻撃や戦闘不能なら null。 */
export function skillLabelOf(kind: BattleEventKind): string | null {
  if (kind === "attack" || kind === "down") return null;
  return SKILL_LABEL[kind];
}

const ENEMY_NAMES = ["こうもり", "きのこ", "おおねずみ", "いばら", "かかし", "ひとだま"];

/** 戦闘に出る者の名前。key は団員のID、相棒（ボス）のID、または「enemy-番号」。 */
export function fighterName(key: string, content: Content): string {
  const member = content.byId[key];
  if (member) return member.name;
  const companion = content.companionById[key];
  if (companion) return companion.name;
  const m = /^enemy-(\d+)$/.exec(key);
  if (m) return ENEMY_NAMES[(Number(m[1]) - 1) % ENEMY_NAMES.length] ?? "まもの";
  return "ボス";
}

export function formatNumber(n: number): string {
  if (n < 10_000) return String(Math.floor(n));
  if (n < 100_000_000) return `${(n / 10_000).toFixed(n < 100_000 ? 2 : 1)}万`;
  return `${(n / 100_000_000).toFixed(2)}億`;
}

export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分`;
  const hours = Math.floor(min / 60);
  if (hours < 48) return `${hours}時間${min % 60}分`;
  return `${Math.floor(hours / 24)}日`;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
