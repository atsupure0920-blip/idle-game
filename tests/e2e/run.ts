// 通し操作テスト（本物のブラウザで、画面を実際に操作する）。第3版。
//
//   node tests/e2e/run.ts
//
// iPhone の大きさの画面で、最初の循環（挑戦 → ミッション → 高級勧誘の10連 → 編成 → 稽古（+1・+10・指定）→ リセット →
// 装備 → 箱 → 負け → 再挑戦 → ボス → 相棒 → 通常勧誘 → 日課 → 保存 → 開き直し → 放置報酬 → セーブの書き出しと読み込み）を
// 通しで操作し、途中でエラーが出ないことを確かめる。
// 壊れたセーブ、新しすぎるセーブ、S0 のころのセーブ、前の版（build-4 まで、build-5）のセーブで開いた場合と、公開用ビルドも確かめる。
//
// 終了コード: 0 = 全部通った、1 = 落ちた項目がある、3 = この環境にはブラウザがなく、実行できない
// 結果: reports/e2e.json、reports/e2e/*.png、pipeline/reports/e2e-last.json（ソースの指紋つき）
//
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。

import { createServer } from "node:http";
import type { Server } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, devices } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import { ROOT, SRC_ROOT, runNode } from "../../scripts/lib/env.ts";
import { sourceHash } from "../../scripts/lib/source-hash.ts";

interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: StepResult[] = [];
const SHOTS = path.join(ROOT, "reports", "e2e");
/** 確認用の速度（デバッグ機能）。待ち時間を短くするために使う。 */
const SPEED = 20;

function findChromium(): string | null {
  const fromEnv = process.env["CHROMIUM_PATH"];
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const base = process.env["PLAYWRIGHT_BROWSERS_PATH"] ?? "/opt/pw-browsers";
  if (existsSync(base)) {
    for (const name of readdirSync(base).sort().reverse()) {
      if (!/^chromium-\d+$/.test(name)) continue;
      for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome"]) {
        const exe = path.join(base, name, rel);
        if (existsSync(exe)) return exe;
      }
    }
  }
  for (const exe of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) {
    if (existsSync(exe)) return exe;
  }
  return null;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".map": "application/json",
};

function serve(dir: string): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const rel = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
      const file = path.join(dir, rel === "/" ? "index.html" : rel);
      if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

const tid = (id: string): string => `[data-testid="${id}"]`;

interface Opened {
  ctx: BrowserContext;
  page: Page;
  errors: string[];
}

async function open(browser: Browser, url: string, seedSave?: string): Promise<Opened> {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  if (seedSave !== undefined) {
    // 最初の1回だけ、指定のセーブを置く（開き直したときに置き直さないように）
    await ctx.addInitScript((t) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("idle-game.save", t);
        sessionStorage.setItem("seeded", "1");
      }
    }, seedSave);
  }
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e)}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  await page.goto(url);
  await page.waitForSelector(tid("hud-stage"));
  return { ctx, page, errors };
}

async function text(page: Page, id: string): Promise<string> {
  return ((await page.locator(tid(id)).first().textContent()) ?? "").trim();
}

async function tab(page: Page, name: string): Promise<void> {
  await page.locator(tid(`tab-${name}`)).click();
}

async function savedGame(page: Page): Promise<Record<string, unknown> | null> {
  return await page.evaluate(() => {
    try {
      const env = JSON.parse(localStorage.getItem("idle-game.save") ?? "") as { state?: { game?: Record<string, unknown> } };
      return env.state?.game ?? null;
    } catch {
      return null;
    }
  });
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

/** 続きものの手順で、前の手順が落ちた（このあとの手順は、同じ画面の続きなので、実行しても意味がない）。 */
let chainBroken = false;

/** 手順を1つ実行する。chained が true の手順は、前の手順が落ちていたら実行しない（不合格として数える）。 */
async function step(name: string, run: () => Promise<string | void>, chained = false): Promise<boolean> {
  if (chained && chainBroken) {
    results.push({ name, ok: false, detail: "前の手順が落ちたので、実行していない" });
    console.log(`✘ ${name}（未実行）`);
    return false;
  }
  try {
    const detail = await run();
    results.push({ name, ok: true, detail: typeof detail === "string" ? detail : undefined });
    console.log(`✔ ${name}`);
    return true;
  } catch (e) {
    const detail = (e instanceof Error ? e.message : String(e)).split("\n").slice(0, 4).join(" / ");
    results.push({ name, ok: false, detail });
    console.log(`✘ ${name}\n    ${detail}`);
    if (chained) chainBroken = true;
    return false;
  }
}

function expect(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

async function setSpeed(page: Page, speed: number): Promise<void> {
  await tab(page, "other");
  await page.locator(tid(`dbg-speed-${speed}`)).click();
  await tab(page, "journey");
}

// ---------------------------------------------------------------- 本編

const ALL_TABS = ["journey", "members", "party", "companions", "recruit", "missions", "other"];
const PARTY_SLOTS = [0, 1, 2, 3, 4, 5];

function num(textValue: string): number {
  // 「1.23万」のような表示も数に直す
  const m = /([\d.]+)(万|億)?/.exec(textValue.replace(/,/g, ""));
  if (!m) return 0;
  return Number(m[1]) * (m[2] === "万" ? 10_000 : m[2] === "億" ? 100_000_000 : 1);
}

async function closeModal(page: Page): Promise<void> {
  await page.waitForTimeout(500);
  await page.locator(tid("modal-close")).click();
  await page.waitForSelector(tid("modal"), { state: "detached" });
}

/** ポップアップの中のボタンを押す（出た直後の押しまちがいを防ぐ待ち時間があるので、少し待ってから）。 */
async function clickIn(page: Page, testid: string): Promise<void> {
  await page.waitForSelector(tid(testid));
  await page.waitForTimeout(450);
  await page.locator(tid(testid)).click();
}

/** 挑戦のボタンを、押せるときに押し続ける。done が true を返したら終わる。 */
async function challengeUntil(page: Page, done: () => Promise<boolean>, timeoutMs: number, what: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await done()) return;
    const b = page.locator(`${tid("challenge-button")}:not([disabled])`);
    if ((await b.count()) > 0) await b.click({ timeout: 1000 }).catch(() => undefined);
    await page.waitForTimeout(120);
  }
  throw new Error(`時間内に終わらなかった: ${what}`);
}

async function grant(page: Page, testid: string, times: number): Promise<void> {
  await tab(page, "other");
  for (let i = 0; i < times; i++) await page.locator(tid(testid)).click();
}

interface SavedEquip {
  uid: number;
  defId: string;
  level: number;
  on: string | null;
}

async function savedEquips(page: Page): Promise<SavedEquip[]> {
  return ((await savedGame(page))?.["equips"] as SavedEquip[] | undefined) ?? [];
}

