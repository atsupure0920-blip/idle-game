// 画面に出す言葉。数値の計算はしない（core が返した値を、言葉にするだけ）。

import type { BattleEventKind } from "../core/battle.ts";
import type { Content, MemberDef, MemberRole, Skill, Trait } from "../core/params.ts";

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

/** 技の名前（戦闘中に、技を使った団員の上に出す）。 */
export const SKILL_LABEL: Record<Skill["type"], string> = {
  strike: "強打",
  aoe: "全体攻撃",
  heal: "回復",
  healall: "全体回復",
  selfheal: "立て直し",
  rally: "鼓舞",
};

const percent = (v: number): string => `${Math.round(v * 100)}%`;

export function skillText(skill: Skill, rallySec: number): string {
  switch (skill.type) {
    case "strike":
      return `敵1体に、攻撃の ${skill.power}倍 のダメージ。`;
    case "aoe":
      return `敵全員に、攻撃の ${skill.power}倍 のダメージ。`;
    case "heal":
      return `いちばん傷ついた味方を、攻撃の ${skill.power}倍 回復。`;
    case "healall":
      return `味方全員を、攻撃の ${skill.power}倍 回復。`;
    case "selfheal":
      return `自分の体力を、最大の ${percent(skill.power)} 回復。`;
    case "rally":
      return `${rallySec}秒間、味方全員の与えるダメージが ${percent(skill.power)} 増える。`;
  }
}

/** 戦闘の出来事が「技」なら、その名前。通常の攻撃や戦闘不能なら null。 */
export function skillLabelOf(kind: BattleEventKind): string | null {
  if (kind === "attack" || kind === "down") return null;
  return SKILL_LABEL[kind];
}

const ENEMY_NAMES = ["こうもり", "きのこ", "おおねずみ", "いばら", "かかし", "ひとだま"];

/** 戦闘に出る者の名前。key は団員のID、ボスのID、または「enemy-番号」。 */
export function fighterName(key: string, content: Content): string {
  const def: MemberDef | undefined = content.byId[key];
  if (def) return def.name;
  const m = /^enemy-(\d+)$/.exec(key);
  if (m) return ENEMY_NAMES[(Number(m[1]) - 1) % ENEMY_NAMES.length] ?? "まもの";
  return "ボス";
}

/** 勝てる見込み（0〜1）を、3段階の言葉にする。 */
export function chanceLabel(chance: number): { text: string; tone: "high" | "even" | "low" } {
  if (chance >= 0.75) return { text: "高い", tone: "high" };
  if (chance >= 0.4) return { text: "五分五分", tone: "even" };
  return { text: "低い", tone: "low" };
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
