// 画面の入口。実際の時刻と保存領域を扱うのはこの層だけで、ルールは core に任せる。

import { createInitialState, onOpen, onTap } from "../core/state.ts";
import type { GameState } from "../core/state.ts";
import { deserialize, serialize } from "../core/save.ts";
import { backupSave, isStandalone, readSave, requestPersistence, writeSave } from "./storage.ts";
import { installDebug, logEvent } from "../debug/debug.ts";

function el(testId: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!found) throw new Error(`画面の要素が見つかりません: ${testId}`);
  return found;
}

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] ?? 1;
}

function formatAway(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分`;
  const hours = Math.floor(min / 60);
  if (hours < 48) return `${hours}時間${min % 60}分`;
  return `${Math.floor(hours / 24)}日`;
}

function start(): void {
  let currentSaveText = "";
  if (__DEBUG__) {
    installDebug({ buildId: __BUILD_ID__, getSaveText: () => currentSaveText });
  }

  const now = Date.now();
  const notices: string[] = [];
  let canSave = true;

  // 1. セーブを読む
  const read = readSave();
  if (read.error) notices.push(`保存領域を読めませんでした（${read.error}）。`);
  const loaded = deserialize(read.text);
  logEvent("load", { kind: loaded.kind });

  let state: GameState;
  let firstRun = false;
  if (loaded.kind === "ok") {
    state = loaded.state;
    if (loaded.migratedFrom !== null) notices.push(`セーブを版${loaded.migratedFrom}から更新しました。`);
  } else if (loaded.kind === "too_new") {
    // 新しい版のセーブは上書きしない。
    canSave = false;
    state = createInitialState(now, randomSeed());
    notices.push(`このセーブは新しい版（版${loaded.version}）のものです。上書きを避けるため、今回は保存しません。`);
  } else {
    if (loaded.kind === "corrupt" && read.text) {
      backupSave(read.text, now);
      notices.push(`セーブを読めなかったので、退避して最初から始めます（${loaded.reason}）。`);
    }
    state = createInitialState(now, randomSeed());
    firstRun = loaded.kind === "empty";
  }

  // 2. 起動を記録する
  const opened = onOpen(state, now);
  state = opened.state;
  if (opened.clockWentBack) notices.push("端末の時計が前回より前を指しています。離れていた時間は0として扱いました。");

  // 3. 表示と保存
  const save = (): void => {
    if (!canSave) {
      el("save-status").textContent = "保存しない";
      return;
    }
    currentSaveText = serialize(state, Date.now());
    const result = writeSave(currentSaveText);
    el("save-status").textContent = result.ok ? "保存済み" : "保存に失敗";
    if (!result.ok) logEvent("save-failed", { error: result.error ?? "" });
  };

  const render = (): void => {
    el("build-id").textContent = __BUILD_ID__;
    el("opens").textContent = `${state.opens}回`;
    el("taps").textContent = `${state.taps}回`;
  };

  el("away").textContent = firstRun ? "はじめての起動" : formatAway(opened.awayMs);
  const standalone = isStandalone();
  el("launch-mode").textContent = standalone ? "ホーム画面から" : "ブラウザから";
  el("a2hs-guide").hidden = standalone;

  const notice = el("notice");
  if (notices.length > 0) {
    notice.textContent = notices.join(" ");
    notice.hidden = false;
  }

  el("tap-button").addEventListener("click", () => {
    state = onTap(state, Date.now());
    render();
    save();
  });

  // 画面を閉じる直前にも保存する。
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
  window.addEventListener("pagehide", save);

  render();
  save();
  logEvent("started", { opens: state.opens, taps: state.taps, standalone });

  void requestPersistence().then((granted) => logEvent("persist", { granted: String(granted) }));
}

start();
