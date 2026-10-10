// 戦闘の表示。core が計算済みの戦闘（出来事の列）を、時間どおりに再生するだけ。
// 勝ち負けはここでは決めない。灰色試作なので、絵はなく、箱と体力の棒で見せる。

import type { BattleEvent, BattleResult, FighterSpec } from "../core/battle.ts";
import { skillLabelOf } from "./texts.ts";

export interface BattleShow {
  /** 「1-4」など。 */
  stageText: string;
  boss: boolean;
  /** 新しい面への挑戦か、手前の面での稼ぎか。 */
  challenge: boolean;
  atMs: number;
  endsAtMs: number;
  replay: BattleResult;
  allies: FighterSpec[];
  enemies: FighterSpec[];
  name: (key: string) => string;
  gaugeMax: number;
  gaugePerAttack: number;
  timeLimitSec: number;
}

export interface BattleView {
  show: (b: BattleShow) => void;
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

export function createBattleView(root: HTMLElement): BattleView {
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
  const timer = div("timer");
  timer.dataset["testid"] = "battle-timer";
  mid.append(chip, timer);
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
  let next = 0;
  let finished = false;
  let lastSkillKey = "";

  const makeUnit = (spec: FighterSpec, side: number, index: number, b: BattleShow): Unit => {
    const el = div(`unit${side === 1 && b.boss ? " boss" : ""}${spec.trait ? ` trait-${spec.trait}` : ""}`);
    el.dataset["testid"] = `unit-${side}-${index}`;
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
    if (u.gaugeFill && current) u.gaugeFill.style.width = `${Math.min(1, u.gauge / current.gaugeMax) * 100}%`;
  };

  const pulse = (el: HTMLElement, className: string, ms: number): void => {
    el.classList.remove(className);
    // 同じ演出を続けて出せるように、いったん外してから付け直す
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), ms);
  };

  const float = (u: Unit, text: string, className: string): void => {
    const f = div(`float ${className}`, text);
    u.el.appendChild(f);
    f.addEventListener("animationend", () => f.remove());
    window.setTimeout(() => f.remove(), 1200);
  };

  const apply = (e: BattleEvent, fresh: boolean): void => {
    if (!current) return;
    const actor = units[e.side]?.[e.actor];
    const target = e.target >= 0 ? units[e.targetSide]?.[e.target] : undefined;
    if (!actor) return;

    if (e.kind === "down") {
      actor.hp = 0;
      paint(actor);
      return;
    }
    const skill = skillLabelOf(e.kind);
    if (e.kind === "attack") {
      actor.gauge += current.gaugePerAttack;
    } else {
      actor.gauge = 0;
    }
    paint(actor);
    if (fresh) {
      pulse(actor.el, e.side === 0 ? "lunge-up" : "lunge-down", 220);
      const key = `${e.t}-${e.side}-${e.actor}`;
      if (skill !== null && key !== lastSkillKey) {
        lastSkillKey = key;
        float(actor, skill, "float-skill");
      }
    }
    if (!target) return;
    const healing = e.kind === "heal" || e.kind === "healall" || e.kind === "selfheal";
    if (healing) {
      target.hp = Math.min(target.maxHp, target.hp + e.amount);
      if (fresh && e.amount > 0) float(target, `+${e.amount}`, "float-heal");
    } else {
      target.hp = Math.max(0, target.hp - e.amount);
      if (fresh) {
        float(target, `-${e.amount}`, e.kind === "attack" ? "float-dmg" : "float-dmg float-big");
        pulse(target.el, "hit", 180);
      }
    }
    paint(target);
  };

  const show = (b: BattleShow): void => {
    current = b;
    next = 0;
    finished = false;
    lastSkillKey = "";
    for (const el of Object.values(rows)) el.textContent = "";
    units = [b.allies.map((s, i) => makeUnit(s, 0, i, b)), b.enemies.map((s, i) => makeUnit(s, 1, i, b))];
    for (const side of units) for (const u of side) paint(u);
    chip.textContent = `${b.stageText}${b.boss ? " ボス" : ""}${b.challenge ? "" : "（稼ぎ）"}`;
    timer.textContent = "";
    banner.hidden = true;
    root.classList.toggle("is-boss", b.boss);
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

  return { show, update };
}