async function savedParty(page: Page): Promise<(string | null)[]> {
  return ((await savedGame(page))?.["party"] as (string | null)[] | undefined) ?? [];
}

/** いまの画面が、横にはみ出さず、押す場所が44px以上あるか。 */
async function checkLayout(page: Page, name: string): Promise<void> {
  const m = await page.evaluate(() => {
    const small: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("button"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 43.5 && !el.classList.contains("dbg-chip") && !el.classList.contains("member-main") && !el.classList.contains("notice")) {
        small.push(`${el.dataset["testid"] ?? el.textContent ?? ""}:${Math.round(r.height)}`);
      }
    }
    const tabs = document.getElementById("tabs")?.getBoundingClientRect();
    const labels = Array.from(document.querySelectorAll<HTMLElement>("#tabs .tab")).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent ?? "");
    // ポップアップの中身が、ポップアップの幅からはみ出していないか
    const sheet = document.querySelector<HTMLElement>('[data-testid="modal"]');
    const sheetOver = sheet ? sheet.scrollWidth > sheet.clientWidth + 1 : false;
    return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, innerH: window.innerHeight, tabsBottom: tabs?.bottom ?? -1, small, labels, sheetOver };
  });
  expect(m.scrollW <= m.innerW, `${name}: 横にはみ出している（${m.scrollW} > ${m.innerW}）`);
  expect(m.tabsBottom <= m.innerH + 0.5, `${name}: 下のタブが画面の外に出ている`);
  expect(m.small.length === 0, `${name}: 小さいボタンがある: ${m.small.join(", ")}`);
  expect(m.labels.length === 0, `${name}: タブの文字が切れている: ${m.labels.join(", ")}`);
  expect(!m.sheetOver, `${name}: ポップアップの中身が、横にはみ出している`);
}

