// 各画面の中身（HTML の文字列）を作る（第2版）。ルールは持たず、core が返した値を並べるだけ。
// 文字列を返すだけなので、ブラウザがなくてもテストできる。
//
// 押せる要素には data-action を付ける（main.ts がまとめて受ける）。
// 値を表示する要素と押せる要素には data-testid を付ける（通し操作テストが使う）。
// 時間とともに変わり続ける数（箱の中身）は、data-live を付けた要素に main.ts があとから書き込む
// （HTML ごと描き直すと、押している途中のボタンが作り直されて、押し損ねるため）。

import {
  PARTY_SIZE,
  allCleared,
  battleStats,
  companionLevelInfo,
  dailyList,
  idlePending,
  levelUpInfo,
  missionList,
  nextGoals,
  nextStage,
  ownedCount,
  partyPower,
  passiveMult,
  promoteInfo,
  recruitRates,
} from "../core/game.ts";
import type { GameData, GoalView, RewardAmounts } from "../core/game.ts";
import { chapterOf, companionSkillPower, idleGoldPerMin, isBossStage, levelCap, maxStar, memberPower, stageLabel } from "../core/params.ts";
import type { CompanionDef, Content, DailyDef, MemberDef, MissionDef } from "../core/params.ts";
import { ROLE_LABEL, TRAIT_LABEL, TRAIT_TEXT, companionSkillText, escapeHtml, formatDuration, formatNumber, passiveText, rewardText, skillText } from "./texts.ts";

export type Tab = "journey" | "members" | "party" | "companions" | "recruit" | "missions" | "other";

/** 下に並べるタブ。「その他」は、上の帯のボタンから開く。 */
export const TABS: { id: Tab; label: string }[] = [
  { id: "journey", label: "旅" },
  { id: "members", label: "団員" },
  { id: "party", label: "編成" },
  { id: "companions", label: "相棒" },
  { id: "recruit", label: "勧誘" },
  { id: "missions", label: "ミッション" },
];

/** 直前の挑戦の結果（旅の画面に出す）。 */
export type LastResult =
  | { type: "win"; stage: number; reward: RewardAmounts; companionId: string | null }
  | { type: "defeat"; stage: number; timedOut: boolean };

/** 画面だけが持つ状態（セーブには入らない）。 */
export interface UiState {
  tab: Tab;
  /** 編成の画面で選んでいる枠（選んでいなければ null）。 */
  selectedSlot: number | null;
  /** 直前の挑戦の結果（まだなければ null）。 */
  result: LastResult | null;
  /** 最近の出来事（新しいものが先頭）。 */
  feed: string[];
  buildId: string;
  debug: boolean;
  standalone: boolean;
  saveStatus: string;
  speed: number;
  /** セーブの読み込みの結果（その他の画面に出す）。 */
  importMessage: string;
  /** 書き出したセーブ（その他の画面に出す。出していなければ空）。 */
  exportText: string;
}

const FRONT = PARTY_SIZE / 2;
/** 箱に、これだけの時間ぶん貯まったら、旅のタブに印を付ける。 */
const BOX_BADGE_MS = 5 * 60_000;

function stars(n: number): string {
  return n > 0 ? "★".repeat(n) : "";
}

function tags(def: MemberDef): string {
  const trait = def.trait ? `<span class="tag tag-trait">${TRAIT_LABEL[def.trait]}</span>` : "";
  return `<span class="tag">${ROLE_LABEL[def.role]}</span>${trait}`;
}

interface OwnedRow {
  def: MemberDef;
  level: number;
  star: number;
  shards: number;
  inParty: boolean;
  power: number;
}

function owned(g: GameData, ctx: Content): OwnedRow[] {
  const list: OwnedRow[] = [];
  for (const def of ctx.members) {
    const own = g.members[def.id];
    if (!own) continue;
    list.push({ def, level: own.level, star: own.star, shards: own.shards, inParty: g.party.includes(def.id), power: memberPower(def, own.level, own.star, ctx.params) });
  }
  // 編成中の団員を先に、その中では編成の並び順に
  return list.sort((a, b) => {
    if (a.inParty !== b.inParty) return a.inParty ? -1 : 1;
    if (a.inParty) return g.party.indexOf(a.def.id) - g.party.indexOf(b.def.id);
    return b.power - a.power;
  });
}

function partyIds(g: GameData): string[] {
  return g.party.filter((id): id is string => id !== null);
}

function canTrainParty(g: GameData, ctx: Content): boolean {
  return partyIds(g).some((id) => levelUpInfo(g, id, ctx).ok);
}

function claimableCount(g: GameData, ctx: Content): number {
  return missionList(g, ctx).filter((m) => m.claimable).length + dailyList(g, ctx).filter((m) => m.claimable).length;
}

