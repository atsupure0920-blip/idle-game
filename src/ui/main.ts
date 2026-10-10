// 画面の入口。実際の時刻と保存領域を扱うのはこの層だけで、ルールは core に任せる。
//
// 仕組み:
//   - 進行役（session.ts）が、ゲームの状態を持って進める。
//   - 0.2秒ごとに時間を進め、起きた出来事を画面に出し、開いている画面を描き直す。
//   - 戦闘の表示（battleview.ts）は、計算済みの戦闘を、毎フレーム時間どおりに再生する。
//   - 押せる要素は data-action を持ち、ここでまとめて受ける。

import { buildContent, isBossStage, stageLabel } from "../core/params.ts";
import type { MemberDef, Params } from "../core/params.ts";
import { currentStage, winChance } from "../core/game.ts";
import type { GameData, GameEvent } from "../core/game.ts";
import { createSession, playLogLines } from "./session.ts";
import { backupSave, isStandalone, readStore, requestPersistence, writeStore } from "./storage.ts";
import { createBattleView } from "./battleview.ts";
import { fighterName, formatDuration, formatNumber } from "./texts.ts";
import { TABS, badges, joinHtml, journeyInfoHtml, memberDetailHtml, membersHtml, offlineHtml, otherHtml, partyHtml, recruitHtml, recruitResultHtml } from "./views.ts";
import type { Tab, UiState } from "./views.ts";
import { installDebug, logEvent, openLogSheet } from "../debug/debug.ts";
import { debugPanelHtml } from "../debug/panel.ts";

const TICK_MS = 200;
const AUTOSAVE_MS = 10_000;
/** 勝てる見込みを出すときに試す戦闘の回数。 */
const CHANCE_SAMPLES = 30;
/** ポップアップが出てから、この時間はポップアップの中のボタンを受け付けない（押し間違いを防ぐ）。 */
const MODAL_GUARD_MS = 400;

function need<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`画面の要素が見つかりません: #${id}`);
  return found as T;
}

function byTestId(testId: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!found) throw new Error(`画面の要素が見つかりません: ${testId}`);
  return found;
}

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] ?? 1;
}