async function mainFlow(browser: Browser, url: string): Promise<void> {
  const { ctx, page, errors } = await open(browser, url);

  await step("開くと、団員3人と 1-1 の敵が並ぶ。「挑戦」を押すまでは戦わない", async () => {
    expect((await text(page, "hud-stage")) === "1-1", `次の面が ${await text(page, "hud-stage")}`);
    await page.waitForSelector(tid("unit-0-2"));
    expect((await page.locator('.frow[data-side="0"] .unit').count()) === 3, "味方が3人ではない");
    expect((await page.locator('.frow[data-side="1"] .unit').count()) >= 1, "敵がいない");
    expect((await text(page, "challenge-button")).includes("1-1 に挑戦"), "「1-1 に挑戦」のボタンがない");
    await page.waitForTimeout(2500);
    expect((await text(page, "hud-stage")) === "1-1" && (await page.locator(tid("result-win")).count()) === 0, "押していないのに進んだ");
    expect(Number(((await savedGame(page))?.["stats"] as { battles?: number } | undefined)?.battles ?? -1) === 0, "押していないのに戦闘が始まった");
    await shot(page, "01-start");
  }, true);

  await step("どの画面も横にはみ出さず、押す場所が44px以上ある", async () => {
    for (const name of ALL_TABS) {
      await tab(page, name);
      await checkLayout(page, name);
    }
    await tab(page, "journey");
  }, true);

  await step("挑戦すると戦闘が始まり、勝つと初クリア報酬（おひねりと装備）が入る。自動では次へ進まない", async () => {
    await page.locator(tid("challenge-button")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? "").includes("戦闘中"), tid("status-text"), { timeout: 5_000 });
    expect(await page.locator(tid("challenge-button")).isDisabled(), "戦闘中なのに、挑戦のボタンが押せる");
    await page.waitForTimeout(4000);
    await shot(page, "02-battle");
    await page.waitForSelector(tid("result-win"), { timeout: 90_000 });
    const card = await text(page, "result-win");
    expect(card.includes("1-1 を突破"), "突破したと出ていない");
    expect(card.includes("装備「"), "初クリア報酬の装備が出ていない");
    expect(num(await text(page, "hud-gold")) > 0, "初クリア報酬のおひねりが入っていない");
    expect((await text(page, "hud-stage")) === "1-2", "次の面が 1-2 になっていない");
    await page.waitForTimeout(3000);
    expect((await text(page, "challenge-button")).includes("次の面（1-2）に挑戦"), "次の面に挑戦するボタンが出ていない");
    expect(Number(((await savedGame(page))?.["stats"] as { battles?: number } | undefined)?.battles ?? -1) === 1, "勝ったあと、勝手に次の戦闘が始まった");
    await shot(page, "03-win");
    // 勝ちは時間で決まるので、保存されるのは次の自動保存（10秒ごと）
    await page.waitForFunction(
      () => {
        try {
          const env = JSON.parse(localStorage.getItem("idle-game.save") ?? "") as { state?: { game?: { equips?: unknown[] } } };
          return (env.state?.game?.equips ?? []).length === 1;
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: 20_000 },
    ).catch(() => {
      throw new Error("装備が1つ手に入っていない");
    });
  }, true);

  await step("ミッションの報酬で高級チケットを10枚もらい、高級勧誘の10連を回すと、花形役者（★3）と衣装係（回復役）が来る", async () => {
    expect((await text(page, "goal-mission")).includes("達成"), "旅の画面に、ミッションの達成が出ていない");
    await page.locator(tid("goal-mission")).click();
    await page.waitForSelector(tid("claim-clear-1"));
    await shot(page, "04-missions");
    await page.locator(tid("claim-clear-1")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") === 10, tid("hud-premium"), { timeout: 5_000 });
    expect((await page.locator(`${tid("tab-recruit")} .badge:not([hidden])`).count()) === 1, "10連を回せるのに、勧誘に赤い印がない");
    await tab(page, "recruit");
    // 注意書きは「？」の中。画面には並べない
    expect(!(await page.locator(tid("panel")).innerText()).includes("10連の確定はありません"), "勧誘の画面に、注意書きが並んでいる");
    await page.locator(tid("help-recruit")).click();
    await page.waitForSelector(tid("help-list"));
    expect((await text(page, "help-list")).includes("10連の確定はありません"), "「？」に、勧誘の注意書きが出ていない");
    await checkLayout(page, "勧誘の説明");
    await page.waitForTimeout(450);
    await page.mouse.click(6, 6);
    await page.waitForSelector(tid("modal"), { state: "detached" });
    expect((await page.locator(tid("first-ten-note")).count()) === 1, "最初の10連の約束が出ていない");
    expect(await page.locator(tid("recruit-normal-1")).isDisabled(), "通常チケットがないのに、通常勧誘を回せる");
    expect(await page.locator(tid("recruit-normal-10")).isDisabled(), "通常チケットがないのに、通常勧誘の10連を回せる");
    expect((await page.locator(tid("pity-left")).count()) === 1, "天井までの回数が出ていない");
    const body = await page.locator(tid("panel")).innerText();
    expect(!body.includes("まとめて"), "勧誘の画面に「まとめて」がある");
    await shot(page, "05-recruit");
    await page.locator(tid("rates-normal")).click();
    await page.waitForSelector(tid("rates-title"));
    expect(!(await text(page, "modal")).includes("エリート"), "通常勧誘の確率の表に、エリートが出ている");
    await closeModal(page);
    await page.locator(tid("rates-premium")).click();
    await page.waitForSelector(tid("rates-title"));
    expect((await text(page, "modal")).includes("エリート"), "高級勧誘の確率の表に、エリートが出ていない");
    await checkLayout(page, "確率の表");
    await closeModal(page);
    await page.locator(tid("recruit-premium-10")).click();
    await page.waitForSelector(tid("recruit-result"));
    const rows = page.locator(`${tid("recruit-result-list")} li`);
    expect((await rows.count()) === 10, `結果が ${await rows.count()}行`);
    const list = await text(page, "recruit-result-list");
    expect(list.includes("花形役者") && list.includes("衣装係"), "最初の10連に、花形役者と衣装係が入っていない");
    expect(!list.includes("★★★★"), "★が4つ以上ある");
    await checkLayout(page, "勧誘の結果");
    await shot(page, "06-recruit-result");
    expect((await text(page, "hud-premium")) === "0", "高級チケットが減っていない");
    expect((await page.locator(`${tid("tab-recruit")} .badge:not([hidden])`).count()) === 0, "10連を回せないのに、勧誘に赤い印がある");
  }, true);

  await step("「編成の空きに入れる」で、6人そろう", async () => {
    await clickIn(page, "fill-empty");
    await page.waitForSelector(tid("modal"), { state: "detached" });
    await tab(page, "party");
    for (const i of PARTY_SLOTS) expect(!(await text(page, `slot-${i}`)).includes("空き"), `${i + 1}つ目の枠が空いたまま`);
    const party = await savedParty(page);
    expect(party.length === 6 && party.every((x) => x !== null), "編成が6人になっていない");
    expect(party.includes("h_star"), "★3 の花形役者が、編成に入っていない");
    expect((await text(page, "slot-companion")).includes("まだいません"), "相棒の枠の案内が出ていない");
    await tab(page, "journey");
    await page.waitForSelector(tid("unit-0-5"));
    expect((await page.locator('.frow[data-side="0"] .unit').count()) === 6, "戦闘の画面に、味方が6人並んでいない");
    await tab(page, "party");
    await shot(page, "07-party");
  }, true);

  await step("編成: 枠を選んで団員を入れると、入れ替わる", async () => {
    const party = await savedParty(page);
    const from = party.indexOf("h_star");
    const to = from === 0 ? 1 : 0;
    const beforeTo = await text(page, `slot-${to}`);
    const beforeFrom = await text(page, `slot-${from}`);
    await page.locator(tid(`slot-${to}`)).click();
    expect((await text(page, "party-guide")).includes("②"), "枠を選んだ案内が出ていない");
    await page.locator(tid("place-h_star")).click();
    expect((await text(page, `slot-${to}`)).includes("花形役者"), `入れた枠が ${await text(page, `slot-${to}`)}`);
    expect((await text(page, `slot-${to}`)) === beforeFrom && (await text(page, `slot-${from}`)) === beforeTo, "2人が入れ替わっていない");
    // 元に戻す
    await page.locator(tid(`slot-${from}`)).click();
    await page.locator(tid("place-h_star")).click();
    expect((await text(page, `slot-${from}`)) === beforeFrom && (await text(page, `slot-${to}`)) === beforeTo, "元に戻せていない");
  }, true);

  await step("団員（ヒーロー画面）: 一覧で選ぶと上の札が替わる。「+1」で1つ上がり、「レベルを指定」で決めたところまで上がる。まとめて全部上げるボタンはない", async () => {
    await tab(page, "members");
    const body = await page.locator(tid("panel")).innerText();
    expect(!body.includes("まとめて") && (await page.locator(tid("train-party")).count()) === 0, "まとめて稽古するボタンが残っている");
    expect((await page.locator(tid("auto-equip-party")).count()) === 0, "編成の全員のおまかせ装備が残っている");
    expect((await page.locator(`${tid("hero-card")}`).count()) === 1, "選んだ団員の札がない");
    // 絞り込みと並び替えは、1つのボタンから
    expect((await page.locator(tid("filter-3")).count()) === 0, "絞り込みのボタンが、一覧の上に並んでいる");
    await page.locator(tid("list-options")).click();
    await clickIn(page, "filter-3");
    await page.locator(tid("sort-level")).click();
    await page.waitForTimeout(450);
    await page.mouse.click(6, 6);
    await page.waitForSelector(tid("modal"), { state: "detached" });
    expect((await text(page, "list-state")) === "★3・レベル順", `表示の状態が ${await text(page, "list-state")}`);
    const tiles = await page.locator('[data-scroll-key="hero-list"] .tile').count();
    const r3 = await page.locator('[data-scroll-key="hero-list"] .tile.t-r3').count();
    expect(tiles > 0 && tiles === r3, `★3 で絞り込んでいない（${r3}/${tiles}）`);
    await page.locator(tid("list-options")).click();
    await clickIn(page, "filter-all");
    await page.locator(tid("sort-rarity")).click();
    await closeModal(page);
    await page.locator(tid("help-members")).click();
    await page.waitForSelector(tid("help-list"));
    expect((await text(page, "help-list")).includes("リセットすると"), "「？」に、団員の説明が出ていない");
    await closeModal(page);
    await checkLayout(page, "団員（10連のあと）");
    await page.locator(tid("detail-h_star")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? "").includes("花形役者"), tid("detail-title"));
    expect((await page.locator(tid("modal")).count()) === 0, "選んだだけで、ポップアップが出た");
    expect((await page.locator(`${tid("detail-h_star")}.is-selected`).count()) === 1, "選んだ札に印が付いていない");
    await page.waitForSelector(`${tid("levelup-h_star")}:not([disabled])`, { timeout: 10_000 });
    await page.locator(tid("levelup-h_star")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") === 2, tid("member-level-h_star"));
    expect((await text(page, "detail-level")) === "2", "札のレベルが変わっていない");
    expect(await page.locator(tid("levelten-h_star")).isDisabled(), "おひねりが足りないのに、+10 が押せる");
    await page.locator(tid("levelset-h_star")).click();
    await page.waitForSelector(tid("level-target"));
    expect((await text(page, "level-target")) === "3", `指定の初めの値が ${await text(page, "level-target")}`);
    await clickIn(page, "level-max");
    const target = Number(await text(page, "level-target"));
    expect(target >= 4, `上げられるところまで、が Lv ${target}`);
    expect(await page.locator(tid("level-step-p1")).isDisabled(), "おひねりが足りないレベルを指定できる");
    await page.locator(tid("level-step-m1")).click();
    expect(Number(await text(page, "level-target")) === target - 1, "−1 が効かない");
    await page.locator(tid("level-step-p1")).click();
    expect(Number(await text(page, "level-target")) === target, "+1 が効かない");
    expect(num(await text(page, "level-cost")) > 0 && num(await text(page, "level-cost")) <= num(await text(page, "hud-gold")), "要るおひねりの表示がおかしい");
    await checkLayout(page, "レベルを指定");
    await shot(page, "08-level-set");
    await page.locator(tid("level-confirm")).click();
    await page.waitForSelector(tid("modal"), { state: "detached" });
    await page.waitForFunction((args) => Number(document.querySelector(args.sel)?.textContent ?? "0") === args.want, { sel: tid("detail-level"), want: target });
    expect((await text(page, "hero-card")).includes("技"), "技の説明が出ていない");
    await checkLayout(page, "団員の札");
    await shot(page, "09-member-detail");
    return `花形役者を Lv${target} に`;
  }, true);

  await step("団員: リセットすると、レベル1に戻り、使ったおひねりが全部戻る", async () => {
    const spent = (await savedGame(page))?.["gold"];
    const refundLabel = await text(page, "reset-button");
    expect(refundLabel.includes("+"), "リセットで戻る額が出ていない");
    await page.locator(tid("reset-button")).click();
    await page.waitForSelector(tid("reset-confirm"));
    expect((await text(page, "detail-level")) !== "1", "1回押しただけで、リセットされた");
    await page.locator(tid("reset-confirm")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") === 1, tid("detail-level"));
    const back = Number((await savedGame(page))?.["gold"]);
    expect(back > Number(spent), "おひねりが戻っていない");
    expect(await page.locator(tid("reset-button")).isDisabled(), "レベル1なのに、リセットできる");
    expect((await text(page, "member-level-h_star")) === "1", "一覧のレベルが戻っていない");
    const counters = (await savedGame(page))?.["counters"] as { resets?: number } | undefined;
    expect(counters?.resets === 1, "リセットの回数が記録されていない");
    return `おひねり ${String(spent)} → ${back}`;
  }, true);

  await step("装備: 1人ずつ「おまかせ装備」で付き、「全部外す」で外れ、強化でき、付け替えられる。ポップアップは外を押しても閉じる", async () => {
    // 強化に使うおひねりを用意する（手に入った装備の★によって、要る額が変わるので）
    await grant(page, "dbg-gold", 1);
    await tab(page, "members");
    const gold0 = Number((await savedGame(page))?.["gold"]);
    const party = (await savedParty(page)).filter((id): id is string => id !== null);
    const wearer = party[0] as string;
    await page.locator(tid(`detail-${wearer}`)).click();
    await page.locator(tid("hero-tab-equip")).click();
    await page.waitForSelector(tid("unequip-all"));
    expect(await page.locator(tid("unequip-all")).isDisabled(), "何も付けていないのに、全部外すが押せる");
    await page.locator(tid("auto-equip")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel) as HTMLButtonElement | null)?.disabled === true, tid("auto-equip"), { timeout: 5_000 });
    const item = (await savedEquips(page))[0];
    expect(item !== undefined && item.on === wearer, "選んだ団員に、装備が付いていない");
    const slot = (item?.defId ?? "").split("_")[1] ?? "";
    expect(!(await text(page, `eq-${slot}`)).includes("なし"), "札に、装備が出ていない");
    // 全部外す → また「おまかせ」
    await page.locator(tid("unequip-all")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? "").includes("なし"), tid(`eq-${slot}`), { timeout: 5_000 });
    expect((await savedEquips(page))[0]?.on === null, "全部外すで、外れていない");
    await page.locator(tid("auto-equip")).click();
    await page.waitForFunction((sel) => !(document.querySelector(sel)?.textContent ?? "").includes("なし"), tid(`eq-${slot}`), { timeout: 5_000 });
    // 強化
    await page.locator(tid(`enhance-${slot}`)).click();
    await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? "").includes("+1"), tid(`eq-${slot}`), { timeout: 5_000 });
    expect(Number((await savedGame(page))?.["gold"]) < gold0, "強化しても、おひねりが減っていない");
    await checkLayout(page, "団員の札（装備）");
    await shot(page, "10-equipment");
    // 装備を選ぶポップアップ: 外を押して閉じる
    await page.locator(tid(`slot-open-${slot}`)).click();
    await page.waitForSelector(tid("slot-list"));
    await checkLayout(page, "装備を選ぶ");
    await shot(page, "11-equip-pick");
    await page.waitForTimeout(450);
    await page.mouse.click(6, 6);
    await page.waitForSelector(tid("modal"), { state: "detached", timeout: 3_000 }).catch(() => {
      throw new Error("ポップアップの外を押しても、閉じない");
    });
    // 外して、付け直す（付け直すとポップアップが閉じる）
    await page.locator(tid(`slot-open-${slot}`)).click();
    await clickIn(page, `unequip-${item?.uid}`);
    await page.waitForSelector(tid(`equip-${item?.uid}`));
    expect((await savedEquips(page))[0]?.on === null, "外せていない");
    await page.locator(tid(`equip-${item?.uid}`)).click();
    await page.waitForSelector(tid("modal"), { state: "detached" });
    const again = (await savedEquips(page))[0];
    expect(again?.on === wearer && again?.level === 1, "付け直すと、強化が消えた");
    // 別の団員に移せる（付け替えは、ただ）
    const other = party.find((id) => id !== wearer) as string;
    await page.locator(tid(`detail-${other}`)).click();
    await page.waitForSelector(tid(`slot-open-${slot}`));
    await page.locator(tid(`slot-open-${slot}`)).click();
    await page.waitForSelector(tid(`equip-${item?.uid}`));
    expect((await text(page, "slot-list")).includes("が装備中"), "ほかの団員が付けていることが出ていない");
    await clickIn(page, `equip-${item?.uid}`);
    await page.waitForSelector(tid("modal"), { state: "detached" });
    expect((await savedEquips(page))[0]?.on === other, "ほかの団員に移せていない");
  }, true);

  await step("操作しても、一覧のスクロールの位置が元に戻らない", async () => {
    await page.locator(tid("hero-tab-train")).click();
    const list = page.locator('[data-scroll-key="hero-list"]');
    await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const before = await list.evaluate((el) => el.scrollTop);
    expect(before > 20, `一覧がスクロールできない（${before}）`);
    const id = (await savedParty(page)).find((x) => x !== null) as string;
    // 札のボタン（+1）と、一覧の札（選ぶ）を押しても、位置はそのまま
    const lv = page.locator(`${tid(`levelup-${id}`)}:not([disabled])`);
    if ((await lv.count()) > 0) await lv.click();
    await page.waitForTimeout(400);
    const after1 = await list.evaluate((el) => el.scrollTop);
    const last = page.locator('[data-scroll-key="hero-list"] .tile').last();
    await last.click();
    await page.waitForTimeout(400);
    const after2 = await list.evaluate((el) => el.scrollTop);
    expect(Math.abs(after1 - before) <= 2 && Math.abs(after2 - before) <= 2, `位置が変わった（${before} → ${after1} → ${after2}）`);
    return `位置 ${before}`;
  }, true);

  await step("箱: おひねりが時間でたまっていて、受け取れる", async () => {
    await tab(page, "journey");
    await page.waitForFunction((sel) => Number((document.querySelector(sel)?.textContent ?? "0").replace(/[^\d]/g, "")) > 0, tid("idle-gold"), { timeout: 5_000 });
    const a = num(await text(page, "idle-gold"));
    await page.waitForTimeout(2200);
    const b = num(await text(page, "idle-gold"));
    expect(b > a, `開いている間に、箱が増えていない（${a} → ${b}）`);
    expect((await text(page, "idle-equips")) === "0", "始めてすぐなのに、箱に装備がある");
    const gold = Number((await savedGame(page))?.["gold"]);
    await page.locator(tid("idle-claim")).click();
    await page.waitForTimeout(300);
    expect(Number((await savedGame(page))?.["gold"]) > gold, "受け取っても、おひねりが増えていない");
    expect(Number(((await savedGame(page))?.["counters"] as { idleClaims?: number } | undefined)?.idleClaims ?? 0) === 1, "受け取った回数が記録されていない");
    return `箱: ${a} → ${b}`;
  }, true);

  await step("負けると「稽古が足りない！」と出て、団員の稽古の画面へ行ける。勝てる見込みは出さない", async () => {
    await setSpeed(page, SPEED);
    await challengeUntil(
      page,
      async () => {
        // 育てずに進めて、もしボスまで倒せてしまったら、知らせを閉じて続ける
        if ((await page.locator(tid("companion-result")).count()) > 0) await closeModal(page);
        return (await page.locator(tid("result-defeat")).count()) > 0;
      },
      240_000,
      "育てずに挑み続けて、負ける",
    );
    await setSpeed(page, 1);
    const card = await text(page, "result-defeat");
    expect(card.includes("稽古が足りない！"), "「稽古が足りない！」と出ていない");
    expect((await text(page, "challenge-button")).includes("もう一度"), "もう一度挑戦するボタンが出ていない");
    expect(!(await page.locator("body").innerText()).includes("勝てる見込み"), "勝てる見込みが出ている");
    await shot(page, "12-defeat");
    const stage = await text(page, "hud-stage");
    await page.waitForTimeout(3000);
    expect((await text(page, "hud-stage")) === stage && !(await page.locator(tid("challenge-button")).isDisabled()), "勝手に再挑戦が始まった");
    await page.locator(tid("goto-train")).click();
    await page.waitForSelector(tid("hero-card"));
    return `負けた面: ${stage}`;
  }, true);

  await step("「+10」で稽古し、装備を付けてから、もう一度挑むと勝てる", async () => {
    const stage = await text(page, "hud-stage");
    await grant(page, "dbg-gold-big", 2);
    await tab(page, "members");
    const party = (await savedParty(page)).filter((id): id is string => id !== null);
    await page.locator(tid("hero-tab-train")).click();
    for (const id of party) {
      await page.locator(tid(`detail-${id}`)).click();
      await page.waitForSelector(tid(`levelten-${id}`));
      const before = Number(await text(page, `member-level-${id}`));
      for (const add of [10, 20, 30]) {
        await page.locator(tid(`levelten-${id}`)).click();
        await page.waitForFunction((args) => Number(document.querySelector(args.sel)?.textContent ?? "0") === args.want, { sel: tid(`member-level-${id}`), want: before + add });
      }
    }
    // 装備は1人ずつ: 編成の全員に「おまかせ装備」
    await page.locator(tid("hero-tab-equip")).click();
    for (const id of party) {
      await page.locator(tid(`detail-${id}`)).click();
      await page.waitForSelector(tid("auto-equip"));
      if (!(await page.locator(tid("auto-equip")).isDisabled())) await page.locator(tid("auto-equip")).click();
    }
    const worn = (await savedEquips(page)).filter((e) => e.on !== null).length;
    expect(worn >= 4, `付いている装備が ${worn}か所`);
    await shot(page, "13-members");
    await setSpeed(page, SPEED);
    await page.locator(tid("challenge-button")).click();
    await page.waitForSelector(tid("result-win"), { timeout: 30_000 });
    expect((await text(page, "result-win")).includes(`${stage} を突破`), `${stage} を突破できていない`);
  }, true);

  await step("ボスを倒すと相棒になり、編成に入れると、戦闘の画面に出る", async () => {
    await challengeUntil(page, async () => (await page.locator(tid("companion-result")).count()) > 0 || (await page.locator(tid("companion-row-c_bear")).count()) > 0, 120_000, "1-10 のボスを倒す");
    if ((await page.locator(tid("companion-result")).count()) > 0) {
      expect((await text(page, "modal")).includes("もりのくま"), "相棒になったのが もりのくま ではない");
      await shot(page, "14-companion-join");
      await clickIn(page, "equip-companion");
      await page.waitForSelector(tid("modal"), { state: "detached" });
    } else {
      // 前の手順で、すでに相棒になっていた場合（知らせは閉じてある）
      await tab(page, "companions");
      if ((await page.locator(tid("companion-equip-c_bear")).count()) > 0) await page.locator(tid("companion-equip-c_bear")).click();
    }
    await setSpeed(page, 1);
    if ((await page.locator(tid("companion-result")).count()) > 0) await closeModal(page);
    await tab(page, "companions");
    if ((await page.locator(tid("companion-equip-c_bear")).count()) > 0) await page.locator(tid("companion-equip-c_bear")).click();
    await tab(page, "journey");
    expect((await text(page, "battle-companion")).includes("もりのくま"), "戦闘の画面に、相棒が出ていない");
    await tab(page, "members");
    expect((await page.locator(tid("member-row-c_bear")).count()) === 0, "相棒が、団員の一覧に入っている");
    await tab(page, "party");
    expect((await text(page, "slot-companion")).includes("もりのくま"), "編成の相棒の枠に入っていない");
    await tab(page, "companions");
    expect((await text(page, "companion-row-c_bear")).includes("編成中"), "相棒の画面で、編成中になっていない");
    expect((await text(page, "companion-total")).includes("体力 +2%"), "底上げの合計が出ていない");
    await shot(page, "15-companions");
  }, true);

  await step("相棒: 専用の素材とおひねりで、レベルが上がり、底上げが伸びる", async () => {
    await grant(page, "dbg-gold-big", 1);
    await grant(page, "dbg-mats", 1);
    await tab(page, "companions");
    await page.locator(tid("companion-levelup-c_bear")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") === 2, tid("companion-level-c_bear"));
    expect((await text(page, "companion-total")).includes("体力 +4%"), "レベルを上げても、底上げが伸びていない");
    await page.locator(tid("companion-unequip-c_bear")).click();
    await page.waitForSelector(tid("companion-equip-c_bear"));
    expect((await text(page, "companion-total")).includes("体力 +4%"), "編成から外すと、底上げが消えた");
    await page.locator(tid("companion-equip-c_bear")).click();
    await page.waitForSelector(tid("companion-unequip-c_bear"));
  }, true);

  await step("ダンジョン: 旅の画面から開き、挑戦して突破すると報酬。清掃は戦わずに1日2回まで", async () => {
    await setSpeed(page, SPEED);
    await page.locator(tid("goto-dungeon")).click();
    await page.waitForSelector(tid("dungeon-gold"));
    expect((await text(page, "dungeon-cleared-gold")) === "0", "まだ突破していないはず");
    await checkLayout(page, "ダンジョン");
    await shot(page, "15b-dungeon");
    const gold = Number((await savedGame(page))?.["gold"]);
    await page.locator(tid("dungeon-challenge-gold")).click();
    // 戦闘は旅の画面で見る
    await page.waitForSelector(tid("result-dungeon-win"), { timeout: 40_000 });
    expect(Number((await savedGame(page))?.["gold"]) > gold || (await text(page, "result-dungeon-win")).includes("おひねり"), "初回の報酬が出ていない");
    await setSpeed(page, 1);
    await page.locator(tid("goto-dungeon")).click();
    await page.waitForSelector(tid("dungeon-sweeps-gold"));
    expect((await text(page, "dungeon-cleared-gold")) === "1", "段階1を突破していない");
    expect((await text(page, "dungeon-sweeps-gold")) === "2", "清掃の回数が2回ではない");
    const g0 = Number((await savedGame(page))?.["gold"]);
    await page.locator(tid("dungeon-sweep-gold")).click();
    await page.waitForFunction((sel) => document.querySelector(sel)?.textContent === "1", tid("dungeon-sweeps-gold"));
    await page.locator(tid("dungeon-sweep-gold")).click();
    await page.waitForFunction((sel) => document.querySelector(sel)?.textContent === "0", tid("dungeon-sweeps-gold"));
    expect(await page.locator(tid("dungeon-sweep-gold")).isDisabled(), "3回目の清掃が押せる");
    expect(Number((await savedGame(page))?.["gold"]) > g0, "清掃しても、おひねりが増えていない");
    expect((await page.locator(`${tid("dungeon-challenge-gold")}:not([disabled])`).count()) === 1, "清掃を使い切ったら、挑戦もできなくなった");
    await page.locator(tid("help-dungeon")).click();
    await page.waitForSelector(tid("help-list"));
    expect((await text(page, "help-list")).includes("何回でも"), "「？」に、ダンジョンの説明が出ていない");
    await closeModal(page);
    await shot(page, "15c-dungeon-swept");
  }, true);

  await step("通常勧誘: 1回と10連。エリートは出ない", async () => {
    // 手持ちの通常チケットをそろえる（ミッションの報酬で、すでに何枚か持っていることがある）
    await grant(page, "dbg-ticket", 2);
    await tab(page, "recruit");
    const tickets = Number(await text(page, "recruit-tickets"));
    expect(tickets >= 20, `通常チケットが ${tickets}枚`);
    await page.locator(tid("recruit-normal-1")).click();
    await page.waitForSelector(tid("recruit-result"));
    expect((await page.locator(`${tid("recruit-result-list")} li`).count()) === 1, "1回の結果が、1行ではない");
    await closeModal(page);
    expect(Number(await text(page, "recruit-tickets")) === tickets - 1, "チケットが1枚減っていない");
    await page.locator(tid("recruit-normal-10")).click();
    await page.waitForSelector(tid("recruit-result"));
    expect((await page.locator(`${tid("recruit-result-list")} li`).count()) === 10, "10連の結果が、10行ではない");
    expect(!(await text(page, "recruit-result-list")).includes("エリート"), "通常勧誘から、エリートが出た");
    await shot(page, "16-recruit-normal-ten");
    await closeModal(page);
    expect(Number(await text(page, "recruit-tickets")) === tickets - 11, "チケットが10枚減っていない");
  }, true);

  await step("高級勧誘の10連: ★2 以上が、かならず1人は入る", async () => {
    await grant(page, "dbg-premium", 2);
    await tab(page, "recruit");
    for (let i = 0; i < 2; i++) {
      const before = Number(await text(page, "premium-tickets"));
      await page.locator(tid("recruit-premium-10")).click();
      await page.waitForSelector(tid("recruit-result"));
      expect((await page.locator(`${tid("recruit-result-list")} li`).count()) === 10, "10連の結果が、10行ではない");
      expect((await text(page, "recruit-result-list")).includes("★★"), "10連に、★2 以上が入っていない");
      await closeModal(page);
      expect(Number(await text(page, "premium-tickets")) === before - 10, "高級チケットが10枚減っていない");
    }
    expect((await page.locator(tid("first-ten-note")).count()) === 0, "最初の10連の約束が、出たまま");
    const members = Object.keys(((await savedGame(page))?.["members"] as Record<string, unknown> | undefined) ?? {}).length;
    expect(members >= 12, `団員が ${members}人`);
    await tab(page, "members");
    await checkLayout(page, "団員（増えたあと）");
    return `団員 ${members}人`;
  }, true);

  await step("ミッションと日課: 達成したものを、まとめて受け取れる", async () => {
    await tab(page, "missions");
    await shot(page, "17-missions");
    expect((await text(page, "daily-list")).includes("受け取る"), "達成した日課がない");
    const tickets = Number(await text(page, "hud-tickets"));
    await page.locator(tid("claim-all")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel) as HTMLButtonElement | null)?.disabled === true, tid("claim-all"), { timeout: 5_000 });
    expect(Number(await text(page, "hud-tickets")) > tickets, "報酬の通常チケットが入っていない");
    expect((await text(page, "daily-list")).includes("受け取り済み"), "日課が受け取り済みになっていない");
    expect((await page.locator(`${tid("mission-list")} button`).count()) === 0, "受け取れるミッションが残っている");
    await tab(page, "journey");
    await page.waitForTimeout(300);
    expect((await page.locator(tid("goal-pity")).count()) === 1, "旅の画面に、天井までの回数が出ていない");
    await shot(page, "18-journey");
  }, true);

  let before: Record<string, unknown> | null = null;
  await step("開き直しても、進み具合が残っている（レベル、編成、装備、相棒）", async () => {
    await tab(page, "members");
    const level = await text(page, "member-level-h_star");
    before = await savedGame(page);
    expect(before !== null, "セーブが保存されていない");
    const equipsBefore = JSON.stringify(await savedEquips(page));
    await page.reload();
    await page.waitForSelector(tid("hud-stage"));
    await tab(page, "members");
    expect((await text(page, "member-level-h_star")) === level, "団員のレベルが残っていない");
    const after = await savedGame(page);
    expect(Number(after?.["highestCleared"]) === Number(before?.["highestCleared"]), "突破した面が変わっている");
    expect(JSON.stringify(after?.["party"]) === JSON.stringify(before?.["party"]), "編成が変わっている");
    expect(JSON.stringify(await savedEquips(page)) === equipsBefore, "装備が変わっている");
    expect(Number(after?.["premiumTickets"]) === Number(before?.["premiumTickets"]), "高級チケットが変わっている");
    await tab(page, "companions");
    expect((await text(page, "companion-level-c_bear")) === "2", "相棒のレベルが残っていない");
    expect((await text(page, "companion-row-c_bear")).includes("編成中"), "相棒の編成が残っていない");
    return `突破 ${String(after?.["highestCleared"])}面、花形役者 Lv${level}`;
  }, true);

  await step("時間がたつと、箱におひねりと相棒の素材が貯まり、受け取れる", async () => {
    await tab(page, "journey");
    await page.locator(tid("idle-claim")).click();
    await grant(page, "dbg-time-1h", 1);
    await tab(page, "journey");
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") >= 6, tid("idle-mats-c_bear"), { timeout: 5_000 });
    expect((await text(page, "idle-box")).includes("はちみつ"), "箱に、相棒の素材の名前が出ていない");
    expect((await page.locator(tid("idle-capped")).count()) === 0, "1時間で、いっぱいになっている");
    await shot(page, "19-box");
    const g0 = await savedGame(page);
    await page.locator(tid("idle-claim")).click();
    await page.waitForTimeout(300);
    const g1 = await savedGame(page);
    expect(Number(g1?.["gold"]) > Number(g0?.["gold"]), "受け取っても、おひねりが増えていない");
    expect(Number((g1?.["materials"] as Record<string, number> | undefined)?.["c_bear"]) >= Number((g0?.["materials"] as Record<string, number> | undefined)?.["c_bear"]) + 6, "受け取っても、相棒の素材が増えていない");
  }, true);

  await step("箱は、上限（8時間ぶん）でいっぱいになる。装備も、8時間ぶん（4つ）入っている", async () => {
    await grant(page, "dbg-time-10h", 1);
    await tab(page, "journey");
    await page.waitForSelector(tid("idle-capped"), { timeout: 5_000 });
    const a = await text(page, "idle-gold");
    await page.waitForTimeout(2200);
    expect((await text(page, "idle-gold")) === a, "いっぱいなのに、増え続けている");
    expect((await text(page, "idle-mats-c_bear")) === "48", `8時間ぶんの素材は48のはず: ${await text(page, "idle-mats-c_bear")}`);
    expect((await text(page, "idle-equips")) === "4", `8時間ぶんの装備は4つのはず: ${await text(page, "idle-equips")}`);
    await shot(page, "20-box-full");
    const owned = (await savedEquips(page)).length;
    await page.locator(tid("idle-claim")).click();
    await page.waitForSelector(tid("idle-capped"), { state: "detached" });
    await page.waitForTimeout(300);
    expect((await savedEquips(page)).length === owned + 4, "箱の装備が、手持ちに入っていない");
  }, true);

  await step("日付が変わると、日課が入れ替わり、ダンジョンの清掃の回数が戻る", async () => {
    await grant(page, "dbg-time-1d", 1);
    await tab(page, "missions");
    await page.waitForFunction((sel) => !(document.querySelector(sel)?.textContent ?? "").includes("受け取り済み"), tid("daily-list"), { timeout: 5_000 });
    expect((await text(page, "mission-list")) !== "", "ミッションの一覧が消えた");
    await tab(page, "journey");
    await page.locator(tid("goto-dungeon")).click();
    await page.waitForSelector(tid("dungeon-sweeps-gold"));
    expect((await text(page, "dungeon-sweeps-gold")) === "2", "日付が変わっても、清掃の回数が戻らない");
  }, true);

  await step("セーブの書き出しと読み込みができ、壊れた文字は読み込まない", async () => {
    await tab(page, "other");
    await page.locator(tid("export-button")).click();
    const exported = await page.locator(tid("export-area")).inputValue();
    expect(exported.includes("idle-game-save"), "書き出したセーブが空");
    await page.locator(tid("import-area")).fill("これはセーブではない");
    await page.locator(tid("import-button")).click();
    expect((await text(page, "import-message")).includes("読み込めませんでした"), "壊れた文字を読み込んでしまった");
    await page.locator(tid("import-area")).fill(exported);
    await page.locator(tid("import-button")).click();
    expect((await text(page, "import-message")) === "読み込みました。", `読み込めていない: ${await text(page, "import-message")}`);
    await shot(page, "21-other");
  }, true);

  await step("ログに、プレイの記録が入っている", async () => {
    await page.locator(tid("debug-log-button")).click();
    const report = await page.locator(tid("debug-report")).inputValue();
    for (const word of [
      "プレイの記録",
      "遊んだ時間",
      "操作の内訳",
      "を突破",
      "で負け",
      "再挑戦:",
      "箱から受け取り",
      "ミッション達成",
      "勧誘（高級・10連）: ★3 ×",
      "勧誘（通常・10連）",
      "稽古（+1）",
      "稽古（+10）",
      "稽古（指定）: 花形役者",
      "リセット: 花形役者",
      "おまかせ装備（1人）",
      "装備を全部外す: ",
      "おひねりダンジョン 段階1 を突破",
      "清掃: おひねりダンジョン",
      "装備の強化",
      "もりのくま が相棒になる",
      "デバッグ機能の使用: あり",
      "--- エラー (0件) ---",
    ]) {
      expect(report.includes(word), `ログに「${word}」がない`);
    }
    await page.locator(".dbg-sheet button.ghost").click();
  }, true);

  await step("ここまで、エラーが1件も出ていない", async () => {
    expect((await page.locator(tid("debug-error-band")).count()) === 0, "エラーの帯が出ている");
    expect(errors.length === 0, errors.slice(0, 3).join(" | "));
  }, true);

  await ctx.close();
}

