// ブラウザの保存領域の読み書き。失敗しても例外を外へ出さず、結果を返す。

const SAVE_KEY = "idle-game.save";
const BACKUP_PREFIX = "idle-game.save.backup.";

export interface StorageResult {
  ok: boolean;
  error?: string;
}

export function readSave(): { text: string | null; error?: string } {
  try {
    return { text: window.localStorage.getItem(SAVE_KEY) };
  } catch (e) {
    return { text: null, error: describe(e) };
  }
}

export function writeSave(text: string): StorageResult {
  try {
    window.localStorage.setItem(SAVE_KEY, text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describe(e) };
  }
}

/** 読めなかったセーブを別の名前で残す。上書きで失わないため。 */
export function backupSave(text: string, nowMs: number): StorageResult {
  try {
    window.localStorage.setItem(BACKUP_PREFIX + String(nowMs), text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describe(e) };
  }
}

/** 保存領域を消されにくくするよう、ブラウザに頼む（頼めない環境では何もしない）。 */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === "function") {
      return await navigator.storage.persist();
    }
  } catch {
    // 対応していない環境
  }
  return null;
}

/** ホーム画面に追加したアイコンから開いているか。 */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

function describe(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}
