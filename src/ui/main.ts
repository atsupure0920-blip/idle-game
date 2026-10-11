// 画面の入口（第3版）。実際の時刻と保存領域を扱うのはこの層だけで、ルールは core に任せる。
//
// 仕組み:
//   - 進行役（session.ts）が、ゲームの状態を持って進める。
//   - 0.2秒ごとに時間を進め、起きた出来事を画面に出し、開いている画面を描き直す。
//   - 戦闘の表示（battleview.ts）は、計算済みの戦闘を、毎フレーム時間どおりに再生する。
//   - 押せる要素は data-action を持ち、ここでまとめて受ける。

import { buildContent, isBossStage, levelCap, stageLabel } from "../core/params.ts";
import type { BannerId, ContentData, EquipSlot } from "../core/params.ts";
import { FRONT_SIZE, allySpecs, battleStats, dailyList, enemySpecs, idlePending, maxAffordableLevel, missionList, nextStage } from "../core/game.ts";
import type { GameEvent, RewardAmounts } from "../core/game.ts";
import { createSession, playLogLines } from "./session.ts";
import { backupSave, isStandalone, readStore, requestPersistence, writeStore } from "./storage.ts";
import { createBattleView } from "./battleview.ts";
import { equipName, fighterName, formatNumber, rewardText } from "./texts.ts";
import {
  TABS,
  badges,
  companionJoinHtml,
  companionsHtml,
  journeyInfoHtml,
  journeyLive,
  memberModalHtml,
  membersHtml,
  missionsHtml,
  otherHtml,
  partyHtml,
  ratesHtml,
  recruitHtml,
  recruitResultHtml,
} from "./views.ts";
import type { Tab, UiState } from "./views.ts";
import { installDebug, logEvent, openLogSheet } from "../debug/debug.ts";
import { debugPanelHtml } from "../debug/panel.ts";

const TICK_MS = 200;
const AUTOSAVE_MS = 10_000;
/** ポップアップが出てから、この時間はポップアップの中のボタンを受け付けない（押し間違いを防ぐ）。 */
const MODAL_GUARD_MS = 400;
/** これより長く離れていたら、戻ったときに「箱に貯まっています」と知らせる。 */
const WELCOME_BACK_MS = 5 * 60_000;

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

/** 端末の日付の通し番号（端末の時間帯での「日」。日課の入れ替えに使う）。 */
function localDayKey(ms: number): number {
  return Math.floor((ms - new Date(ms).getTimezoneOffset() * 60_000) / 86_400_000);
}

