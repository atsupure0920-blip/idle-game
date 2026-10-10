// 種から決まる乱数。同じ種なら同じ結果になるので、テストと模擬プレイで結果を再現できる。
// core の中で Math.random を使ってはいけない（scripts/check/core-purity.ts が検査する）。

export interface Rng {
  /** 0以上1未満の数を返す。 */
  next(): number;
  /** min以上max以下の整数を返す。 */
  int(min: number, max: number): number;
  /** 現在の内部状態。セーブに入れておけば、続きから同じ乱数列を再開できる。 */
  state(): number;
}

/** mulberry32。状態は32ビット整数1つ。 */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new Error(`int(${min}, ${max}) の範囲が不正です`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    state: () => s,
  };
}
