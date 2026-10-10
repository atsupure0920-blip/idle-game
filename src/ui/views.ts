// 各画面の中身（HTML の文字列）を作る。ルールは持たず、core が返した値を並べるだけ。
// 文字列を返すだけなので、ブラウザがなくてもテストできる。
//
// 押せる要素には data-action を付ける（main.ts がまとめて受ける）。
// 値を表示する要素と押せる要素には data-testid を付ける（通し操作テストが使う）。

import { PARTY_SIZE, currentStage, levelUpInfo, nextGoals, ownedCount, partyPower, promoteInfo, recruitRates } from "../core/game.ts";
import type { GameData } from "../core/game.ts";
import { chapterOf, goldPerWin, isBossStage, levelCap, maxStar, memberPower, memberStats, offlineGoldPerMin, stageLabel, totalStages } from "../core/params.ts";
import type { Content, MemberDef } from "../core/params.ts";
import { ROLE_LABEL, TRAIT_LABEL, TRAIT_TEXT, chanceLabel, escapeHtml, formatNumber, skillText } from "./texts.ts";

export type Tab = "journey" | "members" | "party" | "recruit" | "other";

export const TABS: { id: Tab; label: string }[] = [
  { id: "journey", label: "旅" },
  { id: "members", label: "団員" },
  { id: "party", label: "編成" },
  { id: "recruit", label: "勧誘" },
  { id: "other", label: "その他" },
];