// ---------------------------------------------------------------- 特別なセーブで開く

async function specialSaves(browser: Browser, url: string): Promise<void> {
  await step("壊れたセーブ: 退避して、最初から遊べる", async () => {
    const { ctx, page, errors } = await open(browser, url, "{こわれた");
    expect((await text(page, "notice")).includes("退避"), "退避したと伝えていない");
    expect((await text(page, "hud-stage")) === "1-1", "最初から始まっていない");
    const backups = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes("backup")).map((k) => localStorage.getItem(k)));
    expect(backups.includes("{こわれた"), "壊れたセーブが退避されていない");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });

  await step("新しすぎる版のセーブ: 上書きしない", async () => {
    const tooNew = JSON.stringify({ format: "idle-game-save", version: 99, savedAtMs: 1, state: {} });
    const { ctx, page, errors } = await open(browser, url, tooNew);
    expect((await text(page, "notice")).includes("新しい版"), "新しい版だと伝えていない");
    // 箱に少し貯まるのを待ってから受け取る（操作のたびに保存が走るので、それでも上書きしないことを見る）
    await page.waitForTimeout(1500);
    await page.locator(tid("idle-claim")).click();
    await page.waitForTimeout(400);
    expect((await page.evaluate(() => localStorage.getItem("idle-game.save"))) === tooNew, "新しい版のセーブを上書きしてしまった");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });

  await step("S0 のころのセーブ: 起動の回数を引き継いで、ゲームが始まる", async () => {
    const old = JSON.stringify({ format: "idle-game-save", version: 1, savedAtMs: 1760100000000, state: { version: 1, createdAtMs: 1760000000000, lastSeenAtMs: 1760100000000, opens: 6, taps: 10, rngState: 12345 } });
    const { ctx, page, errors } = await open(browser, url, old);
    expect((await text(page, "hud-stage")) === "1-1", "1-1 から始まっていない");
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => (JSON.parse(localStorage.getItem("idle-game.save") ?? "{}") as { state?: { opens?: number; game?: unknown } }).state);
    expect(state?.opens === 7, `起動の回数が ${String(state?.opens)}`);
    expect(state?.game !== undefined, "ゲームの状態が保存されていない");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });

  // 2026-10-11 と 10-12 に、ユーザーの iPhone から届いたログにあったセーブそのもの
  for (const [label, file] of [
    ["第1版（build-4 まで）", "tests/fixtures/save-build-4.json"],
    ["第2版（build-5）", "tests/fixtures/save-build-5.json"],
  ] as const) {
    await step(`${label}のセーブ: 退避して、最初からになったと伝える`, async () => {
      const old = readFileSync(path.join(SRC_ROOT, file), "utf8").trim();
      const { ctx, page, errors } = await open(browser, url, old);
      const notice = await text(page, "notice");
      expect(notice.includes("最初から") && notice.includes("退避"), `知らせ: ${notice}`);
      expect((await text(page, "hud-stage")) === "1-1", "最初から始まっていない");
      expect((await text(page, "hud-gold")) === "0", "前の版のおひねりが残っている");
      expect((await text(page, "hud-tickets")) === "0" && (await text(page, "hud-premium")) === "0", "前の版のチケットが残っている");
      const backups = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes("backup")).map((k) => localStorage.getItem(k)));
      expect(backups.includes(old), "前の版のセーブが退避されていない");
      await page.waitForTimeout(400);
      const game = await savedGame(page);
      expect(game?.["v"] === 3 && Number(game?.["highestCleared"]) === 0, "新しい作りのゲームとして保存されていない");
      expect((await page.locator('.frow[data-side="0"] .unit').count()) === 3, "最初の団員3人が並んでいない");
      await page.locator(tid("notice")).click();
      expect((await page.locator(tid("notice")).isVisible()) === false, "知らせを閉じられない");
      expect(errors.length === 0, errors.join(" | "));
      await ctx.close();
    });
  }
}

