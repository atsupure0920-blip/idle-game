// 模擬プレイの「遊び方」（第3版）。3種類のプレイヤーを用意する。
//
//   optimal … 熱心な人。数秒ごとに画面を見て、できることを全部やる
//   normal  … ふつうの人。勝っている間は続けて挑戦し、止まったら20秒ほどごとに様子を見る
//   lazy    … あまり開かない人。1分以上あけて画面を見て、ひととおりやって、1〜2回挑戦する
//
// ここではゲームの中身を一切計算しない。core の関数（challenge、levelUpTo など）を呼ぶだけ。
// 実際の人が画面でできない操作（全部まとめて上げる など）や、見られないもの（勝てる見込み）は、模擬の人も使わない。
//
// 「ふつうの人」の間合いと、負けたあとの動きは、build-5 のユーザーの実プレイ（feedback/F-011.md）に合わせてある:
//   - 2章の終わりまで、1面あたり約30秒（操作1回に約2秒）
//   - 負けたら、まず1回はすぐに挑み直す。それでも負けたら、編成のレベルを合わせて6つほど上げてから挑む

import {
  FRONT_SIZE,
  autoEquipParty,
  canAutoEquipParty,
  challenge,
  claimDaily,
  claimMission,
  collectIdle,
  companionLevelInfo,
  companionLevelUp,
  dailyList,
  enhanceEquip,
  enhanceInfo,
  idlePending,
  levelUpTo,
  missionList,
  promote,
  promoteInfo,
  recruit,
  resetLevel,
  setCompanion,
  setPartySlot,
} from "../core/game.ts";
import type { GameData } from "../core/game.ts";
import { levelCap, levelCost, memberPower, memberStats } from "../core/params.ts";
import type { Content } from "../core/params.ts";

export type PolicyName = "optimal" | "normal" | "lazy";

export interface Policy {
  name: PolicyName;
  /** 戦闘をしていないとき、画面を見る間隔（秒）。実際には前後にばらつかせる。 */
  lookSec: number;
  /** 戦闘が終わってから、次の操作までの間（秒）。 */
  reactSec: number;
  /** 操作1回にかかる時間（秒）。ボタンを探して押す、出てきた知らせを読む、などの間。 */
  actionSec: number;
  /** 1回画面を見たときに、続けて挑戦する回数の上限。 */
  chainMax: number;
  /** 編成の入れ替え（弱い団員との交代、前列への並べ替え）をするか。しなければ、空き枠を埋めるだけ。 */
  swaps: boolean;
  /** 編成から外した団員のレベルを、リセットしておひねりを取り戻すか。 */
  resets: boolean;
  /** 箱を受け取るのは、これだけ貯まってから（秒）。 */
  collectAfterSec: number;
  /** 1回画面を見たときに、装備を強化する回数の上限。 */
  enhancePerLook: number;
  /** 負けたあと、稽古なしですぐに挑み直す回数。 */
  quickRetries: number;
  /** そのあとは、編成のレベルの合計がこれだけ上がったら、もう一度挑戦する。 */
  retryAfterLevels: number;
  /** レベルが上がらなくても、これだけ待ったら試しに挑戦する（秒）。 */
  retryAfterSec: number;
}

export const POLICIES: Record<PolicyName, Policy> = {
  optimal: { name: "optimal", lookSec: 4, reactSec: 1, actionSec: 1.2, chainMax: 99, swaps: true, resets: true, collectAfterSec: 20, enhancePerLook: 6, quickRetries: 0, retryAfterLevels: 2, retryAfterSec: 120 },
  normal: { name: "normal", lookSec: 20, reactSec: 1.5, actionSec: 2, chainMax: 99, swaps: true, resets: true, collectAfterSec: 45, enhancePerLook: 3, quickRetries: 1, retryAfterLevels: 6, retryAfterSec: 300 },
  lazy: { name: "lazy", lookSec: 75, reactSec: 8, actionSec: 4, chainMax: 2, swaps: false, resets: false, collectAfterSec: 0, enhancePerLook: 1, quickRetries: 0, retryAfterLevels: 6, retryAfterSec: 600 },
};

/** プレイヤーが覚えていること。 */
export interface Memo {
  /** 負けて、まだ突破できていない面（なければ 0）。 */
  stuckStage: number;
  /** 負けた時点の、編成のレベルの合計。 */
  levelsAtDefeat: number;
  /** 負けた時刻。 */
  defeatAtMs: number;
  /** その面で、あと何回すぐに挑み直すか。 */
  quickLeft: number;
  /** いま画面を見ている間に、続けて挑戦した回数。 */
  chain: number;
}

