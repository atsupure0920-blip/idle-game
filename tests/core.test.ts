// core（ルール）の単体テスト。
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。

import { test } from "node:test";
import assert from "node:assert/strict";

import { createRng } from "../src/core/rng.ts";
import { STATE_VERSION, createInitialState, onOpen, onTap } from "../src/core/state.ts";
import { SAVE_FORMAT, deserialize, serialize } from "../src/core/save.ts";
import type { Migrations } from "../src/core/save.ts";

const T0 = 1_760_000_000_000;
const HOUR = 3_600_000;

test("乱数: 同じ種なら同じ列になる", () => {
  const a = createRng(12345);
  const b = createRng(12345);
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
});

test("乱数: 種が違えば列が変わる", () => {
  const a = createRng(1);
  const b = createRng(2);
  const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length;
  assert.ok(same < 20);
});

test("乱数: 0以上1未満に収まり、偏りが大きくない", () => {
  const r = createRng(777);
  let sum = 0;
  const n = 100_000;
  for (let i = 0; i < n; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    sum += v;
  }
  assert.ok(Math.abs(sum / n - 0.5) < 0.01, `平均が0.5から離れすぎ: ${sum / n}`);
});

test("乱数: int は両端を含む範囲に収まる", () => {
  const r = createRng(42);
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const v = r.int(1, 6);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 6);
    seen.add(v);
  }
  assert.equal(seen.size, 6);
  assert.throws(() => r.int(5, 1));
});

test("乱数: 状態を引き継げば続きから同じ列になる", () => {
  const a = createRng(99);
  for (let i = 0; i < 10; i++) a.next();
  const b = createRng(a.state());
  // mulberry32 は「状態 = 次の種」なので、state() から作り直すと続きが一致する
  assert.equal(a.next(), b.next());
});

test("状態: 初期状態は版番号を持ち、回数は0", () => {
  const s = createInitialState(T0, 5);
  assert.equal(s.version, STATE_VERSION);
  assert.equal(s.opens, 0);
  assert.equal(s.taps, 0);
  assert.equal(s.createdAtMs, T0);
});

test("状態: 開くと起動回数が増え、離れていた時間が返る", () => {
  const s0 = createInitialState(T0, 5);
  const r = onOpen(s0, T0 + 8 * HOUR);
  assert.equal(r.state.opens, 1);
  assert.equal(r.awayMs, 8 * HOUR);
  assert.equal(r.clockWentBack, false);
  assert.equal(r.state.lastSeenAtMs, T0 + 8 * HOUR);
  assert.equal(s0.opens, 0, "元の状態は書き換えない");
});

test("状態: 時計が巻き戻っていたら、離れていた時間は0", () => {
  const s0 = createInitialState(T0, 5);
  const r = onOpen(s0, T0 - 24 * HOUR);
  assert.equal(r.awayMs, 0);
  assert.equal(r.clockWentBack, true);
});

test("状態: タップで回数が1ずつ増える", () => {
  let s = createInitialState(T0, 5);
  for (let i = 0; i < 7; i++) s = onTap(s, T0 + i);
  assert.equal(s.taps, 7);
});

test("セーブ: 書き出して読み込むと同じ状態に戻る", () => {
  let s = createInitialState(T0, 5);
  s = onOpen(s, T0 + HOUR).state;
  s = onTap(s, T0 + HOUR + 1);
  const loaded = deserialize(serialize(s, T0 + HOUR + 2));
  assert.equal(loaded.kind, "ok");
  if (loaded.kind === "ok") {
    assert.deepEqual(loaded.state, s);
    assert.equal(loaded.migratedFrom, null);
  }
});

test("セーブ: 何もなければ empty", () => {
  assert.equal(deserialize(null).kind, "empty");
  assert.equal(deserialize("").kind, "empty");
});

test("セーブ: 壊れていたら corrupt（例外を投げない）", () => {
  for (const bad of ["{", "123", "[]", '{"format":"other"}', `{"format":"${SAVE_FORMAT}"}`, `{"format":"${SAVE_FORMAT}","version":1,"state":{"version":1}}`]) {
    assert.equal(deserialize(bad).kind, "corrupt", bad);
  }
});

test("セーブ: 新しすぎる版は too_new（上書きさせない）", () => {
  const text = JSON.stringify({ format: SAVE_FORMAT, version: STATE_VERSION + 1, savedAtMs: T0, state: {} });
  const loaded = deserialize(text);
  assert.equal(loaded.kind, "too_new");
});

test("セーブ: 古い版は変換表を通して読み込める", () => {
  // 仮に「版1では taps が clicks という名前だった」として、版2へ変換できることを確かめる。
  const migrations: Migrations = {
    1: (old) => {
      const { clicks, ...rest } = old;
      return { ...rest, taps: clicks };
    },
  };
  const oldText = JSON.stringify({
    format: SAVE_FORMAT,
    version: 1,
    savedAtMs: T0,
    state: { version: 1, createdAtMs: T0, lastSeenAtMs: T0, opens: 3, clicks: 12, rngState: 9 },
  });
  const loaded = deserialize(oldText, migrations, 2);
  assert.equal(loaded.kind, "ok");
  if (loaded.kind === "ok") {
    assert.equal(loaded.state.taps, 12);
    assert.equal(loaded.state.version, 2);
    assert.equal(loaded.migratedFrom, 1);
  }
});

test("セーブ: 変換表が欠けていたら corrupt", () => {
  const oldText = JSON.stringify({ format: SAVE_FORMAT, version: 1, savedAtMs: T0, state: { version: 1 } });
  assert.equal(deserialize(oldText, {}, 3).kind, "corrupt");
});
