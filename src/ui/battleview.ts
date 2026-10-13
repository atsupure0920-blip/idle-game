// 戦闘の表示。core が計算済みの戦闘（出来事の列）を、時間どおりに再生するだけ。
// 勝ち負けはここでは決めない。灰色試作なので、絵はなく、箱と体力の棒で見せる。
//
// 戦闘をしていない間は、次の面の顔ぶれ（味方と敵）を並べておく（preview）。

import type { BattleEvent, BattleResult, FighterSpec } from "../core/battle.ts";
import { skillLabelOf } from "./texts.ts";

interface Lineup {
  /** 「1-4」など。 */
  stageText: string;
  boss: boolean;
  allies: FighterSpec[];
  enemies: FighterSpec[];
  /** 編成に入れている相棒の名前（いなければ null）。 */
  companionName: string | null;
  name: (key: string) => string;
  /** 戦闘に出る者の絵の URL（なければ null。文字の仮の見た目のまま）。 */
  art?: (key: string) => string | null;
  /** 背景の絵の URL（なければ null）。 */
  background?: string | null;
}

/** 戦闘の音を鳴らすための知らせ（新しく起きた出来事だけ）。 */
export type BattleFx = "hit" | "skill" | "heal";

export interface BattleShow extends Lineup {
  /** 戦闘が始まる時刻と、終わる時刻（ゲームの中の時刻）。 */
  atMs: number;
  endsAtMs: number;
  replay: BattleResult;
  gaugeMax: number;
  gaugePerAttack: number;
  timeLimitSec: number;
}

export interface BattlePreview extends Lineup {
  /** 真ん中に出す言葉（「戦闘中…」など。なければ出さない）。 */
  banner?: string;
}

export interface BattleView {
  /** 戦闘を再生する。 */
  show: (b: BattleShow) => void;
  /** 戦闘をしていない間の表示（次の面の顔ぶれ）。 */
  preview: (p: BattlePreview) => void;
  /** 毎フレーム呼ぶ。nowMs はゲームの中の時刻。 */
  update: (nowMs: number) => void;
}

interface Unit {
  el: HTMLElement;
  fill: HTMLElement;
  hpText: HTMLElement;
  gaugeFill: HTMLElement | null;
  maxHp: number;
  hp: number;
  gauge: number;
}

/** これより古い出来事は、演出を省いて結果だけ反映する（画面を離れて戻ったときなど）。 */
const FRESH_SEC = 0.6;