function start(): void {
  const content = buildContent(__PARAMS__ as Params, __MEMBERS__ as MemberDef[]);
  const session = createSession(
    { now: () => Date.now(), seed: randomSeed, read: readStore, write: writeStore, backup: (text, nowMs) => void backupSave(text, nowMs), debug: __DEBUG__ },
    content,
  );
  const p = content.params;

  const ui: UiState = {
    tab: "journey",
    selectedSlot: null,
    chance: null,
    feed: [],
    buildId: __BUILD_ID__,
    debug: __DEBUG__,
    standalone: isStandalone(),
    saveStatus: "-",
    speed: 1,
    importMessage: "",
    exportText: "",
  };

  // --- 画面の部品 ---
  const journey = need("journey");
  const panel = need("panel");
  const info = need("journey-info");
  const tabsEl = need("tabs");
  const modalRoot = need("modal-root");
  const toastRoot = need("toast-root");
  const noticeEl = byTestId("notice");
  const hudStage = byTestId("hud-stage");
  const hudGold = byTestId("hud-gold");
  const hudTickets = byTestId("hud-tickets");
  const battle = createBattleView(need("field"));

  if (__DEBUG__) {
    installDebug({
      buildId: __BUILD_ID__,
      getSaveText: () => session.saveText(),
      getPlayLines: () => playLogLines(session.playLog(), session.game(), content),
      mount: need("hud-debug"),
    });
  }
  logEvent("load", { firstRun: session.firstRun(), opens: session.state().opens, standalone: ui.standalone, highest: session.game().highestCleared });

  tabsEl.innerHTML = TABS.map(
    (t) => `<button type="button" class="tab" data-action="tab" data-tab="${t.id}" data-testid="tab-${t.id}">${t.label}<span class="badge" hidden></span></button>`,
  ).join("");

  const notices = session.notices();
  if (notices.length > 0) {
    noticeEl.textContent = notices.join(" ");
    noticeEl.hidden = false;
  }

  // --- お知らせ（下から出て消える）とポップアップ ---
  const toast = (text: string, tone: "" | "good" | "bad" = ""): void => {
    const el = document.createElement("div");
    el.className = `toast ${tone}`;
    el.textContent = text;
    toastRoot.appendChild(el);
    while (toastRoot.children.length > 3) toastRoot.firstElementChild?.remove();
    window.setTimeout(() => el.remove(), 2600);
  };

  const feed = (text: string): void => {
    ui.feed.unshift(text);
    if (ui.feed.length > 8) ui.feed.pop();
  };

  /** 順番に出すポップアップ。refresh があれば、状態が変わったときに描き直す。 */
  interface Modal {
    html: () => string;
  }
  const modals: Modal[] = [];
  let modalHtml = "";
  /** ポップアップが出た時刻。出た直後の押し間違い（連打していた指が当たる）を防ぐのに使う。 */
  let modalShownAt = 0;
  const renderModal = (): void => {
    const top = modals[0];
    const html = top ? top.html() : "";
    if (html === modalHtml) return;
    modalHtml = html;
    if (html === "") {
      modalRoot.hidden = true;
      modalRoot.innerHTML = "";
      return;
    }
    if (modalRoot.hidden) modalShownAt = Date.now();
    modalRoot.hidden = false;
    modalRoot.innerHTML = `<div class="modal" data-testid="modal">${html}</div>`;
  };
  const openModal = (html: () => string): void => {
    modals.push({ html });
    renderModal();
  };
  const closeModal = (): void => {
    modals.shift();
    modalHtml = "";
    modalRoot.hidden = true;
    modalRoot.innerHTML = "";
    renderModal();
  };

  // --- 出来事を画面に出す ---
  const showBattle = (e: Extract<GameEvent, { type: "battleStart" }>, g: GameData): void => {
    if (e.replay === null) return;
    battle.show({
      stageText: stageLabel(e.stage, p),
      boss: isBossStage(e.stage, p),
      challenge: e.stage > g.highestCleared,
      atMs: e.atMs,
      endsAtMs: e.endsAtMs,
      replay: e.replay,
      allies: e.allies,
      enemies: e.enemies,
      name: (key) => fighterName(key, content),
      gaugeMax: p.battle.gaugeMax,
      gaugePerAttack: p.battle.gaugePerAttack,
      timeLimitSec: p.battle.timeLimitSec,
    });
  };

  const handle = (events: GameEvent[]): void => {
    let lastStart: Extract<GameEvent, { type: "battleStart" }> | null = null;
    for (const e of events) {
      if (e.type === "battleStart") {
        lastStart = e;
      } else if (e.type === "win") {
        if (e.firstClear) {
          feed(`${stageLabel(e.stage, p)} を突破（+${formatNumber(e.gold)}）`);
          toast(`${stageLabel(e.stage, p)} を突破！ +${formatNumber(e.gold)}`, "good");
        }
      } else if (e.type === "defeat") {
        feed(`${stageLabel(e.stage, p)} で負け${e.timedOut ? "（時間切れ）" : ""}`);
        toast(`${stageLabel(e.stage, p)} で負け…`, "bad");
      } else if (e.type === "ticket") {
        feed("勧誘チケットを入手");
        toast("勧誘チケットを入手！", "good");
      } else if (e.type === "shard") {
        const name = content.byId[e.id]?.name ?? "";
        feed(`${name} のかけらを入手`);
        toast(`${name} のかけらを入手`, "good");
      } else if (e.type === "join") {
        const id = e.id;
        feed(`${content.byId[id]?.name ?? ""} が入団`);
        openModal(() => joinHtml(content, id));
      } else if (e.type === "offline") {
        if (e.gold > 0) {
          const text = formatDuration(e.awayMs);
          const gold = e.gold;
          const capped = e.capped;
          openModal(() => offlineHtml(text, gold, capped));
        }
      } else if (e.type === "allClear") {
        feed("すべての面を突破");
        toast("すべての面を突破しました！", "good");
      } else if (e.type === "clockBack") {
        toast("端末の時計が戻っていたので、離れていた時間は0として扱いました。");
      }
    }
    if (lastStart !== null) showBattle(lastStart, session.game());
  };

  // --- 描画 ---
  let chanceKey = "";
  const refreshChance = (g: GameData): void => {
    if (g.challenging) {
      chanceKey = "";
      ui.chance = null;
      return;
    }
    const key = `${g.highestCleared}|${g.party.map((id) => (id === null ? "-" : `${id}:${g.members[id]?.level ?? 0}:${g.members[id]?.star ?? 0}`)).join(",")}`;
    if (key === chanceKey) return;
    chanceKey = key;
    ui.chance = winChance(g, content, CHANCE_SAMPLES);
  };

  const lastHtml: Record<string, string> = {};
  const setHtml = (target: HTMLElement, key: string, html: string): void => {
    if (lastHtml[key] === html) return;
    lastHtml[key] = html;
    // 入力の途中の文字（セーブの読み込み欄）は、描き直しても残す
    const area = target.querySelector<HTMLTextAreaElement>('[data-testid="import-area"]');
    const typed = area ? area.value : "";
    target.innerHTML = html;
    if (typed !== "") {
      const again = target.querySelector<HTMLTextAreaElement>('[data-testid="import-area"]');
      if (again) again.value = typed;
    }
  };

  let lastGold = -1;
  const render = (): void => {
    const g = session.game();
    refreshChance(g);
    ui.saveStatus = !session.canSave() ? "保存しない" : session.lastSaveOk() ? "保存済み" : "保存に失敗";
    ui.speed = session.speed();

    hudStage.textContent = stageLabel(currentStage(g, content), p);
    hudGold.textContent = formatNumber(g.gold);
    hudTickets.textContent = String(g.tickets);
    if (lastGold >= 0 && g.gold > lastGold) {
      hudGold.classList.remove("pop");
      void hudGold.offsetWidth;
      hudGold.classList.add("pop");
    }
    lastGold = g.gold;

    const b = badges(g, content);
    for (const btn of Array.from(tabsEl.querySelectorAll<HTMLElement>(".tab"))) {
      const id = btn.dataset["tab"] as Tab;
      btn.classList.toggle("active", id === ui.tab);
      const badge = btn.querySelector<HTMLElement>(".badge");
      if (badge) badge.hidden = !b[id] || id === ui.tab;
    }

    const onJourney = ui.tab === "journey";
    journey.hidden = !onJourney;
    panel.hidden = onJourney;
    if (onJourney) {
      setHtml(info, "journey", journeyInfoHtml(g, content, ui));
    } else if (ui.tab === "members") {
      setHtml(panel, "panel", membersHtml(g, content));
    } else if (ui.tab === "party") {
      setHtml(panel, "panel", partyHtml(g, content, ui));
    } else if (ui.tab === "recruit") {
      setHtml(panel, "panel", recruitHtml(g, content));
    } else {
      setHtml(panel, "panel", otherHtml(g, content, ui, __DEBUG__ ? debugPanelHtml(ui.speed) : ""));
    }
    renderModal();
  };

  // --- 操作 ---
  const firstEmptySlot = (): number | null => {
    const i = session.game().party.indexOf(null);
    return i >= 0 ? i : null;
  };

  const setTab = (tab: Tab): void => {
    ui.tab = tab;
    ui.selectedSlot = tab === "party" ? firstEmptySlot() : null;
    panel.scrollTop = 0;
  };

  const fail = (reason: string | undefined): void => {
    if (reason) toast(reason, "bad");
  };

  const onAction = (el: HTMLElement): void => {
    const action = el.dataset["action"] ?? "";
    const id = el.dataset["id"] ?? "";
    switch (action) {
      case "tab":
        setTab((el.dataset["tab"] ?? "journey") as Tab);
        break;
      case "retry": {
        const r = session.retry();
        if (!r.ok) fail(r.reason);
        break;
      }
      case "claim":
      case "claim-close": {
        const gold = session.game().idleGold;
        const r = session.claimIdle();
        if (r.ok) toast(`放置報酬 +${formatNumber(gold)}`, "good");
        if (action === "claim-close") closeModal();
        break;
      }
      case "levelup": {
        const r = session.levelUp(id);
        if (!r.ok) fail(r.reason);
        break;
      }
      case "promote": {
        const r = session.promote(id);
        if (r.ok) toast(`${content.byId[id]?.name ?? ""} が昇格！`, "good");
        else fail(r.reason);
        break;
      }
      case "detail":
        openModal(() => memberDetailHtml(session.game(), content, id));
        break;
      case "slot": {
        const slot = Number(el.dataset["slot"]);
        ui.selectedSlot = ui.selectedSlot === slot ? null : slot;
        break;
      }
      case "place": {
        if (ui.selectedSlot === null) break;
        const r = session.setSlot(ui.selectedSlot, id);
        if (r.ok) ui.selectedSlot = firstEmptySlot();
        else fail(r.reason);
        break;
      }
      case "remove": {
        if (ui.selectedSlot === null) break;
        const r = session.setSlot(ui.selectedSlot, null);
        if (!r.ok) fail(r.reason);
        break;
      }
      case "recruit": {
        const r = session.recruit();
        if (r.ok && r.id) {
          const rid = r.id;
          const dup = r.duplicate === true;
          openModal(() => recruitResultHtml(session.game(), content, rid, dup));
        } else fail(r.reason);
        break;
      }
      case "place-empty": {
        const slot = firstEmptySlot();
        if (slot !== null) {
          const r = session.setSlot(slot, id);
          if (r.ok) toast(`${content.byId[id]?.name ?? ""} を編成に入れました`, "good");
        }
        closeModal();
        break;
      }
      case "goto-party":
        closeModal();
        setTab("party");
        break;
      case "close-modal":
        closeModal();
        break;
      case "dismiss-notice":
        noticeEl.hidden = true;
        break;
      case "export":
        ui.exportText = session.exportSave();
        break;
      case "copy-export":
        void navigator.clipboard?.writeText(ui.exportText).then(
          () => toast("コピーしました", "good"),
          () => toast("コピーできませんでした。欄を長押しして、すべて選択してコピーしてください。", "bad"),
        );
        break;
      case "import": {
        const area = panel.querySelector<HTMLTextAreaElement>('[data-testid="import-area"]');
        const r = session.importSave(area ? area.value : "");
        ui.importMessage = r.ok ? "読み込みました。" : `読み込めませんでした: ${r.reason ?? ""}`;
        if (r.ok && area) area.value = "";
        logEvent("import", { ok: r.ok, reason: r.reason ?? "" });
        break;
      }
      case "dbg-speed":
        session.debugSetSpeed(Number(el.dataset["v"]));
        break;
      case "dbg-time":
        session.debugAddTime(Number(el.dataset["ms"]));
        toast("時間を送りました");
        break;
      case "dbg-grant":
        session.debugGrant(Number(el.dataset["gold"]), Number(el.dataset["tickets"]));
        break;
      case "dbg-reset":
        if (el.dataset["armed"] === "1") {
          session.debugReset();
          ui.feed = [];
          ui.exportText = "";
          ui.importMessage = "";
          lastHtml["panel"] = "";
          setTab("journey");
          toast("最初からやり直しました");
        } else {
          el.dataset["armed"] = "1";
          el.textContent = "もう一度押すと、最初からになります";
          return; // 描き直すと、押した状態が消えるので
        }
        break;
      case "dbg-log":
        if (__DEBUG__) openLogSheet();
        break;
      default:
        break;
    }
    // 操作のあとは、すぐに時間を進めて描き直す（再挑戦の戦闘などを、待たせずに始める）
    handle(session.tick());
    render();
  };

  document.addEventListener("click", (ev) => {
    const target = ev.target instanceof Element ? ev.target.closest<HTMLElement>("[data-action]") : null;
    if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
    if (modalRoot.contains(target) && Date.now() - modalShownAt < MODAL_GUARD_MS) return;
    onAction(target);
  });

  // --- 進行 ---
  let lastSaveAt = Date.now();
  const frame = (): void => {
    handle(session.tick());
    render();
    const t = Date.now();
    if (t - lastSaveAt >= AUTOSAVE_MS) {
      lastSaveAt = t;
      session.save();
    }
  };
  window.setInterval(frame, TICK_MS);

  const animate = (): void => {
    if (ui.tab === "journey") battle.update(session.now());
    window.requestAnimationFrame(animate);
  };
  window.requestAnimationFrame(animate);

  // 画面を閉じる直前にも保存する。戻ってきたら、すぐに時間を進める。
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") session.save();
    else frame();
  });
  window.addEventListener("pagehide", () => session.save());

  frame();
  session.save();
  void requestPersistence().then((granted) => logEvent("persist", { granted: String(granted) }));
}

start();