/** タブに付ける印（やれることがある）。 */
export function badges(g: GameData, ctx: Content, nowMs: number): Record<Tab, boolean> {
  const ids = partyIds(g);
  const hasBench = ownedCount(g) > ids.length;
  const companionIds = Object.keys(g.companions);
  const companionWaiting = g.companionSlot === null && companionIds.length > 0;
  const pending = idlePending(g, nowMs, ctx);
  return {
    journey: pending.capped || pending.elapsedMs >= BOX_BADGE_MS,
    members: ids.some((id) => levelUpInfo(g, id, ctx).ok || promoteInfo(g, id, ctx).ok),
    party: g.party.includes(null) && hasBench,
    companions: companionWaiting || companionIds.some((id) => companionLevelInfo(g, id, ctx).ok),
    recruit: g.tickets > 0,
    missions: claimableCount(g, ctx) > 0,
    other: false,
  };
}

/** 旅の画面に出す、次にやることの一言。 */
export function hintText(g: GameData, ctx: Content, nowMs: number): string {
  const b = badges(g, ctx, nowMs);
  if (b.missions) return "達成したミッションがあります。下の「ミッション」で、報酬を受け取れます。";
  if (b.recruit) return "勧誘チケットがあります。下の「勧誘」で、新しい団員を呼べます。";
  if (b.party) return "編成に空きがあります。下の「編成」で、団員を入れましょう。";
  if (g.companionSlot === null && Object.keys(g.companions).length > 0) return "相棒がいます。下の「相棒」で、編成に入れましょう。";
  if (canTrainParty(g, ctx)) return "おひねりがあります。下の「団員」で、稽古（レベル上げ）ができます。";
  if (b.companions) return "相棒を育てられます。下の「相棒」で、レベルを上げましょう。";
  if (b.journey) return "箱に、おひねりが貯まっています。受け取って、団員の稽古に使いましょう。";
  return "「挑戦」を押すと戦います。おひねりは、画面を閉じていても、同じ速さで箱に貯まります。";
}

// ---------------------------------------------------------------- 旅

function bossWord(stage: number, ctx: Content): string {
  return isBossStage(stage, ctx.params) ? " のボス" : "";
}

function challengeHtml(g: GameData, ctx: Content, ui: UiState): string {
  const p = ctx.params;
  if (g.battle !== null) {
    return (
      `<div class="status" data-testid="status-text">${stageLabel(g.battle.stage, p)}${bossWord(g.battle.stage, ctx)} で戦闘中…</div>` +
      `<button type="button" class="btn btn-big" disabled data-testid="challenge-button">戦闘中</button>`
    );
  }
  const next = nextStage(g, ctx);
  const parts: string[] = [];
  const r = ui.result;
  let winHtml = "";
  if (r !== null && r.type === "win") {
    const companion = r.companionId !== null ? ` ${escapeHtml(ctx.companionById[r.companionId]?.name ?? "")} が相棒になりました！` : "";
    winHtml =
      `<div class="result result-win" data-testid="result-win"><b>${stageLabel(r.stage, p)} を突破！${companion}</b>` +
      `<span class="mini">初クリア報酬: ${escapeHtml(rewardText(r.reward))}</span></div>`;
  }
  if (next === null) {
    parts.push(`<div class="status" data-testid="status-text">すべての面を突破しました。おひねりは、これからも箱に貯まります。</div>`);
    parts.push(winHtml);
    return parts.join("");
  }
  const lost = r !== null && r.type === "defeat" && r.stage === next;
  if (r !== null && r.type === "defeat" && lost) {
    parts.push(
      `<div class="result result-lose" data-testid="result-defeat">` +
        `<b>稽古が足りない！</b>` +
        `<span>${stageLabel(r.stage, p)}${bossWord(r.stage, ctx)} で負けました${r.timedOut ? "（時間切れ）" : ""}。失ったものはありません。団員を稽古して、もう一度挑みましょう。</span>` +
        `<button type="button" class="btn btn-primary btn-wide" data-action="goto-members" data-testid="goto-train">団員を稽古する</button>` +
        `</div>`,
    );
  }
  const label = `${stageLabel(next, p)}${bossWord(next, ctx)}`;
  const text = lost ? `もう一度 ${label} に挑戦` : g.highestCleared === 0 ? `${label} に挑戦` : `次の面（${label}）に挑戦`;
  // 勝ちの結果は、ボタンの下に出す（続けて挑戦するときに、ボタンの位置が動かないように）
  parts.push(`<button type="button" class="btn ${lost ? "" : "btn-primary"} btn-big" data-action="challenge" data-testid="challenge-button">${text}</button>`);
  parts.push(winHtml);
  return parts.join("");
}