// ---------------------------------------------------------------- 公開用ビルド

async function releaseBuild(browser: Browser): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "idle-release-"));
  try {
    await step("公開用ビルド: 確認用の機能が入っておらず、挑戦して勝てる", async () => {
      const built = runNode(["scripts/build.ts", "--release", "--out", dir]);
      expect(built.code === 0, `公開用ビルドに失敗: ${built.err.slice(0, 200)}`);
      const js = readFileSync(path.join(dir, "app.js"), "utf8");
      expect(!js.includes("dbg-sheet") && !js.includes("debug-log-button") && !js.includes("dbg-gold") && !js.includes("dbg-premium"), "公開用ビルドに、確認用の機能が入っている");
      const { server, url } = await serve(dir);
      try {
        const { ctx, page, errors } = await open(browser, url);
        await page.waitForSelector(tid("unit-0-0"));
        expect((await page.locator(tid("debug-log-button")).count()) === 0, "ログのボタンが出ている");
        await tab(page, "other");
        expect((await page.locator(tid("debug-panel")).count()) === 0, "確認用の機能が出ている");
        expect((await text(page, "chapters")).includes("第1章"), "旅の記録が出ていない");
        await tab(page, "journey");
        await page.locator(tid("challenge-button")).click();
        await page.waitForSelector(tid("result-win"), { timeout: 90_000 });
        expect(errors.length === 0, errors.join(" | "));
        await ctx.close();
      } finally {
        server.close();
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- 実行

const exe = findChromium();
if (exe === null) {
  console.error("この環境にはブラウザがないので、通し操作テストは実行できません（未実行）。");
  process.exit(3);
}
if (!existsSync(path.join(ROOT, "dist/index.html"))) {
  console.error("dist/ にビルドがありません。先にビルドしてください（node scripts/build.ts）。");
  process.exit(1);
}
const buildInfo = JSON.parse(readFileSync(path.join(ROOT, "dist/build.json"), "utf8")) as { buildId?: string; release?: boolean };
if (buildInfo.release === true) {
  console.error("dist/ が公開用ビルドです。確認用のビルドで実行してください（node scripts/build.ts）。");
  process.exit(1);
}

rmSync(SHOTS, { recursive: true, force: true });
const started = Date.now();
console.log("通し操作テスト（iPhone 13 の大きさ、Chromium）");
const browser = await chromium.launch({ executablePath: exe });
const { server, url } = await serve(path.join(ROOT, "dist"));
try {
  await mainFlow(browser, url);
  await specialSaves(browser, url);
  await releaseBuild(browser);
} catch (e) {
  results.push({ name: "テストの実行そのもの", ok: false, detail: e instanceof Error ? e.message : String(e) });
} finally {
  server.close();
  await browser.close();
}

const ok = results.length > 0 && results.every((r) => r.ok);
console.log(ok ? `通し操作テスト: ${results.length}件すべて合格` : "通し操作テスト: 落ちた項目があります");

const summary = {
  ok,
  at: new Date().toISOString(),
  buildId: buildInfo.buildId ?? "",
  sourceHash: sourceHash(ROOT),
  seconds: Math.round((Date.now() - started) / 1000),
  steps: results,
};
mkdirSync(path.join(ROOT, "reports"), { recursive: true });
writeFileSync(path.join(ROOT, "reports/e2e.json"), JSON.stringify(summary, null, 2) + "\n");
// 出口の検査が読む記録（履歴に残す）。ブラウザのない環境では実行できないので、結果を記録として持ち運ぶ。
const keep = path.join(SRC_ROOT, "pipeline/reports");
mkdirSync(keep, { recursive: true });
writeFileSync(path.join(keep, "e2e-last.json"), JSON.stringify(summary, null, 2) + "\n");
process.exit(ok ? 0 : 1);
