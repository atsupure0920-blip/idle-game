// 確認用の機能の欄（速度変更、時間送り、付与、最初からやり直す）。公開用ビルドには入らない。
// 押したときの処理は main.ts が受ける（data-action が dbg- で始まるもの）。

export function debugPanelHtml(speed: number): string {
  const speeds = [1, 2, 5, 20]
    .map((v) => `<button type="button" class="btn ${speed === v ? "btn-primary" : ""}" data-action="dbg-speed" data-v="${v}" data-testid="dbg-speed-${v}">${v}倍</button>`)
    .join("");
  return (
    `<div class="card debug" data-testid="debug-panel">` +
    `<h3>確認用の機能（公開用には入りません）</h3>` +
    `<p class="mini">これを使うと、プレイの記録に「使用あり」と残ります。採点用に遊ぶときは使わないでください。</p>` +
    `<div class="btn-row"><span>速度</span>${speeds}</div>` +
    `<div class="btn-row"><span>時間を送る</span>` +
    `<button type="button" class="btn" data-action="dbg-time" data-ms="600000" data-testid="dbg-time-10m">10分</button>` +
    `<button type="button" class="btn" data-action="dbg-time" data-ms="3600000" data-testid="dbg-time-1h">1時間</button>` +
    `<button type="button" class="btn" data-action="dbg-time" data-ms="36000000" data-testid="dbg-time-10h">10時間</button></div>` +
    `<div class="btn-row"><span>付与</span>` +
    `<button type="button" class="btn" data-action="dbg-grant" data-gold="1000" data-tickets="0" data-testid="dbg-gold">おひねり+1000</button>` +
    `<button type="button" class="btn" data-action="dbg-grant" data-gold="0" data-tickets="1" data-testid="dbg-ticket">チケット+1</button></div>` +
    `<div class="btn-row"><span>ログ</span>` +
    `<button type="button" class="btn" data-action="dbg-log" data-testid="dbg-log">ログを書き出す</button></div>` +
    `<div class="btn-row"><span>セーブ</span>` +
    `<button type="button" class="btn btn-danger" data-action="dbg-reset" data-testid="dbg-reset">最初からやり直す</button></div>` +
    `</div>`
  );
}