function boxHtml(g: GameData, ctx: Content, nowMs: number): string {
  const p = ctx.params;
  const pending = idlePending(g, nowMs, ctx);
  const mats = Object.keys(pending.mats)
    .map((id) => {
      const def = ctx.companionById[id];
      return def ? `<span>${escapeHtml(def.material)} <b data-live="idleMats-${id}" data-testid="idle-mats-${id}"></b></span>` : "";
    })
    .join("");
  return (
    `<div class="box ${pending.capped ? "box-full" : ""}" data-testid="idle-box">` +
    `<div class="box-main">` +
    `<div class="box-title">箱（放置報酬）${pending.capped ? `<span class="tag tag-warn" data-testid="idle-capped">いっぱい</span>` : ""}</div>` +
    `<div class="box-amounts"><span>おひねり <b data-live="idleGold" data-testid="idle-gold"></b></span>${mats}</div>` +
    `<div class="box-bar"><div class="box-fill" data-live-width="idleFill"></div></div>` +
    `<div class="mini">毎分 +${formatNumber(idleGoldPerMin(g.highestCleared, p))} ・ <span data-live="idleTime"></span></div>` +
    `</div>` +
    `<button type="button" class="btn btn-primary" data-action="collect" data-testid="idle-claim">受け取る</button>` +
    `</div>`
  );
}

/** 箱の中身など、時間とともに変わる値（data-live と data-live-width に書き込む）。 */
export function journeyLive(g: GameData, ctx: Content, nowMs: number): Record<string, string> {
  const pending = idlePending(g, nowMs, ctx);
  const capMs = ctx.params.economy.idleCapHours * 3_600_000;
  const out: Record<string, string> = {
    idleGold: formatNumber(pending.gold),
    idleFill: `${Math.round(Math.min(1, pending.elapsedMs / capMs) * 1000) / 10}%`,
    idleTime: pending.capped ? `いっぱい（${ctx.params.economy.idleCapHours}時間ぶん）` : `${formatDuration(pending.elapsedMs)}ぶん ／ ${ctx.params.economy.idleCapHours}時間まで`,
  };
  for (const id of Object.keys(pending.mats)) out[`idleMats-${id}`] = String(pending.mats[id] ?? 0);
  return out;
}

function goalsHtml(g: GameData, ctx: Content): string {
  const p = ctx.params;
  const items: string[] = [];
  const missions = missionList(g, ctx);
  const ready = missions.find((m) => m.claimable);
  const pendingMission = missions.find((m) => !m.claimed);
  if (ready) {
    items.push(
      `<button type="button" class="goal goal-ready" data-action="tab" data-tab="missions" data-testid="goal-mission"><span>ミッション達成！ ${escapeHtml(ready.def.text)}</span><span class="goal-go">報酬を受け取る ›</span></button>`,
    );
  } else if (pendingMission) {
    items.push(
      `<button type="button" class="goal" data-action="tab" data-tab="missions" data-testid="goal-mission"><span>次のミッション: ${escapeHtml(pendingMission.def.text)}</span><span class="goal-go">${pendingMission.progress} / ${pendingMission.def.target}</span></button>`,
    );
  }
  const goals = nextGoals(g, ctx);
  if (goals.bossIn !== null && goals.bossStage !== null) {
    const bossChapter = chapterOf(goals.bossStage, p);
    const boss = ctx.companions.find((c) => c.chapter === bossChapter);
    const note = boss && !g.companions[boss.id] ? "（倒すと相棒になる）" : "";
    items.push(`<div class="goal" data-testid="goal-boss"><span>${stageLabel(goals.bossStage, p)} のボスまで あと${goals.bossIn}面${note}</span></div>`);
  }
  const dailies = dailyList(g, ctx);
  if (dailies.length > 0) {
    const done = dailies.filter((d) => d.claimed).length;
    const canClaim = dailies.some((d) => d.claimable);
    items.push(
      `<button type="button" class="goal ${canClaim ? "goal-ready" : ""}" data-action="tab" data-tab="missions" data-testid="goal-daily"><span>今日の日課</span><span class="goal-go">${canClaim ? "受け取れます ›" : `${done} / ${dailies.length}`}</span></button>`,
    );
  }
  return items.length > 0 ? `<div class="goals">${items.join("")}</div>` : "";
}

export function journeyInfoHtml(g: GameData, ctx: Content, ui: UiState, nowMs: number): string {
  const parts: string[] = [];
  parts.push(`<div class="challenge">${challengeHtml(g, ctx, ui)}</div>`);
  parts.push(boxHtml(g, ctx, nowMs));
  parts.push(goalsHtml(g, ctx));
  parts.push(`<p class="hint" data-testid="hint">${escapeHtml(hintText(g, ctx, nowMs))}</p>`);
  parts.push(`<div class="mini">編成の戦力 <span data-testid="party-power">${formatNumber(partyPower(g, ctx))}</span></div>`);
  if (ui.feed.length > 0) {
    parts.push(`<ul class="feed" data-testid="feed">${ui.feed.slice(0, 5).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`);
  }
  return parts.join("");
}

// ---------------------------------------------------------------- 団員