/** 画面だけが持つ状態（セーブには入らない）。 */
export interface UiState {
  tab: Tab;
  /** 編成の画面で選んでいる枠（選んでいなければ null）。 */
  selectedSlot: number | null;
  /** 止まっているときの「勝てる見込み」（まだ計算していなければ null）。 */
  chance: number | null;
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

function stars(n: number): string {
  return n > 0 ? "★".repeat(n) : "";
}

function tags(def: MemberDef): string {
  const trait = def.trait ? `<span class="tag tag-trait">${TRAIT_LABEL[def.trait]}</span>` : "";
  return `<span class="tag">${ROLE_LABEL[def.role]}</span>${trait}`;
}

function owned(g: GameData, ctx: Content): { def: MemberDef; level: number; star: number; shards: number; inParty: boolean; power: number }[] {
  const list = [];
  for (const def of ctx.members) {
    const own = g.members[def.id];
    if (!own) continue;
    list.push({
      def,
      level: own.level,
      star: own.star,
      shards: own.shards,
      inParty: g.party.includes(def.id),
      power: memberPower(def, own.level, own.star, ctx.params),
    });
  }
  // 編成中の団員を先に、その中では編成の並び順に
  return list.sort((a, b) => {
    if (a.inParty !== b.inParty) return a.inParty ? -1 : 1;
    if (a.inParty) return g.party.indexOf(a.def.id) - g.party.indexOf(b.def.id);
    return b.power - a.power;
  });
}

/** 下のタブに付ける印（やれることがある）。 */
export function badges(g: GameData, ctx: Content): Record<Tab, boolean> {
  const partyIds = g.party.filter((id): id is string => id !== null);
  const canTrain = partyIds.some((id) => levelUpInfo(g, id, ctx).ok || promoteInfo(g, id, ctx).ok);
  const hasBench = ownedCount(g) > partyIds.length;
  return {
    journey: g.idleGold > 0 || !g.challenging,
    members: canTrain,
    party: g.party.includes(null) && hasBench,
    recruit: g.tickets > 0,
    other: false,
  };
}

/** 旅の画面に出す、次にやることの一言。 */
export function hintText(g: GameData, ctx: Content): string {
  const b = badges(g, ctx);
  if (b.recruit) return "勧誘チケットがあります。下の「勧誘」で、新しい団員を呼べます。";
  if (b.party) return "編成に空きがあります。下の「編成」で、団員を入れましょう。";
  if (!g.challenging) {
    return b.members
      ? "下の「団員」でレベルを上げてから、再挑戦しましょう。"
      : "手前の面で、おひねりを稼いでいます。貯まったら「団員」でレベルを上げましょう。";
  }
  if (b.members) return "おひねりが貯まりました。下の「団員」で稽古（レベル上げ）ができます。";
  return "戦闘は自動で進みます。画面を閉じている間も、おひねりは貯まります。";
}

// ---------------------------------------------------------------- 旅

export function journeyInfoHtml(g: GameData, ctx: Content, ui: UiState): string {
  const p = ctx.params;
  const total = totalStages(p);
  const cleared = g.highestCleared >= total;
  const stage = currentStage(g, ctx);
  const parts: string[] = [];

  // いまの状態と、再挑戦
  if (cleared) {
    parts.push(`<div class="status" data-testid="status-text">すべての面を突破しました。最後の面で、おひねりを稼いでいます。</div>`);
  } else if (g.challenging) {
    const boss = isBossStage(stage, p) ? "（ボス）" : "";
    parts.push(`<div class="status" data-testid="status-text">${stageLabel(stage, p)}${boss} に挑戦中</div>`);
  } else {
    const target = g.highestCleared + 1;
    const c = ui.chance === null ? null : chanceLabel(ui.chance);
    const chance =
      c === null || ui.chance === null
        ? `<span class="chance" data-testid="win-chance">勝てる見込み: 計算中</span>`
        : `<span class="chance chance-${c.tone}" data-testid="win-chance">勝てる見込み: ${c.text}（${Math.round(ui.chance * 100)}%）</span>`;
    parts.push(
      `<div class="stopped">` +
        `<div class="status" data-testid="status-text">${stageLabel(target, p)}${isBossStage(target, p) ? "（ボス）" : ""} で負けました。稽古が足りない！ ${stageLabel(stage, p)} で稼いでいます。</div>` +
        `<div class="retry-row">${chance}<button type="button" class="btn btn-primary" data-action="retry" data-testid="retry-button">再挑戦</button></div>` +
        `</div>`,
    );
  }

  // 放置報酬
  if (g.idleGold > 0) {
    parts.push(
      `<div class="idle">` +
        `<span>放置報酬 <b data-testid="idle-gold">${formatNumber(g.idleGold)}</b> おひねり</span>` +
        `<button type="button" class="btn btn-primary" data-action="claim" data-testid="idle-claim">受け取る</button>` +
        `</div>`,
    );
  }

  // 次の目標
  const goals = nextGoals(g, ctx);
  const goalItems: string[] = [];
  if (goals.ticketIn !== null) goalItems.push(`<span data-testid="goal-ticket">次のチケットまで あと${goals.ticketIn}面</span>`);
  if (goals.bossIn !== null && goals.bossStage !== null) {
    const boss = ctx.members.find((m) => m.joinChapter === chapterOf(goals.bossStage as number, p));
    const name = boss && !g.members[boss.id] ? `（倒すと入団）` : "";
    goalItems.push(`<span data-testid="goal-boss">${stageLabel(goals.bossStage, p)} のボスまで あと${goals.bossIn}面${name}</span>`);
  }
  if (goalItems.length > 0) parts.push(`<div class="goals">${goalItems.join("")}</div>`);

  parts.push(`<p class="hint" data-testid="hint">${escapeHtml(hintText(g, ctx))}</p>`);

  const perWin = goldPerWin(stage, p);
  parts.push(
    `<div class="mini">この面で勝つと ${formatNumber(perWin)} おひねり ／ 編成の戦力 <span data-testid="party-power">${formatNumber(partyPower(g, ctx))}</span></div>`,
  );

  if (ui.feed.length > 0) {
    parts.push(`<ul class="feed" data-testid="feed">${ui.feed.slice(0, 5).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`);
  }
  return parts.join("");
}

// ---------------------------------------------------------------- 団員

export function membersHtml(g: GameData, ctx: Content): string {
  const rows = owned(g, ctx).map((m) => {
    const info = levelUpInfo(g, m.def.id, ctx);
    const promo = promoteInfo(g, m.def.id, ctx);
    const capped = m.level >= levelCap(m.star, ctx.params);
    const button = capped
      ? `<button type="button" class="btn" disabled data-testid="levelup-${m.def.id}">上限</button>`
      : `<button type="button" class="btn ${info.ok ? "btn-primary" : ""}" data-action="levelup" data-id="${m.def.id}" data-testid="levelup-${m.def.id}" ${info.ok ? "" : "disabled"}>稽古 ${formatNumber(info.cost)}</button>`;
    return (
      `<li class="member ${m.inParty ? "in-party" : ""}" data-testid="member-row-${m.def.id}">` +
      `<button type="button" class="member-main" data-action="detail" data-id="${m.def.id}" data-testid="detail-${m.def.id}">` +
      `<span class="member-name">${escapeHtml(m.def.name)} <small>${stars(m.star)}</small>${promo.ok ? `<span class="dot" title="昇格できます"></span>` : ""}</span>` +
      `<span class="member-sub">${tags(m.def)}${m.inParty ? `<span class="tag tag-in">編成中</span>` : ""}</span>` +
      `<span class="member-sub">Lv <b data-testid="member-level-${m.def.id}">${m.level}</b> ／ 戦力 ${formatNumber(m.power)}</span>` +
      `</button>` +
      button +
      `</li>`
    );
  });
  return (
    `<h2 class="panel-title">団員（${ownedCount(g)}人）</h2>` +
    `<p class="panel-note">「稽古」でレベルが上がります。名前を押すと、くわしい能力が見られます。</p>` +
    `<ul class="member-list">${rows.join("")}</ul>`
  );
}

export function memberDetailHtml(g: GameData, ctx: Content, id: string): string {
  const def = ctx.byId[id];
  const own = g.members[id];
  if (!def || !own) return "";
  const p = ctx.params;
  const s = memberStats(def, own.level, own.star, p);
  const promo = promoteInfo(g, id, ctx);
  const atMax = own.star >= maxStar(p);
  const promoteRow = atMax
    ? `<p class="mini">これ以上は昇格できません。</p>`
    : `<div class="row-between"><span>かけら <b data-testid="detail-shards">${own.shards}</b> / ${promo.need}</span>` +
      `<button type="button" class="btn ${promo.ok ? "btn-primary" : ""}" data-action="promote" data-id="${id}" data-testid="promote-button" ${promo.ok ? "" : "disabled"}>昇格（★+1）</button></div>` +
      `<p class="mini">同じ団員が勧誘で重なると、かけらになります。昇格すると能力が上がり、レベルの上限が伸びます。</p>`;
  return (
    `<h2>${escapeHtml(def.name)} <small>${stars(own.star)}</small></h2>` +
    `<p class="member-sub">${tags(def)}</p>` +
    `<dl class="stats">` +
    `<div><dt>レベル</dt><dd>${own.level} / ${levelCap(own.star, p)}</dd></div>` +
    `<div><dt>体力</dt><dd>${formatNumber(s.hp)}</dd></div>` +
    `<div><dt>攻撃</dt><dd>${formatNumber(s.atk)}</dd></div>` +
    `<div><dt>攻撃の間隔</dt><dd>${def.interval}秒</dd></div>` +
    `<div><dt>戦力</dt><dd>${formatNumber(memberPower(def, own.level, own.star, p))}</dd></div>` +
    `</dl>` +
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
  return (
    `<h2 class="panel-title">編成（戦力 ${formatNumber(partyPower(g, ctx))}）</h2>` +
    `<p class="panel-note">敵は前列を先に狙います。体力の高い団員を前列に置くと、長く持ちます。</p>` +
    `<div class="formation">` +
    `<div class="formation-row"><span class="row-label">前列</span>${slot(0)}${slot(1)}</div>` +
    `<div class="formation-row"><span class="row-label">後列</span>${slot(2)}${slot(3)}</div>` +
    `</div>` +
    `<div class="row-between"><span class="guide-text" data-testid="party-guide">${guide}</span>` +
    `<button type="button" class="btn" data-action="remove" data-testid="slot-remove" ${canRemove ? "" : "disabled"}>外す</button></div>` +
    `<ul class="member-list">${rows.join("")}</ul>`
  );
}

// ---------------------------------------------------------------- 勧誘

export function recruitHtml(g: GameData, ctx: Content): string {
  const goals = nextGoals(g, ctx);
  const rates = recruitRates(ctx).map((r) => {
    const def = ctx.byId[r.id] as MemberDef;
    const own = g.members[r.id];
    return `<li><span>${escapeHtml(def.name)} <small>${ROLE_LABEL[def.role]}</small></span><span>${(r.rate * 100).toFixed(1)}%${own ? ` <small>（在籍 ★${own.star}、かけら ${own.shards}）</small>` : ""}</span></li>`;
  });
  const first = g.recruits === 0 ? `<p class="panel-note">はじめての勧誘では、回復役の ${escapeHtml(ctx.byId[ctx.params.recruit.firstId]?.name ?? "")} が必ず来ます。</p>` : "";
  return (
    `<h2 class="panel-title">勧誘</h2>` +
    `<div class="recruit-box">` +
    `<div>勧誘チケット <b data-testid="recruit-tickets">${g.tickets}</b> 枚</div>` +
    `<button type="button" class="btn btn-primary btn-big" data-action="recruit" data-testid="recruit-button" ${g.tickets > 0 ? "" : "disabled"}>勧誘する（1枚）</button>` +
    (goals.ticketIn !== null ? `<div class="mini">次のチケットまで あと${goals.ticketIn}面</div>` : `<div class="mini">チケットは、もう届きません。</div>`) +
    `</div>` +
    first +
    `<h3>来る団員と、その割合</h3>` +
    `<ul class="rates" data-testid="recruit-rates">${rates.join("")}</ul>` +
    `<p class="panel-note">すでにいる団員が来たときは、その団員の「かけら」になり、昇格（★）に使えます。魔物の団員は、各章のボスを倒すと入団します。</p>`
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
    const boss = ctx.members.find((m) => m.joinChapter === ch);
    const open = g.highestCleared >= first;
    const joined = boss && g.members[boss.id] ? "入団済み" : open ? "未入団" : "？？？";
    chapters.push(
      `<li class="${open ? "" : "locked"}"><span>第${ch}章 <small>${open ? `${done} / ${p.progress.stagesPerChapter}面` : "まだ行けません"}</small></span>` +
        `<span>ボス: ${open && boss ? escapeHtml(boss.name) : "？？？"} <small>${joined}</small></span></li>`,
    );
  }
  const a2hs = ui.standalone
    ? ""
    : `<div class="card guide" data-testid="a2hs-guide"><h3>ホーム画面に追加してください</h3><p>Safariの共有ボタン（四角から矢印が出ているボタン）を押し、「ホーム画面に追加」を選びます。追加したアイコンから開くと、セーブが消えにくくなります。</p></div>`;
  return (
    `<h2 class="panel-title">旅の記録</h2>` +
    `<ul class="chapters" data-testid="chapters">${chapters.join("")}</ul>` +
    `<div class="mini">画面を閉じている間のおひねり: 1分あたり ${formatNumber(offlineGoldPerMin(g.highestCleared, p))}（上限 ${p.economy.idleCapHours}時間ぶん）</div>` +
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

export function recruitResultHtml(g: GameData, ctx: Content, id: string, duplicate: boolean): string {
  const def = ctx.byId[id];
  if (!def) return "";
  const hasEmpty = g.party.includes(null);
  const body = duplicate
    ? `<p>${escapeHtml(def.name)} はすでにいるので、<b>かけら</b>を1つ手に入れました。</p>`
    : `<p><b>${escapeHtml(def.name)}</b> が仲間になりました！</p><p class="member-sub">${tags(def)}</p><p class="mini">${escapeHtml(skillText(def.skill, ctx.params.battle.rallySec))}</p>`;
  const place = !duplicate && hasEmpty ? `<button type="button" class="btn btn-primary btn-wide" data-action="place-empty" data-id="${id}" data-testid="place-empty">編成の空きに入れる</button>` : "";
  return `<h2 data-testid="recruit-result">${duplicate ? "かけらを入手" : "新しい団員"}</h2>${body}${place}<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">閉じる</button>`;
}

export function joinHtml(ctx: Content, id: string): string {
  const def = ctx.byId[id];
  if (!def) return "";
  return (
    `<h2 data-testid="join-result">ボスが入団！</h2>` +
    `<p><b>${escapeHtml(def.name)}</b> が改心して、劇団に入りました。</p>` +
    `<p class="member-sub">${tags(def)}</p>` +
    `<p class="mini">レベル1からの入団です。「編成」で入れて、「団員」で稽古をつけましょう。</p>` +
    `<button type="button" class="btn btn-primary btn-wide" data-action="goto-party" data-testid="goto-party">編成を見る</button>` +
    `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">閉じる</button>`
  );
}

export function offlineHtml(awayText: string, gold: number, capped: boolean): string {
  return (
    `<h2 data-testid="offline-result">おかえりなさい</h2>` +
    `<p>${escapeHtml(awayText)}のあいだに、<b>${formatNumber(gold)}</b> おひねりが貯まりました。${capped ? "（上限まで貯まっていました）" : ""}</p>` +
    `<button type="button" class="btn btn-primary btn-wide" data-action="claim-close" data-testid="offline-claim">受け取る</button>`
  );
}
