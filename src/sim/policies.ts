// 模擬プレイの「遊び方」（第2版）。3種類のプレイヤーを用意する。
//
//   optimal … 熱心な人。数秒ごとに画面を見て、できることを全部やる
//   normal  … ふつうの人。勝っている間は続けて挑戦し、止まったら20秒ほどごとに様子を見る
//   lazy    … あまり開かない人。1分以上あけて画面を見て、ひととおりやって、1〜2回挑戦する
//
// ここではゲームの中身を一切計算しない。core の関数（challenge、trainParty など）を呼ぶだけ。
// 実際の人が画面で見られないもの（勝てる見込みの数字など）は、模擬の人も使わない。
// 負けたあとは、「稽古でレベルがいくつか上がったら」か「しばらく待ったら」、もう一度挑戦する。

import {
  PARTY_SIZE,
  challenge,
  claimDaily,
  claimMission,
  collectIdle,
  companionLevelInfo,
  companionLevelUp,
  dailyList,
  idlePending,
  levelUpInfo,
  missionList,
  promote,
  promoteInfo,
  recruit,
  setCompanion,
  setPartySlot,
  trainParty,
} from "../core/game.ts";
import type { GameData } from "../core/game.ts";
import { memberPower, memberStats } from "../core/params.ts";
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
  /** 負けたあと、団員のレベルが合計でこれだけ上がったら、もう一度挑戦する。 */
  retryAfterLevels: number;
  /** レベルが上がらなくても、これだけ待ったら試しに挑戦する（秒）。 */
  retryAfterSec: number;
}

export const POLICIES: Record<PolicyName, Policy> = {
  optimal: { name: "optimal", lookSec: 4, reactSec: 1.5, actionSec: 1.5, chainMax: 99, swaps: true, retryAfterLevels: 1, retryAfterSec: 120 },
  normal: { name: "normal", lookSec: 20, reactSec: 4, actionSec: 3, chainMax: 99, swaps: true, retryAfterLevels: 2, retryAfterSec: 240 },
  lazy: { name: "lazy", lookSec: 75, reactSec: 8, actionSec: 4, chainMax: 2, swaps: false, retryAfterLevels: 4, retryAfterSec: 600 },
};

/** プレイヤーが覚えていること。 */
export interface Memo {
  /** 負けて、まだ突破できていない面（なければ 0）。 */
  stuckStage: number;
  /** 負けた時点の、レベルを上げた回数の合計。 */
  levelsAtDefeat: number;
  /** 負けた時刻。 */
  defeatAtMs: number;
  /** いま画面を見ている間に、続けて挑戦した回数。 */
  chain: number;
}

export function newMemo(): Memo {
  return { stuckStage: 0, levelsAtDefeat: 0, defeatAtMs: 0, chain: 0 };
}

/** 前列の枠の数（編成の前半）。 */
const FRONT_SLOTS = PARTY_SIZE / 2;

function maxHp(g: GameData, id: string, ctx: Content): number {
  const def = ctx.byId[id];
  const own = g.members[id];
  return def && own ? memberStats(def, own.level, own.star, ctx.params).hp : 0;
}

/**
 * 「同じレベルまで育てたら」の強さ。新しい団員はレベル1で入るので、いまの強さで比べると必ず負ける。
 * 入れ替えを考える人は、育てた先の強さで比べる（入れたあと、レベルの低い団員から育てて追いつかせる）。
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
  return memberPower(def, top, own.star, ctx.params);
}

/** 負けたことを覚える（模擬プレイの進行役が、負けの出来事を見たときに呼ぶ）。 */
export function noteDefeat(memo: Memo, game: GameData, stage: number, atMs: number): void {
  memo.stuckStage = stage;
  memo.levelsAtDefeat = game.counters.levelUps;
  memo.defeatAtMs = atMs;
}

/** 画面を1回見たときの行動。挑戦を始めた場合は、戦闘が終わるまで次の行動はない。 */
export function act(game: GameData, nowMs: number, ctx: Content, policy: Policy, memo: Memo): GameData {
  let g = game;
  if (g.battle !== null) return g;
  if (g.highestCleared >= memo.stuckStage) memo.stuckStage = 0;

  // 1. 箱から放置報酬を受け取る
  const pending = idlePending(g, nowMs, ctx);
  if (pending.gold > 0 || Object.values(pending.mats).some((n) => n > 0)) {
    const r = collectIdle(g, nowMs, ctx);
    if (r.ok) g = r.game;
  }

  // 2. 達成したミッションと日課の報酬を受け取る
  for (let guard = 0; guard < 50; guard++) {
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

  // 3. 勧誘する
  while (g.tickets > 0) {
    const r = recruit(g, ctx);
    if (!r.ok) break;
    g = r.game;
  }

  // 4. 編成: 空き枠を埋める。入れ替えをする人は、控えのほうが（育てれば）強いなら交代させる
  for (let guard = 0; guard < 8; guard++) {
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
  // 並べ替え: 入れ替えをする人は、体力の高い2人を前列に置く（敵は前列を先に狙うので）
  if (policy.swaps) {
    for (let guard = 0; guard < 4; guard++) {
      const byHp = g.party.filter((id): id is string => id !== null).sort((a, b) => maxHp(g, b, ctx) - maxHp(g, a, ctx));
      const sturdy = byHp.slice(0, Math.min(FRONT_SLOTS, byHp.length));
      const frontSlot = g.party.findIndex((id, i) => i < FRONT_SLOTS && (id === null || !sturdy.includes(id)));
      const backSlot = g.party.findIndex((id, i) => i >= FRONT_SLOTS && id !== null && sturdy.includes(id));
      if (frontSlot < 0 || backSlot < 0) break;
      g = setPartySlot(g, frontSlot, g.party[backSlot] as string).game;
    }
  }

  // 5. 相棒: 枠が空いていれば入れる。育てられるなら育てる
  if (g.companionSlot === null) {
    const first = Object.keys(g.companions)[0];
    if (first) g = setCompanion(g, first).game;
  }
  for (let guard = 0; guard < 20; guard++) {
    const id = Object.keys(g.companions).find((c) => companionLevelInfo(g, c, ctx).ok);
    if (!id) break;
    g = companionLevelUp(g, id, ctx).game;
  }

  // 6. 昇格できる団員を昇格する
  for (const id of g.party) {
    if (id !== null && promoteInfo(g, id, ctx).ok) g = promote(g, id, ctx).game;
  }

  // 7. 編成の全員を、まとめて稽古する
  if (g.party.some((id) => id !== null && levelUpInfo(g, id, ctx).ok)) {
    const r = trainParty(g, ctx);
    if (r.ok) g = r.game;
  }

  // 8. 挑戦する。負けて止まっている面は、稽古が進むか、しばらく待ってから
  if (memo.chain >= policy.chainMax) return g;
  const next = g.highestCleared + 1;
  if (memo.stuckStage === next) {
    const trained = g.counters.levelUps - memo.levelsAtDefeat >= policy.retryAfterLevels;
    const waited = nowMs - memo.defeatAtMs >= policy.retryAfterSec * 1000;
    if (!trained && !waited) return g;
  }
  const c = challenge(g, nowMs, ctx);
  if (c.ok) {
    g = c.game;
    memo.chain += 1;
  }
  return g;
}