export function membersHtml(g: GameData, ctx: Content): string {
  const p = ctx.params;
  const rows = owned(g, ctx).map((m) => {
    const id = m.def.id;
    const info = levelUpInfo(g, id, ctx);
    const promo = promoteInfo(g, id, ctx);
    const cap = levelCap(m.star, p);
    const capped = m.level >= cap;
    const atMaxStar = m.star >= maxStar(p);
    const one = capped
      ? `<button type="button" class="btn" disabled data-testid="levelup-${id}">上限</button>`
      : `<button type="button" class="btn ${info.ok ? "btn-primary" : ""}" data-action="levelup" data-id="${id}" data-testid="levelup-${id}" ${info.ok ? "" : "disabled"}>稽古 <small>${formatNumber(info.cost)}</small></button>`;
    const max = `<button type="button" class="btn" data-action="levelmax" data-id="${id}" data-testid="levelmax-${id}" ${info.ok ? "" : "disabled"}>まとめて</button>`;
    const promote = promo.ok
      ? `<button type="button" class="btn btn-promote" data-action="promote" data-id="${id}" data-testid="promote-${id}">昇格できます（★+1）</button>`
      : "";
    const shards = atMaxStar ? "" : ` ／ かけら ${m.shards}/${promo.need}`;
    return (
      `<li class="member ${m.inParty ? "in-party" : ""}" data-testid="member-row-${id}">` +
      `<button type="button" class="member-main" data-action="detail" data-id="${id}" data-testid="detail-${id}">` +
      `<span class="member-name">${escapeHtml(m.def.name)} <small>${stars(m.star)}</small></span>` +
      `<span class="member-sub">${tags(m.def)}${m.inParty ? `<span class="tag tag-in">編成中</span>` : ""}</span>` +
      `<span class="member-sub">Lv <b data-testid="member-level-${id}">${m.level}</b> / ${cap}${shards}</span>` +
      `</button>` +
      `<div class="member-btns">${one}${max}${promote}</div>` +
      `</li>`
    );
  });
  const can = canTrainParty(g, ctx);
  return (
    `<h2 class="panel-title">団員（${ownedCount(g)}人）</h2>` +
    `<div class="train-box">` +
    `<button type="button" class="btn ${can ? "btn-primary" : ""} btn-big" data-action="train-party" data-testid="train-party" ${can ? "" : "disabled"}>編成をまとめて稽古</button>` +
    `<p class="mini">編成の団員を、レベルの低い順に、おひねりが続くかぎり上げます。おひねり: <b data-testid="members-gold">${formatNumber(g.gold)}</b></p>` +
    `</div>` +
    `<p class="panel-note">「稽古」は1つ、「まとめて」はその団員を上げられるだけ上げます。名前を押すと、くわしい能力が見られます。</p>` +
    `<ul class="member-list">${rows.join("")}</ul>`
  );
}

export function memberDetailHtml(g: GameData, ctx: Content, id: string): string {
  const def = ctx.byId[id];
  const own = g.members[id];
  const s = battleStats(g, id, ctx);
  if (!def || !own || !s) return "";
  const p = ctx.params;
  const promo = promoteInfo(g, id, ctx);
  const atMax = own.star >= maxStar(p);
  const boost = passiveMult(g, ctx);
  const boosted = boost.hp > 1 || boost.atk > 1;
  const rarity = p.recruit.rarities[def.rarity]?.label ?? "";
  const promoteRow = atMax
    ? `<p class="mini">これ以上は昇格できません。</p>`
    : `<div class="row-between"><span>かけら <b data-testid="detail-shards">${own.shards}</b> / ${promo.need}</span>` +
      `<button type="button" class="btn ${promo.ok ? "btn-primary" : ""}" data-action="promote" data-id="${id}" data-testid="promote-button" ${promo.ok ? "" : "disabled"}>昇格（★+1）</button></div>` +
      `<p class="mini">同じ団員が勧誘で重なると、かけらになります。昇格すると能力が上がり、レベルの上限が伸びます。</p>`;
  return (
    `<h2>${escapeHtml(def.name)} <small>${stars(own.star)}</small></h2>` +
    `<p class="member-sub">${tags(def)}${rarity ? `<span class="tag">レア度: ${escapeHtml(rarity)}</span>` : ""}</p>` +
    `<dl class="stats">` +
    `<div><dt>レベル</dt><dd>${own.level} / ${levelCap(own.star, p)}</dd></div>` +
    `<div><dt>体力</dt><dd>${formatNumber(s.hp)}</dd></div>` +
    `<div><dt>攻撃</dt><dd>${formatNumber(s.atk)}</dd></div>` +
    `<div><dt>攻撃の間隔</dt><dd>${def.interval}秒</dd></div>` +
    `</dl>` +
    (boosted ? `<p class="mini">体力と攻撃は、相棒による底上げを含みます。</p>` : "") +
    `<p><b>技:</b> ${escapeHtml(skillText(def.skill, p.battle.rallySec))}</p>` +
    (def.trait ? `<p><b>${TRAIT_LABEL[def.trait]}:</b> ${TRAIT_TEXT[def.trait]}</p>` : "") +
    promoteRow +
    `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">閉じる</button>`
  );
}

// ---------------------------------------------------------------- 編成

