// 模擬プレイの実行（第2版）。core の advance を1秒ごとに呼び、ときどきプレイヤーが操作する。

import { advance, createGame, ownedCount } from "../core/game.ts";
import type { GameData, GameEvent } from "../core/game.ts";
import { stageLabel, totalStages } from "../core/params.ts";
import type { Content } from "../core/params.ts";
import { createRng } from "../core/rng.ts";
import { POLICIES, act, newMemo, noteDefeat } from "./policies.ts";
import type { PolicyName } from "./policies.ts";

/** 模擬プレイの開始時刻（固定。結果を再現できるように、実際の時計は使わない）。 */
const T0 = 1_800_000_000_000;
const DAY_MS = 86_400_000;

export interface SimConfig {
  policy: PolicyName;
  seed: number;
  /** 続けて遊ぶ時間（秒）。この時点の記録が、下の SimResult の主な項目になる。 */
  durationSec: number;
  content: Content;
  /** 続けて遊んだあと、画面を閉じて離れ、戻ってきてもう少し遊ぶ場合（省略できる）。 */
  away?: { awaySec: number; afterSec: number };
}

export interface TimelineEntry {
  tSec: number;
  text: string;
}

export interface SimResult {
  policy: PolicyName;
  seed: number;
  /** 到達した面の通し番号（次に挑む面。全部突破していれば最後の面）。 */
  stageReached: number;
  /** 初めて負けるまでの分数（負けていなければ null）。 */
  firstDefeatMin: number | null;
  /** 初めてボスが相棒になるまでの分数（まだなら null）。 */
  firstCompanionMin: number | null;
  /** 最初の10分に勧誘した回数。 */
  recruits10Min: number;
  membersOwned: number;
  /** 新しい面を突破できなかった時間の最長（分）。 */
  longestStallMin: number;
  tapsPerMin: number;
  defeats: number;
  battles: number;
  /** 戦闘1回の長さの中央値（秒）。 */
  battleSecMedian: number;
  /** 離れて戻ってきたあとに、新しく突破した面の数（away を指定したときだけ）。 */
  stagesGainedAfterAway: number | null;
  timeline: TimelineEntry[];
  /** 続けて遊び終えた時点の状態。 */
  final: GameData;
}

function describe(e: GameEvent, ctx: Content): string | null {
  const p = ctx.params;
  if (e.type === "win") return `${stageLabel(e.stage, p)} を突破`;
  if (e.type === "defeat") return `${stageLabel(e.stage, p)} で負け${e.timedOut ? "（時間切れ）" : ""}`;
  if (e.type === "companion") return `${ctx.companionById[e.id]?.name ?? e.id} が相棒になる`;
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
  const jitter = (sec: number): number => Math.round(sec * 1000 * (0.7 + 0.6 * human.next()));
  let nextLookMs = T0 + jitter(Math.min(policy.lookSec, 3));
  let recruits10Min = 0;
  /** 直前の戦闘に勝って、続けて挑戦できる状態か。 */
  let chainOpen = false;

  const play = (fromMs: number, toMs: number): void => {
    for (let t = fromMs; t <= toMs; t += 1000) {
      const step = advance(game, t, Math.floor((t - T0) / DAY_MS), ctx);
      game = step.game;
      for (const e of step.events) {
        if (e.type === "win") chainOpen = true;
        if (e.type === "defeat") noteDefeat(memo, game, e.stage, e.atMs);
        const text = describe(e, ctx);
        if (text !== null) timeline.push({ tSec: Math.round((e.atMs - T0) / 1000), text });
      }
      if (game.battle === null && t >= nextLookMs) {
        const before = game;
        // 勝った直後は、続けて挑戦する（回数の上限まで）。それ以外で画面を見たときは、数え直す
        if (!chainOpen) memo.chain = 0;
        chainOpen = false;
        game = act(game, t, ctx, policy, memo);
        const tSec = Math.round((t - T0) / 1000);
        const pulls = game.counters.recruits - before.counters.recruits;
        const levels = game.counters.levelUps - before.counters.levelUps;
        if (pulls > 0) timeline.push({ tSec, text: `勧誘 ${pulls}回（団員 ${ownedCount(game)}人）` });
        if (levels > 0) timeline.push({ tSec, text: `稽古 +${levels}レベル` });
        // 操作にかかった時間のぶん、次に画面を見るのが遅れる
        const busyMs = (game.stats.actions - before.stats.actions) * policy.actionSec * 1000;
        if (game.battle !== null) {
          battleSecs.push((game.battle.endsAtMs - game.battle.startedAtMs) / 1000);
          nextLookMs = game.battle.resolveAtMs + jitter(policy.reactSec) + busyMs;
        } else {
          nextLookMs = t + jitter(policy.lookSec) + busyMs;
        }
      }
      if (t - T0 === 600_000) recruits10Min = game.counters.recruits;
    }
  };

  const endMs = T0 + cfg.durationSec * 1000;
  play(T0, endMs);
  if (cfg.durationSec < 600) recruits10Min = game.counters.recruits;

  const s = game.stats;
  const minutes = cfg.durationSec / 60;
  const toMin = (ms: number | null): number | null => (ms === null ? null : Math.round(((ms - T0) / 60_000) * 100) / 100);
  const stall = Math.max(s.longestStallMs, endMs - s.lastProgressAtMs);
  const result: SimResult = {
    policy: cfg.policy,
    seed: cfg.seed,
    stageReached: Math.min(game.highestCleared + 1, totalStages(ctx.params)),
    firstDefeatMin: toMin(s.firstDefeatAtMs),
    firstCompanionMin: toMin(s.firstCompanionAtMs),
    recruits10Min,
    membersOwned: ownedCount(game),
    longestStallMin: Math.round((stall / 60_000) * 100) / 100,
    tapsPerMin: Math.round((s.actions / minutes) * 100) / 100,
    defeats: s.defeats,
    battles: s.battles,
    battleSecMedian: battleSecs.length === 0 ? 0 : (battleSecs.slice().sort((a, b) => a - b)[Math.floor(battleSecs.length / 2)] as number),
    stagesGainedAfterAway: null,
    timeline: timeline.slice(),
    final: game,
  };

  if (cfg.away) {
    // 画面を閉じて離れ、戻ってきて、もう少し遊ぶ
    const cleared = game.highestCleared;
    const backMs = endMs + cfg.away.awaySec * 1000;
    nextLookMs = backMs + jitter(3);
    memo.chain = 0;
    play(backMs, backMs + cfg.away.afterSec * 1000);
    result.stagesGainedAfterAway = game.highestCleared - cleared;
  }
  return result;
}