function start(): void {
  const content = buildContent(__CONTENT__ as ContentData);
  const session = createSession(
    { now: () => Date.now(), seed: randomSeed, dayKey: localDayKey, read: readStore, write: writeStore, backup: (text, nowMs) => void backupSave(text, nowMs), debug: __DEBUG__ },
    content,
  );
  const p = content.params;

  const ui: UiState = {
    tab: "journey",
    selectedSlot: null,
    result: null,
    detail: null,
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
  const hudPremium = byTestId("hud-premium");
  const otherButton = byTestId("tab-other");
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

  /** 順番に出すポップアップ。中身は、状態が変わるたびに作り直す。 */
  interface Modal {
    html: () => string;
    /** 団員の詳細か（閉じるときに、画面の状態も片づける）。 */
    detail?: boolean;
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
  const openModal = (html: () => string, detail = false): void => {
    modals.push({ html, detail });
    renderModal();
  };
  const closeModal = (): void => {
    // 団員の詳細は、開いているあいだ ui.detail を持つ。閉じたら消す
    if (modals[0]?.detail === true) ui.detail = null;
    modals.shift();
    modalHtml = "";
    modalRoot.hidden = true;
    modalRoot.innerHTML = "";
    renderModal();
  };

  // --- 出来事を画面に出す ---
  const handle = (events: GameEvent[]): void => {
    for (const e of events) {
      if (e.type === "win") {
        ui.result = { type: "win", stage: e.stage, reward: e.reward, equipDefId: e.equipDefId, companionId: null };
        feed(`${stageLabel(e.stage, p)} を突破（${rewardText(e.reward)}）`);
        // 旅の画面では、結果の欄に出るので、ほかの画面を見ているときだけ知らせる
        if (ui.tab !== "journey") toast(`${stageLabel(e.stage, p)} を突破！ おひねり +${formatNumber(e.reward.gold)}`, "good");
      } else if (e.type === "defeat") {
        ui.result = { type: "defeat", stage: e.stage, timedOut: e.timedOut };
        feed(`${stageLabel(e.stage, p)} で負け${e.timedOut ? "（時間切れ）" : ""}`);
        toast(`${stageLabel(e.stage, p)} で負け… 稽古が足りない！`, "bad");
      } else if (e.type === "companion") {
        const id = e.id;
        if (ui.result !== null && ui.result.type === "win") ui.result = { ...ui.result, companionId: id };
        feed(`${content.companionById[id]?.name ?? ""} が相棒になった`);
        openModal(() => companionJoinHtml(session.game(), content, id));
      } else if (e.type === "dailyReset") {
        toast("日付が変わり、日課が入れ替わりました。");
      } else if (e.type === "allClear") {
        feed("すべての面を突破");
        toast("すべての面を突破しました！", "good");
      } else if (e.type === "clockBack") {
        toast("端末の時計が戻っていたので、離れていた時間は0として扱いました。");
      }
    }
  };

  // --- 戦闘の表示（戦闘中は再生、それ以外は次の面の顔ぶれ） ---
  let fieldKey = "";
  const syncField = (): void => {
    const g = session.game();
    const name = (key: string): string => fighterName(key, content);
    const companionName = g.companionSlot === null ? null : (content.companionById[g.companionSlot]?.name ?? null);
    const rep = session.replay();
    if (g.battle !== null && rep !== null) {
      const key = `battle|${rep.stage}|${rep.startedAtMs}`;
      if (key === fieldKey) return;
      fieldKey = key;
      battle.show({
        stageText: stageLabel(rep.stage, p),
        boss: isBossStage(rep.stage, p),
        atMs: rep.startedAtMs,
        endsAtMs: rep.endsAtMs,
        replay: rep.replay,
        allies: rep.allies,
        enemies: rep.enemies,
        companionName: rep.companion === null ? null : (content.companionById[rep.companion.key]?.name ?? null),
        name,
        gaugeMax: p.battle.gaugeMax,
        gaugePerAttack: p.battle.gaugePerAttack,
        timeLimitSec: p.battle.timeLimitSec,
      });
      return;
    }
    // 戦闘中でも、開き直したあとは再生用のデータがないので、顔ぶれだけ出して結果を待つ
    const stage = g.battle !== null ? g.battle.stage : nextStage(g, content);
    const allies = allySpecs(g, content);
    const key = `preview|${g.battle !== null ? "wait" : ""}|${stage ?? "-"}|${companionName ?? "-"}|${allies.map((a) => `${a.key}:${a.row}:${a.hp}`).join(",")}`;
    if (key === fieldKey) return;
    fieldKey = key;
    battle.preview({
      stageText: stage === null ? "" : stageLabel(stage, p),
      boss: stage !== null && isBossStage(stage, p),
      allies,
      enemies: stage === null ? [] : enemySpecs(stage, content),
      companionName,
      name,
      banner: g.battle !== null ? "戦闘中…" : undefined,
    });
  };

  // --- 描画 ---
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

  /** 時間とともに変わる値を、要素に書き込む（HTML ごとは描き直さない）。 */
  const applyLive = (root: HTMLElement, values: Record<string, string>): void => {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-live]"))) {
      const v = values[el.dataset["live"] ?? ""];
      if (v !== undefined && el.textContent !== v) el.textContent = v;
    }
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-live-width]"))) {
      const v = values[el.dataset["liveWidth"] ?? ""];
      if (v !== undefined && el.style.width !== v) el.style.width = v;
    }
  };

  let lastGold = -1;
  const render = (): void => {
    const g = session.game();
    const now = session.now();
    ui.saveStatus = !session.canSave() ? "保存しない" : session.lastSaveOk() ? "保存済み" : "保存に失敗";
    ui.speed = session.speed();

    const next = nextStage(g, content);
    hudStage.textContent = next === null ? "達成" : stageLabel(next, p);
    hudGold.textContent = formatNumber(g.gold);
    hudTickets.textContent = String(g.tickets);
    hudPremium.textContent = String(g.premiumTickets);
    if (lastGold >= 0 && g.gold > lastGold) {
      hudGold.classList.remove("pop");
      void hudGold.offsetWidth;
      hudGold.classList.add("pop");
    }
    lastGold = g.gold;

    const b = badges(g, content, now);
    for (const btn of Array.from(tabsEl.querySelectorAll<HTMLElement>(".tab"))) {
      const id = btn.dataset["tab"] as Tab;
      btn.classList.toggle("active", id === ui.tab);
      const badge = btn.querySelector<HTMLElement>(".badge");
      if (badge) badge.hidden = !b[id] || id === ui.tab;
    }
    otherButton.classList.toggle("active", ui.tab === "other");

    syncField();
    const onJourney = ui.tab === "journey";
    journey.hidden = !onJourney;
    panel.hidden = onJourney;
    if (onJourney) {
      setHtml(info, "journey", journeyInfoHtml(g, content, ui, now));
      applyLive(info, journeyLive(g, content, now));
    } else if (ui.tab === "members") {
      setHtml(panel, "panel", membersHtml(g, content));
    } else if (ui.tab === "party") {
      setHtml(panel, "panel", partyHtml(g, content, ui));
    } else if (ui.tab === "companions") {
      setHtml(panel, "panel", companionsHtml(g, content));
    } else if (ui.tab === "recruit") {
      setHtml(panel, "panel", recruitHtml(g, content));
    } else if (ui.tab === "missions") {
      setHtml(panel, "panel", missionsHtml(g, content));
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

  /** 達成したミッションと日課を、まとめて受け取る。受け取った件数と、合計を返す。 */
  const claimAll = (): { count: number; total: RewardAmounts } => {
    const total: RewardAmounts = { gold: 0, tickets: 0, premiumTickets: 0, mats: 0 };
    let count = 0;
    for (let guard = 0; guard < 200; guard++) {
      const g = session.game();
      const mission = missionList(g, content).find((m) => m.claimable);
      const daily = mission ? undefined : dailyList(g, content).find((d) => d.claimable);
      const r = mission ? session.claimMission(mission.def.id) : daily ? session.claimDaily(daily.def.id) : null;
      if (r === null || !r.ok || !r.reward) break;
      count += 1;
      total.gold += r.reward.gold;
      total.tickets += r.reward.tickets;
      total.premiumTickets += r.reward.premiumTickets;
      total.mats += r.reward.mats;
    }
    return { count, total };
  };

  const onAction = (el: HTMLElement): void => {
    const action = el.dataset["action"] ?? "";
    const id = el.dataset["id"] ?? "";
    switch (action) {
      case "tab":
        setTab((el.dataset["tab"] ?? "journey") as Tab);
        break;
      case "goto-members":
        setTab("members");
        break;
      case "challenge": {
        const r = session.challenge();
        if (r.ok) ui.result = null;
        else fail(r.reason);
        break;
      }
      case "collect": {
        const r = session.collectIdle();
        if (r.ok) {
          const mats = Object.entries(r.mats ?? {})
            .map(([cid, n]) => `${content.companionById[cid]?.material ?? ""} +${n}`)
            .join("、");
          const equips = (r.equips ?? []).length;
          toast(`箱から おひねり +${formatNumber(r.gold ?? 0)}${mats ? `、${mats}` : ""}${equips > 0 ? `、装備 +${equips}` : ""}`, "good");
        } else fail(r.reason);
        break;
      }
      case "levelup": {
        // 「+1」と「+10」。+10 は、上限が近ければ上限まで
        const own = session.game().members[id];
        const def = content.byId[id];
        if (!own || !def) break;
        const ten = el.dataset["n"] === "10";
        const target = ten ? Math.min(own.level + 10, levelCap(def, own.plus, p)) : own.level + 1;
        const r = session.levelUpTo(id, target, ten ? "+10" : "+1");
        if (r.ok && ten) toast(`${def.name} のレベル +${r.levels ?? 0}`, "good");
        else if (!r.ok) fail(r.reason);
        break;
      }
      case "detail":
        ui.detail = { id, view: "main", slot: null, target: 0, resetArmed: false };
        openModal(() => (ui.detail ? memberModalHtml(session.game(), content, ui.detail) : ""), true);
        break;
      case "level-open": {
        const own = session.game().members[id !== "" ? id : (ui.detail?.id ?? "")];
        const mid = id !== "" ? id : (ui.detail?.id ?? "");
        if (!own) break;
        const wasOpen = ui.detail !== null;
        ui.detail = { id: mid, view: "level", slot: null, target: own.level + 1, resetArmed: false };
        if (!wasOpen) openModal(() => (ui.detail ? memberModalHtml(session.game(), content, ui.detail) : ""), true);
        break;
      }
      case "level-step":
      case "level-max": {
        const d = ui.detail;
        const own = d ? session.game().members[d.id] : undefined;
        if (!d || !own) break;
        const max = Math.max(own.level + 1, maxAffordableLevel(session.game(), d.id, content));
        const current = Math.max(own.level + 1, Math.min(d.target, max));
        const next = action === "level-max" ? max : current + Number(el.dataset["d"] ?? "0");
        ui.detail = { ...d, target: Math.max(own.level + 1, Math.min(next, max)) };
        break;
      }
      case "level-confirm": {
        const d = ui.detail;
        const own = d ? session.game().members[d.id] : undefined;
        if (!d || !own) break;
        const max = Math.max(own.level + 1, maxAffordableLevel(session.game(), d.id, content));
        const target = Math.max(own.level + 1, Math.min(d.target, max));
        const r = session.levelUpTo(d.id, target, "指定");
        if (r.ok) {
          toast(`${content.byId[d.id]?.name ?? ""} を Lv ${target} に上げました（+${r.levels ?? 0}）`, "good");
          ui.detail = { ...d, view: "main" };
        } else fail(r.reason);
        break;
      }
      case "detail-back":
        if (ui.detail) ui.detail = { ...ui.detail, view: "main", slot: null, resetArmed: false };
        break;
      case "reset":
        if (ui.detail) ui.detail = { ...ui.detail, resetArmed: true };
        break;
      case "reset-confirm": {
        const d = ui.detail;
        if (!d) break;
        const r = session.resetLevel(d.id);
        if (r.ok) toast(`${content.byId[d.id]?.name ?? ""} をリセットしました。おひねり +${formatNumber(r.refund ?? 0)}`, "good");
        else fail(r.reason);
        ui.detail = { ...d, resetArmed: false };
        break;
      }
      case "promote": {
        const r = session.promote(id);
        if (r.ok) toast(`${content.byId[id]?.name ?? ""} が昇格！（+${session.game().members[id]?.plus ?? 0}）`, "good");
        else fail(r.reason);
        break;
      }
      case "slot-open":
        if (ui.detail) ui.detail = { ...ui.detail, view: "slot", slot: (el.dataset["slot"] ?? "weapon") as EquipSlot, resetArmed: false };
        break;
      case "equip": {
        const d = ui.detail;
        if (!d) break;
        const r = session.equip(Number(el.dataset["uid"]), d.id);
        if (r.ok) ui.detail = { ...d, view: "main", slot: null };
        else fail(r.reason);
        break;
      }
      case "unequip": {
        const r = session.unequip(Number(el.dataset["uid"]));
        if (!r.ok) fail(r.reason);
        break;
      }
      case "enhance": {
        const uid = Number(el.dataset["uid"]);
        const r = session.enhance(uid);
        if (r.ok) {
          const item = session.game().equips.find((e) => e.uid === uid);
          const def = item ? content.equipById[item.defId] : undefined;
          if (item && def) toast(`${equipName(def, item.level)} に強化しました`, "good");
        } else fail(r.reason);
        break;
      }
      case "auto-equip": {
        const r = session.autoEquip(id);
        if (r.ok) toast(`装備を ${r.changed ?? 0}か所、付け替えました`, "good");
        else fail(r.reason);
        break;
      }
      case "auto-equip-party": {
        const r = session.autoEquipParty();
        if (r.ok) toast(`編成の装備を ${r.changed ?? 0}か所、付け替えました`, "good");
        else fail(r.reason);
        break;
      }
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
        const banner = (el.dataset["banner"] === "premium" ? "premium" : "normal") as BannerId;
        const r = session.recruit(banner, Number(el.dataset["count"] ?? "1"));
        if (r.ok && r.results) {
          const outcomes = r.results;
          openModal(() => recruitResultHtml(session.game(), content, outcomes));
        } else fail(r.reason);
        break;
      }
      case "rates": {
        const banner = (el.dataset["banner"] === "premium" ? "premium" : "normal") as BannerId;
        openModal(() => ratesHtml(session.game(), content, banner));
        break;
      }
      case "fill-empty": {
        // 編成の空きを、控えの団員で埋める（レア度の高い順。同じなら、能力の高い順）
        let placed = 0;
        for (let guard = 0; guard < 6; guard++) {
          const g = session.game();
          const slot = g.party.indexOf(null);
          if (slot < 0) break;
          const rank = (mid: string): number => {
            const r = p.recruit.rarities[content.byId[mid]?.rarity ?? ""];
            return (r?.stars ?? 0) * 10 + (r?.statMult ?? 0);
          };
          const bench = Object.keys(g.members)
            .filter((mid) => !g.party.includes(mid))
            .sort((a, b) => rank(b) - rank(a));
          const best = bench[0];
          if (best === undefined || !session.setSlot(slot, best).ok) break;
          placed += 1;
        }
        // 体力の高い団員を前列へ（敵は前列を先に狙うので）
        if (placed > 0) {
          for (let guard = 0; guard < 6; guard++) {
            const g = session.game();
            const hp = (mid: string): number => battleStats(g, mid, content)?.hp ?? 0;
            const ids = g.party.filter((x): x is string => x !== null).sort((a, b) => hp(b) - hp(a));
            const sturdy = ids.slice(0, Math.min(FRONT_SIZE, ids.length));
            const frontSlot = g.party.findIndex((x, i) => i < FRONT_SIZE && (x === null || !sturdy.includes(x)));
            const backSlot = g.party.findIndex((x, i) => i >= FRONT_SIZE && x !== null && sturdy.includes(x));
            if (frontSlot < 0 || backSlot < 0) break;
            if (!session.setSlot(frontSlot, g.party[backSlot] as string).ok) break;
          }
          toast(`${placed}人を編成に入れ、体力の高い順に前列へ並べました`, "good");
        }
        closeModal();
        break;
      }
      case "companion-equip":
      case "equip-close": {
        const r = session.setCompanion(id);
        if (r.ok) toast(`${content.companionById[id]?.name ?? ""} を編成に入れました`, "good");
        else if (action === "companion-equip") fail(r.reason);
        if (action === "equip-close") closeModal();
        break;
      }
      case "companion-unequip": {
        const r = session.setCompanion(null);
        if (!r.ok) fail(r.reason);
        break;
      }
      case "companion-levelup": {
        const r = session.companionLevelUp(id);
        if (r.ok) toast(`${content.companionById[id]?.name ?? ""} のレベルが上がりました`, "good");
        else fail(r.reason);
        break;
      }
      case "claim-mission":
      case "claim-daily": {
        const r = action === "claim-mission" ? session.claimMission(id) : session.claimDaily(id);
        if (r.ok && r.reward) toast(`報酬: ${rewardText(r.reward)}`, "good");
        else fail(r.reason);
        break;
      }
      case "claim-all": {
        const r = claimAll();
        if (r.count > 0) toast(`${r.count}件の報酬: ${rewardText(r.total)}`, "good");
        else fail("受け取れる報酬がありません");
        break;
      }
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
        if (r.ok) {
          if (area) area.value = "";
          ui.result = null;
          ui.feed = [];
        }
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
        session.debugGrant({ gold: Number(el.dataset["gold"]), tickets: Number(el.dataset["tickets"]), premiumTickets: Number(el.dataset["premium"]), mats: Number(el.dataset["mats"]) });
        break;
      case "dbg-reset":
        if (el.dataset["armed"] === "1") {
          session.debugReset();
          ui.feed = [];
          ui.result = null;
          ui.detail = null;
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
    // 操作のあとは、すぐに時間を進めて描き直す
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
  if (!session.firstRun() && session.awayMs() >= WELCOME_BACK_MS && idlePending(session.game(), session.now(), content).gold > 0) {
    toast("おかえりなさい。箱に、おひねりが貯まっています。", "good");
  }
  void requestPersistence().then((granted) => logEvent("persist", { granted: String(granted) }));
}

start();