export function partyHtml(g: GameData, ctx: Content, ui: UiState): string {
  const slot = (i: number): string => {
    const id = g.party[i] ?? null;
    const def = id === null ? undefined : ctx.byId[id];
    const own = id === null ? undefined : g.members[id];
    const selected = ui.selectedSlot === i ? "selected" : "";
    const body = def && own ? `<b>${escapeHtml(def.name)}</b><small>Lv ${own.level} ${ROLE_LABEL[def.role]}</small>` : `<b class="empty">空き</b><small>押して選ぶ</small>`;
    return `<button type="button" class="slot ${selected}" data-action="slot" data-slot="${i}" data-testid="slot-${i}">${body}</button>`;
  };
  const sel = ui.selectedSlot;
  const partyCount = g.party.filter((x) => x !== null).length;
  const canRemove = sel !== null && (g.party[sel] ?? null) !== null && partyCount > 1;
  const guide =
    sel === null
      ? "① 入れ替えたい枠を押してください。"
      : `② ${sel < FRONT ? "前列" : "後列"}の${(sel % FRONT) + 1}番に入れる団員を、下から選んでください。`;
  const rows = owned(g, ctx).map((m) => {
    const where = g.party.indexOf(m.def.id);
    const place = where >= 0 ? `${where < FRONT ? "前列" : "後列"}${(where % FRONT) + 1}` : "控え";
    return (
      `<li class="member ${m.inParty ? "in-party" : ""}">` +
      `<span class="member-main static">` +
      `<span class="member-name">${escapeHtml(m.def.name)} <small>${stars(m.star)}</small></span>` +
      `<span class="member-sub">${tags(m.def)}<span class="tag ${m.inParty ? "tag-in" : ""}">${place}</span></span>` +
      `<span class="member-sub">Lv ${m.level} ／ 戦力 ${formatNumber(m.power)}</span>` +
      `</span>` +
      `<button type="button" class="btn ${sel !== null ? "btn-primary" : ""}" data-action="place" data-id="${m.def.id}" data-testid="place-${m.def.id}" ${sel === null ? "disabled" : ""}>ここに入れる</button>` +
      `</li>`
    );
  });
  const companionIds = Object.keys(g.companions);
  const equipped = g.companionSlot === null ? undefined : ctx.companionById[g.companionSlot];
  const equippedOwn = g.companionSlot === null ? undefined : g.companions[g.companionSlot];
  const companionBody =
    equipped && equippedOwn
      ? `<b>${escapeHtml(equipped.name)}</b><small>Lv ${equippedOwn.level} 相棒</small>`
      : companionIds.length > 0
        ? `<b class="empty">空き</b><small>押して、相棒を選ぶ</small>`
        : `<b class="empty">まだいません</b><small>ボスを倒すと相棒になる</small>`;
  return (
    `<h2 class="panel-title">編成（戦力 ${formatNumber(partyPower(g, ctx))}）</h2>` +
    `<p class="panel-note">敵は前列を先に狙います。体力の高い団員を前列に置くと、長く持ちます。</p>` +
    `<div class="formation">` +
    `<div class="formation-row"><span class="row-label">前列</span>${slot(0)}${slot(1)}</div>` +
    `<div class="formation-row"><span class="row-label">後列</span>${slot(2)}${slot(3)}</div>` +
    `<div class="formation-row"><span class="row-label">相棒</span><button type="button" class="slot slot-companion" data-action="tab" data-tab="companions" data-testid="slot-companion">${companionBody}</button></div>` +
    `</div>` +
    `<div class="row-between"><span class="guide-text" data-testid="party-guide">${guide}</span>` +
    `<button type="button" class="btn" data-action="remove" data-testid="slot-remove" ${canRemove ? "" : "disabled"}>外す</button></div>` +
    `<ul class="member-list">${rows.join("")}</ul>`
  );
}

// ---------------------------------------------------------------- 相棒