function div(className: string, text?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function createBattleView(root: HTMLElement, onFx: (fx: BattleFx) => void = () => undefined): BattleView {
  root.textContent = "";
  const rows: Record<string, HTMLElement> = {};
  const order: [number, number][] = [
    [1, 1],
    [1, 0],
    [0, 0],
    [0, 1],
  ];
  const mid = div("fmid");
  const chip = div("stage-chip");
  chip.dataset["testid"] = "battle-stage";
  const companionChip = div("comp-chip");
  companionChip.dataset["testid"] = "battle-companion";
  companionChip.hidden = true;
  const timer = div("timer");
  timer.dataset["testid"] = "battle-timer";
  const midLeft = div("fmid-left");
  midLeft.append(chip, companionChip);
  mid.append(midLeft, timer);
  order.forEach(([side, row], i) => {
    const el = div("frow");
    el.dataset["side"] = String(side);
    el.dataset["row"] = String(row);
    rows[`${side}-${row}`] = el;
    root.appendChild(el);
    if (i === 1) root.appendChild(mid);
  });
  const banner = div("banner");
  banner.dataset["testid"] = "battle-banner";
  banner.hidden = true;
  root.appendChild(banner);

  let current: BattleShow | null = null;
  let units: Unit[][] = [[], []];
  let gaugeMax = 100;
  let next = 0;
  let finished = false;
  let lastSkillKey = "";

  const makeUnit = (spec: FighterSpec, side: number, index: number, b: Lineup): Unit => {
    const el = div(`unit${side === 1 && b.boss ? " boss" : ""}${spec.trait ? ` trait-${spec.trait}` : ""}`);
    el.dataset["testid"] = `unit-${side}-${index}`;
    const art = b.art ? b.art(spec.key) : null;
    if (art !== null) {
      el.classList.add("has-art");
      const img = document.createElement("img");
      img.className = "unit-art";
      img.src = art;
      img.alt = "";
      img.draggable = false;
      el.appendChild(img);
    }
    const name = div("unit-name", b.name(spec.key));
    const bar = div("hpbar");
    const fill = div("hpfill");
    bar.appendChild(fill);
    const hpText = div("unit-hp", String(spec.hp));
    el.append(name, bar, hpText);
    let gaugeFill: HTMLElement | null = null;
    if (spec.skill !== null) {
      const g = div("gauge");
      gaugeFill = div("gaugefill");
      g.appendChild(gaugeFill);
      el.appendChild(g);
    }
    (rows[`${side}-${spec.row}`] as HTMLElement).appendChild(el);
    return { el, fill, hpText, gaugeFill, maxHp: spec.hp, hp: spec.hp, gauge: 0 };
  };

  const paint = (u: Unit): void => {
    const ratio = u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 0;
    u.fill.style.width = `${ratio * 100}%`;
    u.hpText.textContent = String(Math.max(0, Math.round(u.hp)));
    u.el.classList.toggle("down", u.hp <= 0);
    if (u.gaugeFill) u.gaugeFill.style.width = `${Math.min(1, u.gauge / gaugeMax) * 100}%`;
  };

  const pulse = (el: HTMLElement, className: string, ms: number): void => {
    el.classList.remove(className);
    // 同じ演出を続けて出せるように、いったん外してから付け直す
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), ms);
  };

  const float = (host: HTMLElement, text: string, className: string): void => {
    const f = div(`float ${className}`, text);
    host.appendChild(f);
    f.addEventListener("animationend", () => f.remove());
    window.setTimeout(() => f.remove(), 1200);
  };

  const apply = (e: BattleEvent, fresh: boolean): void => {
    if (!current) return;
    // 相棒の行動は actor が -1。場に立っていないので、真ん中の札から技を出す
    const byCompanion = e.actor === -1;
    const actor = byCompanion ? undefined : units[e.side]?.[e.actor];
    const target = e.target >= 0 ? units[e.targetSide]?.[e.target] : undefined;
    if (!actor && !byCompanion) return;

    if (e.kind === "down") {
      if (actor) {
        actor.hp = 0;
        paint(actor);
      }
      return;
    }
    const skill = skillLabelOf(e.kind);
    if (actor) {
      if (e.kind === "attack") actor.gauge += current.gaugePerAttack;
      else actor.gauge = 0;
      paint(actor);
    }
    if (fresh) {
      const host = actor ? actor.el : companionChip;
      if (actor) pulse(actor.el, e.side === 0 ? "lunge-up" : "lunge-down", 220);
      else pulse(companionChip, "comp-act", 400);
      const key = `${e.t}-${e.side}-${e.actor}`;
      if (skill !== null && key !== lastSkillKey) {
        lastSkillKey = key;
        float(host, skill, "float-skill");
        onFx("skill");
      }
    }
    if (!target) return;
    const healing = e.kind === "heal" || e.kind === "healall" || e.kind === "selfheal";
    if (healing) {
      target.hp = Math.min(target.maxHp, target.hp + e.amount);
      if (fresh && e.amount > 0) {
        float(target.el, `+${e.amount}`, "float-heal");
        onFx("heal");
      }
    } else {
      target.hp = Math.max(0, target.hp - e.amount);
      if (fresh) {
        float(target.el, `-${e.amount}`, e.kind === "attack" ? "float-dmg" : "float-dmg float-big");
        pulse(target.el, "hit", 180);
        onFx("hit");
      }
    }
    paint(target);
  };

  const lineUp = (b: Lineup): void => {
    for (const el of Object.values(rows)) el.textContent = "";
    units = [b.allies.map((s, i) => makeUnit(s, 0, i, b)), b.enemies.map((s, i) => makeUnit(s, 1, i, b))];
    for (const side of units) for (const u of side) paint(u);
    root.style.backgroundImage = b.background ? `url("${b.background}")` : "";
    root.classList.toggle("has-bg", Boolean(b.background));
    chip.textContent = b.stageText === "" ? "" : `${b.stageText}${b.boss ? " ボス" : ""}`;
    chip.hidden = b.stageText === "";
    companionChip.hidden = b.companionName === null;
    companionChip.textContent = b.companionName === null ? "" : `相棒 ${b.companionName}`;
    root.classList.toggle("is-boss", b.boss);
  };

  const show = (b: BattleShow): void => {
    current = b;
    gaugeMax = b.gaugeMax;
    next = 0;
    finished = false;
    lastSkillKey = "";
    lineUp(b);
    timer.textContent = "";
    banner.hidden = true;
  };

  const preview = (p: BattlePreview): void => {
    current = null;
    lineUp(p);
    timer.textContent = "";
    if (p.banner) {
      banner.hidden = false;
      banner.className = "banner banner-intro";
      banner.textContent = p.banner;
    } else {
      banner.hidden = true;
    }
  };

  const update = (nowMs: number): void => {
    const b = current;
    if (!b) return;
    const t = (nowMs - b.atMs) / 1000;
    if (t < 0) {
      // 戦闘が始まるまで（面の紹介）
      banner.hidden = false;
      banner.className = "banner banner-intro";
      banner.textContent = `${b.stageText}${b.boss ? " ボス戦" : ""}`;
      return;
    }
    if (!finished) banner.hidden = true;
    const events = b.replay.events;
    const visible = document.visibilityState !== "hidden";
    while (next < events.length && (events[next] as BattleEvent).t <= t) {
      const e = events[next] as BattleEvent;
      apply(e, visible && t - e.t < FRESH_SEC);
      next += 1;
    }
    const shown = Math.min(t, b.replay.durationSec);
    timer.textContent = `${Math.floor(shown)}秒 / ${b.timeLimitSec}秒`;
    if (!finished && nowMs >= b.endsAtMs) {
      finished = true;
      banner.hidden = false;
      if (b.replay.win) {
        banner.className = "banner banner-win";
        banner.textContent = "勝利！";
      } else {
        banner.className = "banner banner-lose";
        banner.textContent = b.replay.timedOut ? "時間切れ…" : "負け…";
      }
    }
  };

  return { show, preview, update };
}
