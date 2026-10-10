// 模擬プレイの実行。core の advance を1秒ごとに呼び、ときどきプレイヤーが操作する。

import { advance, createGame, ownedCount } from "../core/game.ts";
import type { GameData, GameEvent } from "../core/game.ts";
import { stageLabel, totalStages } from "../core/params.ts";
import type { Content } from "../core/params.ts";
import { createRng } from "../core/rng.ts";
import { POLICIES, act, newMemo } from "./policies.ts";
import type { PolicyName } from "./policies.ts";

/** 模擬プレイの開始時刻（固定。結果を再現できるように、実際の時計は使わない）。 */
const T0 = 1_800_000_000_000;

export interface SimConfig {
  policy: PolicyName;
  seed: number;
  durationSec: number;
  content: Content;
}

export interface TimelineEntry {
  tSec: number;
  text: string;
}

export interface SimResult {
  policy: PolicyName;
  seed: number;
  /** 到達した面の通し番号（挑んでいる面。全部突破していれば最後の面）。 */
  stageReached: number;
  /** 初めて負けるまでの分数（負けていなければ null）。 */
  firstDefeatMin: number | null;
  /** 初めて負けた面の通し番号（負けていなければ null）。 */
  firstDefeatStage: number | null;
  /** 戦闘1回の長さの中央値（秒）。 */
  battleSecMedian: number;
  /** 初めてボスが入団するまでの分数（まだなら null）。 */
  firstJoinMin: number | null;
  membersOwned: number;
  /** 新しい面を突破できなかった時間の最長（分）。 */
  longestStallMin: number;
  tapsPerMin: number;
  defeats: number;
  battles: number;
  gold: number;
  timeline: TimelineEntry[];
  final: GameData;
}

function describe(e: GameEvent, ctx: Content): string | null {
  const p = ctx.params;
  if (e.type === "win" && e.firstClear) return `${stageLabel(e.stage, p)} を突破`;
  if (e.type === "defeat") return `${stageLabel(e.stage, p)} で負け${e.timedOut ? "（時間切れ）" : ""}`;
  if (e.type === "ticket") return "勧誘チケットを入手";
  if (e.type === "join") return `${ctx.byId[e.id]?.name ?? e.id} が入団（レベル${e.level}）`;
  if (e.type === "shard") return `${ctx.byId[e.id]?.name ?? e.id} のかけらを入手`;
  if (e.type === "allClear") return "すべての面を突破";
  return null;
}

export function simulate(cfg: SimConfig): SimResult {
  const ctx = cfg.content;
  const policy = POLICIES[cfg.policy];
  const memo = newMemo();
  // プレイヤーの「画面を見る間合い」のばらつき用。ゲームの乱数とは別にする。
  const human = createRng((cfg.seed * 2654435761 + 97) >>> 0);
  let game = createGame(T0, cfg.seed, ctx);
  const timeline: TimelineEntry[] = [];
  const battleSecs: number[] = [];
  let firstDefeatStage: number | null = null;
  const endMs = T0 + cfg.durationSec * 1000;
  let nextActMs = T0 + Math.round(policy.attentionSec * 1000 * (0.5 + human.next()));

  for (let t = T0; t <= endMs; t += 1000) {
    const step = advance(game, t, ctx, false);
    game = step.game;
    for (const e of step.events) {
      if (e.type === "battleStart") battleSecs.push((e.endsAtMs - e.atMs) / 1000);
      if (e.type === "defeat" && firstDefeatStage === null) firstDefeatStage = e.stage;
      const text = describe(e, ctx);
      if (text !== null) timeline.push({ tSec: Math.round((e.atMs - T0) / 1000), text });
    }
    if (t >= nextActMs) {
      const before = game;
      game = act(game, t, ctx, policy, memo);
      const tSec = Math.round((t - T0) / 1000);
      const leveled = Object.keys(game.members).reduce((a, id) => a + ((game.members[id]?.level ?? 0) - (before.members[id]?.level ?? game.members[id]?.level ?? 0)), 0);
      if (game.recruits > before.recruits) timeline.push({ tSec, text: `勧誘 ${game.recruits - before.recruits}回（団員 ${ownedCount(game)}人）` });
      if (leveled > 0) timeline.push({ tSec, text: `レベル上げ ${leveled}回` });
      if (game.challenging && !before.challenging) timeline.push({ tSec, text: "再挑戦" });
      nextActMs = t + Math.round(policy.attentionSec * 1000 * (0.7 + 0.6 * human.next()));
    }
  }

  const s = game.stats;
  const minutes = cfg.durationSec / 60;
  const toMin = (ms: number | null): number | null => (ms === null ? null : Math.round(((ms - T0) / 60_000) * 100) / 100);
  const stall = Math.max(s.longestStallMs, endMs - s.lastProgressAtMs);
  return {
    policy: cfg.policy,
    seed: cfg.seed,
    stageReached: Math.min(game.highestCleared + 1, totalStages(ctx.params)),
    firstDefeatMin: toMin(s.firstDefeatAtMs),
    firstDefeatStage,
    battleSecMedian: battleSecs.length === 0 ? 0 : (battleSecs.slice().sort((a, b) => a - b)[Math.floor(battleSecs.length / 2)] as number),
    firstJoinMin: toMin(s.firstJoinAtMs),
    membersOwned: ownedCount(game),
    longestStallMin: Math.round((stall / 60_000) * 100) / 100,
    tapsPerMin: Math.round((s.actions / minutes) * 100) / 100,
    defeats: s.defeats,
    battles: s.battles,
    gold: game.gold,
    timeline,
    final: game,
  };
}