export function newMemo(): Memo {
  return { stuckStage: 0, levelsAtDefeat: 0, defeatAtMs: 0, quickLeft: 0, chain: 0 };
}

function partyLevelSum(g: GameData): number {
  let sum = 0;
  for (const id of g.party) if (id !== null) sum += g.members[id]?.level ?? 0;
  return sum;
}

function maxHp(g: GameData, id: string, ctx: Content): number {
  const def = ctx.byId[id];
  const own = g.members[id];
  return def && own ? memberStats(def, own.level, own.plus, ctx.params).hp : 0;
}

/**
 * 「同じレベルまで育てたら」の強さ。新しい団員はレベル1で入るので、いまの強さで比べると必ず負ける。
 * 入れ替えを考える人は、育てた先の強さで比べる（レア度の高い団員は、同じレベルなら強い）。
 */
function potential(g: GameData, id: string, ctx: Content): number {
  const def = ctx.byId[id];
  const own = g.members[id];
  if (!def || !own) return 0;
  let top = own.level;
  for (const other of g.party) {
    const o = other === null ? undefined : g.members[other];
    if (o && o.level > top) top = o.level;
  }
  return memberPower(def, top, own.plus, ctx.params);
}

/** 負けたことを覚える（模擬プレイの進行役が、負けの出来事を見たときに呼ぶ）。 */
export function noteDefeat(memo: Memo, game: GameData, stage: number, atMs: number, policy: Policy): void {
  if (memo.stuckStage !== stage) memo.quickLeft = policy.quickRetries;
  memo.stuckStage = stage;
  memo.levelsAtDefeat = partyLevelSum(game);
  memo.defeatAtMs = atMs;
}

/** 編成の全員を、レベルの低い団員から順に、おひねりが続くかぎり上げたときの、目標のレベル。 */
function evenTargets(g: GameData, ctx: Content): Record<string, number> {
  const p = ctx.params;
  const levels: Record<string, number> = {};
  const caps: Record<string, number> = {};
  for (const id of g.party) {
    if (id === null) continue;
    const def = ctx.byId[id];
    const own = g.members[id];
    if (!def || !own) continue;
    levels[id] = own.level;
    caps[id] = levelCap(def, own.plus, p);
  }
  let gold = g.gold;
  for (let guard = 0; guard < 5000; guard++) {
    let target: string | null = null;
    for (const id of Object.keys(levels)) {
      const level = levels[id] as number;
      if (level >= (caps[id] as number) || levelCost(level, p) > gold) continue;
      if (target === null || level < (levels[target] as number)) target = id;
    }
    if (target === null) break;
    gold -= levelCost(levels[target] as number, p);
    levels[target] = (levels[target] as number) + 1;
  }
  return levels;
}

