// 絵（画像）の置き場所。絵がまだない団員・敵・背景は、文字の仮の見た目のまま出す。
//
// 絵は src/assets/img/<id>.webp に置く（art-in の手順で、ユーザーが作った絵を整えて置く）。
// ビルドが、置いてある絵の id の一覧を画面のコードへ埋め込み、main.ts が setArt() で渡す。
// テスト（ブラウザなし）では一覧が空なので、いつも仮の見た目になる。

let available = new Set<string>();
let version = "";

/** 使える絵の一覧を渡す（main.ts が、起動時に1回だけ呼ぶ）。 */
export function setArt(ids: string[], buildId: string): void {
  available = new Set(ids);
  version = encodeURIComponent(buildId);
}

/** その id の絵の URL（なければ null）。 */
export function artUrl(id: string): string | null {
  return available.has(id) ? `img/${id}.webp?v=${version}` : null;
}

/** 敵の見た目の id（敵は種類ごとの絵を、面の中で使い回す）。 */
export const ENEMY_ART = ["e_bat", "e_mushroom", "e_rat", "e_thorn", "e_scarecrow", "e_wisp"];

/** 戦闘に出る者の絵の id（団員はそのまま、相棒は c_、敵は enemy-N から）。 */
export function fighterArtId(key: string): string | null {
  const m = /^enemy-(\d+)$/.exec(key);
  if (m) return ENEMY_ART[(Number(m[1]) - 1) % ENEMY_ART.length] ?? null;
  return key;
}
