// セーブデータの書き出しと読み込み。
//
// セーブには必ず版番号を付ける。ゲームを更新して状態の形が変わったら、
// STATE_VERSION を上げ、MIGRATIONS に「古い版 → 次の版」の変換を足す。
// こうしておけば、更新のたびにプレイヤーのセーブが消えることを防げる。

import { STATE_VERSION } from "./state.ts";
import type { GameState } from "./state.ts";
import { GAME_VERSION, isGameData } from "./game.ts";

export const SAVE_FORMAT = "idle-game-save";

export interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  version: number;
  savedAtMs: number;
  state: unknown;
}

export type LoadResult =
  | { kind: "ok"; state: GameState; migratedFrom: number | null; /** ゲームの作りが大きく変わり、古い版のゲームの状態を引き継げなかった（最初からになる）。 */ gameReset: boolean }
  /** セーブがまだない。 */
  | { kind: "empty" }
  /** 壊れていて読めない。上書きする前に、元の文字列を退避すること。 */
  | { kind: "corrupt"; reason: string }
  /** このビルドより新しい版のセーブ。上書きしてはいけない。 */
  | { kind: "too_new"; version: number };

/** 版 N の状態を、版 N+1 の状態へ変換する関数の表。 */
export type Migrations = Readonly<Record<number, (old: Record<string, unknown>) => Record<string, unknown>>>;

/** 実際に使う変換表。版が 1 しかない間は空。 */
export const MIGRATIONS: Migrations = {};

export function serialize(state: GameState, nowMs: number): string {
  const envelope: SaveEnvelope = {
    format: SAVE_FORMAT,
    version: state.version,
    savedAtMs: nowMs,
    state,
  };
  return JSON.stringify(envelope);
}

export function deserialize(
  text: string | null | undefined,
  migrations: Migrations = MIGRATIONS,
  currentVersion: number = STATE_VERSION,
): LoadResult {
  if (text === null || text === undefined || text === "") return { kind: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "corrupt", reason: "JSONとして読めません" };
  }
  if (!isRecord(parsed) || parsed["format"] !== SAVE_FORMAT) {
    return { kind: "corrupt", reason: "このゲームのセーブではありません" };
  }
  const version = parsed["version"];
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { kind: "corrupt", reason: "版番号がありません" };
  }
  if (version > currentVersion) return { kind: "too_new", version };

  let state = parsed["state"];
  if (!isRecord(state)) return { kind: "corrupt", reason: "状態が入っていません" };

  for (let v = version; v < currentVersion; v++) {
    const step = migrations[v];
    if (!step) return { kind: "corrupt", reason: `版${v}から版${v + 1}への変換がありません` };
    state = { ...step(state as Record<string, unknown>), version: v + 1 };
  }

  // ゲーム本体（game）は独自の版番号を持つ。
  //   新しすぎる版 … 上書きを避けるために読み込まない。
  //   古い版       … ゲームの作りが大きく変わったので引き継げない。ゲームは最初からになる（起動の回数などは残る）。
  //                  呼び出し側は、元のセーブを退避してから進めること。
  let gameReset = false;
  const game = (state as Record<string, unknown>)["game"];
  if (game !== undefined) {
    const gv = isRecord(game) ? game["v"] : undefined;
    if (typeof gv === "number" && gv > GAME_VERSION) return { kind: "too_new", version: gv };
    if (typeof gv === "number" && Number.isInteger(gv) && gv >= 1 && gv < GAME_VERSION) {
      const rest: Record<string, unknown> = { ...(state as Record<string, unknown>) };
      delete rest["game"];
      state = rest;
      gameReset = true;
    } else if (!isGameData(game)) {
      return { kind: "corrupt", reason: "ゲームの状態の形が正しくありません" };
    }
  }

  if (!isGameState(state, currentVersion)) {
    return { kind: "corrupt", reason: "状態の形が正しくありません" };
  }
  return { kind: "ok", state, migratedFrom: version === currentVersion ? null : version, gameReset };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isGameState(value: unknown, currentVersion: number): value is GameState {
  if (!isRecord(value)) return false;
  return (
    value["version"] === currentVersion &&
    isFiniteNumber(value["createdAtMs"]) &&
    isFiniteNumber(value["lastSeenAtMs"]) &&
    isFiniteNumber(value["opens"]) &&
    value["opens"] >= 0 &&
    isFiniteNumber(value["taps"]) &&
    value["taps"] >= 0 &&
    isFiniteNumber(value["rngState"])
  );
}