function companionRow(g: GameData, ctx: Content, def: CompanionDef): string {
  const p = ctx.params;
  const own = g.companions[def.id];
  const bossStage = def.chapter * p.progress.stagesPerChapter;
  if (!own) {
    const reached = g.highestCleared >= (def.chapter - 1) * p.progress.stagesPerChapter;
    return (
      `<li class="comp locked" data-testid="companion-row-${def.id}">` +
      `<div class="comp-head"><b>${reached ? escapeHtml(def.name) : "？？？"}</b></div>` +
      `<div class="comp-line">${stageLabel(bossStage, p)} のボス。倒すと、相棒になります。</div>` +
      `</li>`
    );
  }
  const info = companionLevelInfo(g, def.id, ctx);
  const equipped = g.companionSlot === def.id;
  const capped = own.level >= p.companion.levelCap;
  const have = g.materials[def.id] ?? 0;
  const cost = capped
    ? `<div class="comp-line">レベルは上限です。</div>`
    : `<div class="comp-line">次のレベルに要るもの: ${escapeHtml(def.material)} <b data-testid="companion-mats-${def.id}">${have}</b> / ${info.mats} と、おひねり ${formatNumber(info.gold)}</div>`;
  return (
    `<li class="comp ${equipped ? "equipped" : ""}" data-testid="companion-row-${def.id}">` +
    `<div class="comp-head"><b>${escapeHtml(def.name)}</b><span>Lv <b data-testid="companion-level-${def.id}">${own.level}</b> / ${p.companion.levelCap}</span>${equipped ? `<span class="tag tag-in">編成中</span>` : ""}</div>` +
    `<div class="comp-line"><b>底上げ:</b> ${escapeHtml(passiveText(def, own.level))}（持っているだけでかかる）</div>` +
    `<div class="comp-line"><b>技:</b> ${escapeHtml(companionSkillText(def, companionSkillPower(def, own.level, p), p.battle.rallySec))}（編成に入れると使う）</div>` +
    cost +
    `<div class="btn-row">` +
    `<button type="button" class="btn ${info.ok ? "btn-primary" : ""}" data-action="companion-levelup" data-id="${def.id}" data-testid="companion-levelup-${def.id}" ${info.ok ? "" : "disabled"}>レベルを上げる</button>` +
    (equipped
      ? `<button type="button" class="btn" data-action="companion-unequip" data-testid="companion-unequip-${def.id}">編成から外す</button>`
      : `<button type="button" class="btn btn-primary" data-action="companion-equip" data-id="${def.id}" data-testid="companion-equip-${def.id}">編成に入れる</button>`) +
    `</div>` +
    (!info.ok && !capped && info.reason ? `<div class="mini">${escapeHtml(info.reason)}</div>` : "") +
    `</li>`
  );
}

export function companionsHtml(g: GameData, ctx: Content): string {
  const p = ctx.params;
  const list = ctx.companions.slice().sort((a, b) => a.chapter - b.chapter);
  const boost = passiveMult(g, ctx);
  const total: string[] = [];
  if (boost.hp > 1) total.push(`体力 +${Math.round((boost.hp - 1) * 100)}%`);
  if (boost.atk > 1) total.push(`攻撃 +${Math.round((boost.atk - 1) * 100)}%`);
  return (
    `<h2 class="panel-title">相棒（${Object.keys(g.companions).length} / ${list.length}体）</h2>` +
    `<p class="panel-note">各章のボスを倒すと、改心して相棒になります。持っているだけで団員全員が強くなり、編成に入れた1体は、戦闘中に技を使います。</p>` +
    `<div class="mini" data-testid="companion-total">いまの底上げの合計: ${total.length > 0 ? `団員全員の ${total.join("、")}` : "なし"}</div>` +
    `<ul class="comp-list">${list.map((def) => companionRow(g, ctx, def)).join("")}</ul>` +
    `<p class="panel-note">専用の素材は、箱に1時間あたり ${p.companion.matPerHour}こ 貯まるほか、初クリア報酬、ミッション、日課でも手に入ります。</p>`
  );
}

// ---------------------------------------------------------------- 勧誘

export function recruitHtml(g: GameData, ctx: Content): string {
  const rarities = ctx.params.recruit.rarities;
  const rates = recruitRates(ctx).map((r) => {
    const def = ctx.byId[r.id] as MemberDef;
    const own = g.members[r.id];
    const rarity = rarities[def.rarity]?.label ?? "";
    return `<li><span>${escapeHtml(def.name)} <small>${ROLE_LABEL[def.role]}・${escapeHtml(rarity)}</small></span><span>${(r.rate * 100).toFixed(1)}%${own ? ` <small>（在籍 ★${own.star}、かけら ${own.shards}）</small>` : ""}</span></li>`;
  });
  const first = g.counters.recruits === 0 ? `<p class="panel-note">はじめての勧誘では、回復役の ${escapeHtml(ctx.byId[ctx.params.recruit.firstId]?.name ?? "")} が必ず来ます。</p>` : "";
  const many = Math.min(10, g.tickets);
  return (
    `<h2 class="panel-title">勧誘</h2>` +
    `<div class="recruit-box">` +
    `<div>勧誘チケット <b data-testid="recruit-tickets">${g.tickets}</b> 枚</div>` +
    `<button type="button" class="btn btn-primary btn-big" data-action="recruit" data-testid="recruit-button" ${g.tickets > 0 ? "" : "disabled"}>勧誘する（1枚）</button>` +
    `<button type="button" class="btn btn-big" data-action="recruit-all" data-testid="recruit-all" ${many >= 2 ? "" : "disabled"}>まとめて勧誘する（${Math.max(2, many)}枚）</button>` +
    `<div class="mini">勧誘チケットは、ミッションと日課でもらえます。</div>` +
    `</div>` +
    first +
    `<h3>来る団員と、その割合</h3>` +
    `<ul class="rates" data-testid="recruit-rates">${rates.join("")}</ul>` +
    `<p class="panel-note">すでにいる団員が来たときは、その団員の「かけら」になり、昇格（★）に使えます。新しい団員は、レベル1から始まります。</p>`
  );
}