/** 画面を1回見たときの行動。挑戦を始めた場合は、戦闘が終わるまで次の行動はない。 */
export function act(game: GameData, nowMs: number, ctx: Content, policy: Policy, memo: Memo): GameData {
  let g = game;
  if (g.battle !== null) return g;
  if (g.highestCleared >= memo.stuckStage) memo.stuckStage = 0;

  // 1. 箱から放置報酬を受け取る（少し貯まってから）
  const pending = idlePending(g, nowMs, ctx);
  if (pending.capped || pending.elapsedMs >= policy.collectAfterSec * 1000) {
    const r = collectIdle(g, nowMs, ctx);
    if (r.ok) g = r.game;
  }

  // 2. 達成したミッションと日課の報酬を受け取る
  for (let guard = 0; guard < 80; guard++) {
    const m = missionList(g, ctx).find((x) => x.claimable);
    if (m) {
      g = claimMission(g, m.def.id, ctx).game;
      continue;
    }
    const d = dailyList(g, ctx).find((x) => x.claimable);
    if (d) {
      g = claimDaily(g, d.def.id, ctx).game;
      continue;
    }
    break;
  }

  // 3. 勧誘する。高級は10枚貯まったら10連（10連には確定があるので、1回ずつは回さない）。通常は、10枚あれば10連、端数は1回ずつ
  while (g.premiumTickets >= 10) g = recruit(g, "premium", 10, ctx).game;
  while (g.tickets >= 10) g = recruit(g, "normal", 10, ctx).game;
  while (g.tickets >= 1) g = recruit(g, "normal", 1, ctx).game;

  // 4. 編成: 空き枠を埋める。入れ替えをする人は、控えのほうが（育てれば）強いなら交代させる
  for (let guard = 0; guard < 12; guard++) {
    const bench = Object.keys(g.members)
      .filter((id) => !g.party.includes(id))
      .sort((a, b) => potential(g, b, ctx) - potential(g, a, ctx));
    const best = bench[0];
    if (!best) break;
    const empty = g.party.indexOf(null);
    if (empty >= 0) {
      g = setPartySlot(g, empty, best).game;
      continue;
    }
    if (!policy.swaps) break;
    let weakSlot = 0;
    for (let i = 1; i < g.party.length; i++) {
      if (potential(g, g.party[i] as string, ctx) < potential(g, g.party[weakSlot] as string, ctx)) weakSlot = i;
    }
    if (potential(g, best, ctx) <= potential(g, g.party[weakSlot] as string, ctx) * 1.05) break;
    g = setPartySlot(g, weakSlot, best).game;
  }
  // 並べ替え: 入れ替えをする人は、体力の高い団員を前列に置く（敵は前列を先に狙うので）
  if (policy.swaps) {
    for (let guard = 0; guard < 6; guard++) {
      const byHp = g.party.filter((id): id is string => id !== null).sort((a, b) => maxHp(g, b, ctx) - maxHp(g, a, ctx));
      const sturdy = byHp.slice(0, Math.min(FRONT_SIZE, byHp.length));
      const frontSlot = g.party.findIndex((id, i) => i < FRONT_SIZE && (id === null || !sturdy.includes(id)));
      const backSlot = g.party.findIndex((id, i) => i >= FRONT_SIZE && id !== null && sturdy.includes(id));
      if (frontSlot < 0 || backSlot < 0) break;
      g = setPartySlot(g, frontSlot, g.party[backSlot] as string).game;
    }
  }

  // 5. リセット: 編成から外れた団員のレベルを戻して、おひねりを取り戻す
  if (policy.resets) {
    for (const id of Object.keys(g.members)) {
      if (g.party.includes(id) || (g.members[id]?.level ?? 1) <= 1) continue;
      const r = resetLevel(g, id, ctx);
      if (r.ok) g = r.game;
    }
  }

  // 6. 相棒: 枠が空いていれば入れる。育てられるなら育てる
  if (g.companionSlot === null) {
    const first = Object.keys(g.companions)[0];
    if (first) g = setCompanion(g, first).game;
  }
  for (let guard = 0; guard < 20; guard++) {
    const id = Object.keys(g.companions).find((c) => companionLevelInfo(g, c, ctx).ok);
    if (!id) break;
    g = companionLevelUp(g, id, ctx).game;
  }

  // 7. 昇格できる団員を昇格する
  for (const id of g.party) {
    if (id !== null && promoteInfo(g, id, ctx).ok) g = promote(g, id, ctx).game;
  }

  // 8. 装備: 良いものが手に入っていれば「おまかせ」で付け替える。安い強化を、いくつかする
  if (canAutoEquipParty(g, ctx)) g = autoEquipParty(g, ctx).game;
  for (let n = 0; n < policy.enhancePerLook; n++) {
    let best: { uid: number; gold: number } | null = null;
    for (const e of g.equips) {
      if (e.on === null || !g.party.includes(e.on)) continue;
      const info = enhanceInfo(g, e.uid, ctx);
      if (!info.ok || info.gold > g.gold * 0.15) continue;
      if (best === null || info.gold < best.gold) best = { uid: e.uid, gold: info.gold };
    }
    if (best === null) break;
    g = enhanceEquip(g, best.uid, ctx).game;
  }

  // 9. 稽古: 編成の全員を、レベルの低い団員から順に上げる（団員ごとに「レベルを指定」で1回ずつ）
  const targets = evenTargets(g, ctx);
  for (const id of Object.keys(targets)) {
    const target = targets[id] as number;
    if (target > (g.members[id]?.level ?? target)) {
      const r = levelUpTo(g, id, target, ctx);
      if (r.ok) g = r.game;
    }
  }

  // 10. 挑戦する。負けて止まっている面は、まず何回かすぐに挑み直し、そのあとは、稽古が進むか、しばらく待ってから
  if (memo.chain >= policy.chainMax) return g;
  const next = g.highestCleared + 1;
  if (memo.stuckStage === next) {
    if (memo.quickLeft > 0) {
      memo.quickLeft -= 1;
    } else {
      const trained = partyLevelSum(g) - memo.levelsAtDefeat >= policy.retryAfterLevels;
      const waited = nowMs - memo.defeatAtMs >= policy.retryAfterSec * 1000;
      if (!trained && !waited) return g;
    }
  }
  const c = challenge(g, nowMs, ctx);
  if (c.ok) {
    g = c.game;
    memo.chain += 1;
  }
  return g;
}
