// 模擬プレイの「遊び方」。3種類のプレイヤーを用意する。
//
//   optimal … 数秒ごとに画面を見て、できることを全部やる
//   normal  … 20秒ほどごとに画面を見て、印の付いたことをひととおりやる
//   lazy    … 1分以上あけて画面を見て、最低限のことだけやる
//
// ここではゲームの中身を一切計算しない。core の関数（levelUp、recruit など）を呼ぶだけ。

import {
  PARTY_SIZE,
  claimIdle,
  levelUp,
  levelUpInfo,
  partyPower,
  promote,
  promoteInfo,
  recruit,
  retry,
  setPartySlot,
  winChance,
} from "../core/game.ts";
import type { GameData } from "../core/game.ts";
import { memberPower, memberStats } from "../core/params.ts";
import type { Content } from "../core/params.ts";

export type PolicyName = "optimal" | "normal" | "lazy";

export interface Policy {
  name: PolicyName;
  /** 画面を見る間隔（秒）。実際には前後にばらつかせる。 */
  attentionSec: number;
  /** 1回に行うレベル上げの回数の上限。 */
  maxLevelUps: number;
  /** 編成の入れ替え（弱い団員との交代）をするか。しなければ、空き枠を埋めるだけ。 */
  swaps: boolean;
  /** 止まっているとき、画面に出る「勝てる見込み」がこれ以上なら再挑戦する。 */
  retryAtChance: number;
  /** 見込みが低くても、これだけ待ったら試しに再挑戦する（秒）。 */
  retryAfterSec: number;
}

export const POLICIES: Record<PolicyName, Policy> = {
  optimal: { name: "optimal", attentionSec: 3, maxLevelUps: 99, swaps: true, retryAtChance: 0.5, retryAfterSec: 600 },
  normal: { name: "normal", attentionSec: 20, maxLevelUps: 6, swaps: true, retryAtChance: 0.6, retryAfterSec: 180 },
  lazy: { name: "lazy", attentionSec: 75, maxLevelUps: 3, swaps: false, retryAtChance: 0.8, retryAfterSec: 300 },
};

/** プレイヤーが覚えていること。 */
export interface Memo {
  /** 最後に「勝てる見込み」を見たときの、編成の強さと見込み（強さが変わらなければ見直さない）。 */
  chancePower: number;
  chance: number;
  /** 止まった（または最後に再挑戦した）時刻。 */
  stuckSinceMs: number;
  wasChallenging: boolean;
}

export function newMemo(): Memo {
  return { chancePower: -1, chance: 0, stuckSinceMs: 0, wasChallenging: true };
}

/** 前列の枠の数（編成の前半）。 */
const FRONT_SLOTS = PARTY_SIZE / 2;

function maxHp(g: GameData, id: string, ctx: Content): number {
  const def = ctx.byId[id];
  const own = g.members[id];
  return def && own ? memberStats(def, own.level, own.star, ctx.params).hp : 0;
}

function power(g: GameData, id: string, ctx: Content): number {
  const def = ctx.byId[id];
  const own = g.members[id];
  return def && own ? memberPower(def, own.level, own.star, ctx.params) : 0;
}

/** 画面を1回見たときの行動。 */
export function act(game: GameData, nowMs: number, ctx: Content, policy: Policy, memo: Memo): GameData {
  let g = game;

  // 負けて止まったことに気づく
  if (memo.wasChallenging && !g.challenging) memo.stuckSinceMs = nowMs;

  // 1. 放置報酬を受け取る
  if (g.idleGold > 0) g = claimIdle(g).game;

  // 2. 勧誘する
  while (g.tickets > 0) {
    const r = recruit(g, ctx);
    if (!r.ok) break;
    g = r.game;
  }

  // 3. 編成: 空き枠を埋める。入れ替えをする人は、控えのほうが強ければ交代させる
  for (let guard = 0; guard < 8; guard++) {
    const bench = Object.keys(g.members)
      .filter((id) => !g.party.includes(id))
      .sort((a, b) => power(g, b, ctx) - power(g, a, ctx));
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
      if (power(g, g.party[i] as string, ctx) < power(g, g.party[weakSlot] as string, ctx)) weakSlot = i;
    }
    if (power(g, best, ctx) <= power(g, g.party[weakSlot] as string, ctx) * 1.05) break;
    g = setPartySlot(g, weakSlot, best).game;
  }

  // 3b. 並べ替え: 入れ替えをする人は、体力の高い2人を前列に置く（敵は前列を先に狙うので）
  if (policy.swaps) {
    for (let guard = 0; guard < 4; guard++) {
      const byHp = g.party
        .filter((id): id is string => id !== null)
        .sort((a, b) => maxHp(g, b, ctx) - maxHp(g, a, ctx));
      const frontCount = Math.min(FRONT_SLOTS, byHp.length);
      const sturdy = byHp.slice(0, frontCount);
      const frontSlot = g.party.findIndex((id, i) => i < FRONT_SLOTS && (id === null || !sturdy.includes(id)));
      const backSlot = g.party.findIndex((id, i) => i >= FRONT_SLOTS && id !== null && sturdy.includes(id));
      if (frontSlot < 0 || backSlot < 0) break;
      g = setPartySlot(g, frontSlot, g.party[backSlot] as string).game;
    }
  }

  // 4. 昇格できる団員を昇格する
  for (const id of g.party) {
    if (id !== null && promoteInfo(g, id, ctx).ok) g = promote(g, id, ctx).game;
  }

  // 5. レベルを上げる（編成の中で、いちばんレベルの低い団員から）
  for (let n = 0; n < policy.maxLevelUps; n++) {
    const candidates = g.party
      .filter((id): id is string => id !== null && levelUpInfo(g, id, ctx).ok)
      .sort((a, b) => (g.members[a]?.level ?? 0) - (g.members[b]?.level ?? 0));
    const target = candidates[0];
    if (!target) break;
    g = levelUp(g, target, ctx).game;
  }

  // 6. 止まっていたら、勝てる見込みが出たか、十分に待ったときに再挑戦する
  if (!g.challenging) {
    const nowPower = partyPower(g, ctx);
    if (nowPower !== memo.chancePower) {
      memo.chancePower = nowPower;
      memo.chance = winChance(g, ctx);
    }
    const likely = memo.chance >= policy.retryAtChance;
    const waited = nowMs - memo.stuckSinceMs >= policy.retryAfterSec * 1000;
    if (likely || waited) {
      const r = retry(g, ctx);
      if (r.ok) {
        g = r.game;
        memo.stuckSinceMs = nowMs;
        memo.chancePower = -1;
      }
    }
  }

  memo.wasChallenging = g.challenging;
  return g;
}
