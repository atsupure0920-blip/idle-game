// ゲームの状態と、それを進める関数。
//
// 決まり:
//   - 画面（DOM）にも、実際の時計にも依存しない。時刻は必ず引数 nowMs で受け取る。
//   - 状態は書き換えず、新しい状態を返す。
//
// ここにあるのは、セーブ全体の入れ物（起動やタップの記録）。
// ゲーム本体の状態は game に入り、独自の版番号（GAME_VERSION）を持つ（src/core/game.ts）。
// S0 のころのセーブには game がない。その場合は、画面側が新しいゲームを作って入れる。

import type { GameData } from "./game.ts";

export const STATE_VERSION = 1;

export interface GameState {
  version: number;
  /** 初めて起動した時刻（ミリ秒）。 */
  createdAtMs: number;
  /** 最後に開いていた時刻（ミリ秒）。放置時間の計算に使う。 */
  lastSeenAtMs: number;
  /** 起動した回数。 */
  opens: number;
  /** タップした回数。 */
  taps: number;
  /** 乱数の内部状態。 */
  rngState: number;
  /** ゲーム本体の状態。S0 のころのセーブにはない。 */
  game?: GameData;
}

export function createInitialState(nowMs: number, seed: number): GameState {
  return {
    version: STATE_VERSION,
    createdAtMs: nowMs,
    lastSeenAtMs: nowMs,
    opens: 0,
    taps: 0,
    rngState: seed >>> 0,
  };
}

export interface OpenResult {
  state: GameState;
  /** 前回から離れていた時間（ミリ秒）。時計が巻き戻っていた場合は 0。 */
  awayMs: number;
  /** 端末の時計が前回より過去を指していたら true。 */
  clockWentBack: boolean;
}

/** アプリを開いたときに呼ぶ。 */
export function onOpen(state: GameState, nowMs: number): OpenResult {
  const clockWentBack = nowMs < state.lastSeenAtMs;
  const awayMs = clockWentBack ? 0 : nowMs - state.lastSeenAtMs;
  return {
    state: { ...state, opens: state.opens + 1, lastSeenAtMs: nowMs },
    awayMs,
    clockWentBack,
  };
}

/** タップしたときに呼ぶ。 */
export function onTap(state: GameState, nowMs: number): GameState {
  return {
    ...state,
    taps: state.taps + 1,
    lastSeenAtMs: Math.max(state.lastSeenAtMs, nowMs),
  };
}