// ---------------------------------------------------------------- ミッションと日課

function goalRow(view: GoalView<MissionDef | DailyDef>, kind: "mission" | "daily"): string {
  const id = view.def.id;
  const side = view.claimed
    ? `<span class="goal-done">受け取り済み</span>`
    : view.claimable
      ? `<button type="button" class="btn btn-primary" data-action="claim-${kind}" data-id="${id}" data-testid="claim-${id}">受け取る</button>`
      : `<span class="goal-progress">${view.progress} / ${view.def.target}</span>`;
  return (
    `<li class="task ${view.claimed ? "task-done" : view.claimable ? "task-ready" : ""}" data-testid="${kind}-${id}">` +
    `<span class="task-text">${escapeHtml(view.def.text)}<small>報酬: ${escapeHtml(rewardText(view.reward))}</small></span>` +
    side +
    `</li>`
  );
}

/** 一覧に出す、まだ達成していないミッションの数。 */
const PENDING_SHOWN = 8;

export function missionsHtml(g: GameData, ctx: Content): string {
  const dailies = dailyList(g, ctx);
  const missions = missionList(g, ctx);
  const ready = missions.filter((m) => m.claimable);
  const pending = missions.filter((m) => !m.claimable && !m.claimed);
  const claimed = missions.filter((m) => m.claimed).length;
  const readyCount = ready.length + dailies.filter((d) => d.claimable).length;
  const rest = pending.length - PENDING_SHOWN;
  return (
    `<div class="row-between"><h2 class="panel-title">今日の日課</h2>` +
    `<button type="button" class="btn ${readyCount > 0 ? "btn-primary" : ""}" data-action="claim-all" data-testid="claim-all" ${readyCount > 0 ? "" : "disabled"}>まとめて受け取る${readyCount > 0 ? `（${readyCount}）` : ""}</button></div>` +
    `<p class="panel-note">日付が変わると、入れ替わります。</p>` +
    `<ul class="task-list" data-testid="daily-list">${dailies.map((d) => goalRow(d, "daily")).join("")}</ul>` +
    `<h2 class="panel-title">ミッション（${claimed} / ${missions.length}）</h2>` +
    `<p class="panel-note">一度きりの目標です。達成したら、押して報酬を受け取ります。</p>` +
    `<ul class="task-list" data-testid="mission-list">` +
    ready.map((m) => goalRow(m, "mission")).join("") +
    pending.slice(0, PENDING_SHOWN).map((m) => goalRow(m, "mission")).join("") +
    `</ul>` +
    (rest > 0 ? `<p class="mini">このほかに、${rest}件のミッションがあります。</p>` : "") +
    (pending.length === 0 && ready.length === 0 ? `<p class="mini">すべてのミッションを達成しました。</p>` : "")
  );
}

// ---------------------------------------------------------------- その他

/** extraHtml は、確認用ビルドでだけ足す欄（デバッグ機能）。公開用ビルドでは空。 */
export function otherHtml(g: GameData, ctx: Content, ui: UiState, extraHtml: string = ""): string {
  const p = ctx.params;
  const chapters: string[] = [];
  for (let ch = 1; ch <= p.progress.chapters; ch++) {
    const first = (ch - 1) * p.progress.stagesPerChapter;
    const done = Math.max(0, Math.min(p.progress.stagesPerChapter, g.highestCleared - first));
    const boss = ctx.companions.find((c) => c.chapter === ch);
    const open = g.highestCleared >= first;
    const state = boss && g.companions[boss.id] ? "相棒になった" : open ? "まだ倒していない" : "？？？";
    chapters.push(
      `<li class="${open ? "" : "locked"}"><span>第${ch}章 <small>${open ? `${done} / ${p.progress.stagesPerChapter}面` : "まだ行けません"}</small></span>` +
        `<span>ボス: ${open && boss ? escapeHtml(boss.name) : "？？？"} <small>${state}</small></span></li>`,
    );
  }
  const a2hs = ui.standalone
    ? ""
    : `<div class="card guide" data-testid="a2hs-guide"><h3>ホーム画面に追加してください</h3><p>Safariの共有ボタン（四角から矢印が出ているボタン）を押し、「ホーム画面に追加」を選びます。追加したアイコンから開くと、セーブが消えにくくなります。</p></div>`;
  return (
    `<h2 class="panel-title">旅の記録</h2>` +
    `<ul class="chapters" data-testid="chapters">${chapters.join("")}</ul>` +
    `<div class="mini">${allCleared(g, ctx) ? "すべての面を突破しました。" : ""}箱に貯まるおひねり: 1分あたり ${formatNumber(idleGoldPerMin(g.highestCleared, p))}（上限 ${p.economy.idleCapHours}時間ぶん）</div>` +
    a2hs +
    `<h2 class="panel-title">設定</h2>` +
    `<dl class="stats">` +
    `<div><dt>ビルド</dt><dd data-testid="build-id">${escapeHtml(ui.buildId)}</dd></div>` +
    `<div><dt>保存</dt><dd data-testid="save-status">${escapeHtml(ui.saveStatus)}</dd></div>` +
    `<div><dt>開き方</dt><dd data-testid="launch-mode">${ui.standalone ? "ホーム画面から" : "ブラウザから"}</dd></div>` +
    `</dl>` +
    `<div class="card">` +
    `<h3>セーブの書き出しと読み込み</h3>` +
    `<p class="mini">機種を変えるときや、念のための控えに使います。書き出した文字をどこかに貼って取っておき、読み込むときはここに貼り付けます。</p>` +
    `<div class="btn-row"><button type="button" class="btn" data-action="export" data-testid="export-button">書き出す</button>` +
    `<button type="button" class="btn" data-action="copy-export" data-testid="export-copy" ${ui.exportText === "" ? "disabled" : ""}>コピー</button></div>` +
    `<textarea class="save-area" readonly data-testid="export-area" placeholder="「書き出す」を押すと、ここにセーブが出ます">${escapeHtml(ui.exportText)}</textarea>` +
    `<textarea class="save-area" data-testid="import-area" placeholder="読み込むセーブを、ここに貼り付けます"></textarea>` +
    `<div class="btn-row"><button type="button" class="btn" data-action="import" data-testid="import-button">読み込む</button>` +
    `<span class="mini" data-testid="import-message">${escapeHtml(ui.importMessage)}</span></div>` +
    `</div>` +
    extraHtml
  );
}

