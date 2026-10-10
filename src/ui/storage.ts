// ブラウザの保存領域の読み書き。失敗しても例外を外へ出さず、結果を返す。

/** 保存するものの種類。セーブ本体、プレイの記録、デバッグ用の設定。 */
export type StoreKey = "save" | "playlog" | "debug";

const KEYS: Record<StoreKey, string> = {
  save: "idle-game.save",
  playlog: "idle-game.playlog",
  debug: "idle-game.debug",
};
const BACKUP_PREFIX = "idle-game.save.backup.";
/** 退避したセーブを残す数（古いものから消す）。 */
const MAX_BACKUPS = 5;

export interface StorageResult {
  ok: boolean;
  error?: string;
}

export function readStore(key: StoreKey): { text: string | null; error?: string } {
  try {
    return { text: window.localStorage.getItem(KEYS[key]) };
  } catch (e) {
    return { text: null, error: describe(e) };
  }
}

export function writeStore(key: StoreKey, text: string): StorageResult {
  try {
    window.localStorage.setItem(KEYS[key], text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describe(e) };
  }
}

/** 読めなかったセーブや、置き換える前のセーブを、別の名前で残す。上書きで失わないため。 */
export function backupSave(text: string, nowMs: number): StorageResult {
  try {
    const ls = window.localStorage;
    ls.setItem(BACKUP_PREFIX + String(nowMs), text);
    const old: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k !== null && k.startsWith(BACKUP_PREFIX)) old.push(k);
    }
    old.sort((a, b) => Number(a.slice(BACKUP_PREFIX.length)) - Number(b.slice(BACKUP_PREFIX.length)));
    while (old.length > MAX_BACKUPS) {
      const k = old.shift();
      if (k !== undefined) ls.removeItem(k);
    }
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