// ---------------------------------------------------------------- ポップアップ

export interface RecruitOutcome {
  id: string;
  duplicate: boolean;
}

function placeEmptyButton(g: GameData, id: string): string {
  return g.party.includes(null) && !g.party.includes(id)
    ? `<button type="button" class="btn btn-primary btn-wide" data-action="place-empty" data-id="${id}" data-testid="place-empty">編成の空きに入れる</button>`
    : "";
}

export function recruitResultHtml(g: GameData, ctx: Content, id: string, duplicate: boolean): string {
  const def = ctx.byId[id];
  if (!def) return "";
  const body = duplicate
    ? `<p>${escapeHtml(def.name)} はすでにいるので、<b>かけら</b>を1つ手に入れました。</p>`
    : `<p><b>${escapeHtml(def.name)}</b> が仲間になりました！</p><p class="member-sub">${tags(def)}</p><p class="mini">${escapeHtml(skillText(def.skill, ctx.params.battle.rallySec))}</p>`;
  return (
    `<h2 data-testid="recruit-result">${duplicate ? "かけらを入手" : "新しい団員"}</h2>${body}` +
    (duplicate ? "" : placeEmptyButton(g, id)) +
    `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">閉じる</button>`
  );
}

/** まとめて勧誘した結果。 */
export function recruitManyHtml(g: GameData, ctx: Content, outcomes: RecruitOutcome[]): string {
  const rows = outcomes.map((o) => {
    const def = ctx.byId[o.id];
    return `<li class="${o.duplicate ? "" : "is-new"}"><span>${escapeHtml(def?.name ?? "")}</span><span>${o.duplicate ? "かけら +1" : "新しい団員！"}</span></li>`;
  });
  const firstNew = outcomes.find((o) => !o.duplicate && !g.party.includes(o.id));
  return (
    `<h2 data-testid="recruit-many-result">勧誘の結果（${outcomes.length}回）</h2>` +
    `<ul class="rates">${rows.join("")}</ul>` +
    (firstNew ? placeEmptyButton(g, firstNew.id) : "") +
    `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">閉じる</button>`
  );
}

export function companionJoinHtml(g: GameData, ctx: Content, id: string): string {
  const def = ctx.companionById[id];
  const own = g.companions[id];
  if (!def) return "";
  const p = ctx.params;
  const level = own?.level ?? 1;
  const equip =
    g.companionSlot === id
      ? `<p class="mini">編成に入っています。次の戦闘から、技を使います。</p>`
      : `<button type="button" class="btn btn-primary btn-wide" data-action="equip-close" data-id="${id}" data-testid="equip-companion">編成に入れる</button>`;
  return (
    `<h2 data-testid="companion-result">ボスが相棒に！</h2>` +
    `<p><b>${escapeHtml(def.name)}</b> が改心して、劇団の相棒になりました。</p>` +
    `<p class="comp-line"><b>底上げ:</b> ${escapeHtml(passiveText(def, level))}（持っているだけでかかる）</p>` +
    `<p class="comp-line"><b>技:</b> ${escapeHtml(companionSkillText(def, companionSkillPower(def, level, p), p.battle.rallySec))}（編成に入れると使う）</p>` +
    `<p class="mini">「${escapeHtml(def.material)}」とおひねりで、レベルを上げられます。${escapeHtml(def.material)}は、箱に少しずつ貯まります。</p>` +
    equip +
    `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">閉じる</button>`
  );
}
