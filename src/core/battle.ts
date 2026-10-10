// 自動戦闘。
//
// 戦闘は「入力（双方の能力と乱数）から結果が決まる計算」で、始まった時点で結末まで求める。
// 画面は、返ってきた出来事（events）を時間どおりに再生するだけ。模擬プレイは結果だけを使う。

import type { Rng } from "./rng.ts";
import type { Params, Skill, Trait } from "./params.ts";

export interface FighterSpec {
  /** 団員のID、または敵の種類。表示用。 */
  key: string;
  /** 0 = 前列、1 = 後列。前列が残っている間は、前列が狙われる。 */
  row: 0 | 1;
  hp: number;
  atk: number;
  /** 攻撃の間隔（秒）。 */
  interval: number;
  skill: Skill | null;
  /** 持ち味（挑発、後列ねらい）。なければ省略。 */
  trait?: Trait | null;
}

export type BattleEventKind = "attack" | "strike" | "aoe" | "heal" | "healall" | "selfheal" | "rally" | "down";

export interface BattleEvent {
  /** 戦闘開始からの秒数。 */
  t: number;
  /** 行動した側。0 = 味方、1 = 敵。 */
  side: 0 | 1;
  /** 行動した者の、その側での番号。 */
  actor: number;
  kind: BattleEventKind;
  /** 対象の側と番号。全体が対象のときは target が -1。 */
  targetSide: 0 | 1;
  target: number;
  /** ダメージ、または回復の量。 */
  amount: number;
}

export interface BattleResult {
  win: boolean;
  /** 時間切れで負けたか。 */
  timedOut: boolean;
  durationSec: number;
  events: BattleEvent[];
  allyHp: number[];
  enemyHp: number[];
}

interface Fighter {
  side: 0 | 1;
  index: number;
  row: 0 | 1;
  maxHp: number;
  hp: number;
  atk: number;
  interval: number;
  skill: Skill | null;
  trait: Trait | null;
  gauge: number;
  nextAt: number;
  rallyUntil: number;
  rallyMult: number;
}

export function runBattle(
  allies: FighterSpec[],
  enemies: FighterSpec[],
  bp: Params["battle"],
  rng: Rng,
  record: boolean,
): BattleResult {
  const make = (spec: FighterSpec, side: 0 | 1, index: number): Fighter => ({
    side,
    index,
    row: spec.row,
    maxHp: spec.hp,
    hp: spec.hp,
    atk: spec.atk,
    interval: spec.interval,
    skill: spec.skill,
    trait: spec.trait ?? null,
    gauge: 0,
    // 味方が少し先に動く。同じ側の中では、番号の順に少しずつずらす。
    nextAt: spec.interval * (side === 0 ? 0.5 : 0.9) + index * 0.07,
    rallyUntil: -1,
    rallyMult: 1,
  });
  const all: Fighter[] = [...allies.map((s, i) => make(s, 0, i)), ...enemies.map((s, i) => make(s, 1, i))];
  const events: BattleEvent[] = [];
  const push = (e: BattleEvent): void => {
    if (record) events.push(e);
  };
  const alive = (side: 0 | 1): Fighter[] => all.filter((f) => f.side === side && f.hp > 0);

  const damageOf = (actor: Fighter, base: number, t: number): number => {
    const rally = actor.rallyUntil >= t ? actor.rallyMult : 1;
    const spread = 1 + bp.damageVariance * (2 * rng.next() - 1);
    return Math.max(1, Math.round(base * rally * spread));
  };
  const hit = (actor: Fighter, target: Fighter, base: number, kind: BattleEventKind, t: number): void => {
    const amount = damageOf(actor, base, t);
    target.hp = Math.max(0, target.hp - amount);
    push({ t, side: actor.side, actor: actor.index, kind, targetSide: target.side, target: target.index, amount });
    if (target.hp === 0) {
      push({ t, side: target.side, actor: target.index, kind: "down", targetSide: target.side, target: target.index, amount: 0 });
    }
  };
  const heal = (actor: Fighter, target: Fighter, base: number, kind: BattleEventKind, t: number): void => {
    const amount = Math.min(target.maxHp - target.hp, Math.max(1, Math.round(base)));
    target.hp += amount;
    push({ t, side: actor.side, actor: actor.index, kind, targetSide: target.side, target: target.index, amount });
  };
  // 狙う相手の決め方（運では選ばない）:
  //   1. 相手に「挑発」持ちが残っていれば、その中から
  //   2. 自分が「後列ねらい」なら、相手の後列から（後列がいなければ前列）
  //   3. それ以外は、相手の前列から（前列がいなければ後列）
  //   候補の中では、残りの体力がいちばん少ない相手（同じなら番号の若いほう）。
  const pickTarget = (actor: Fighter, foes: Fighter[]): Fighter => {
    let pool = foes.filter((f) => f.trait === "taunt");
    if (pool.length === 0) {
      const wanted = actor.trait === "backline" ? 1 : 0;
      pool = foes.filter((f) => f.row === wanted);
    }
    if (pool.length === 0) pool = foes;
    let target = pool[0] as Fighter;
    for (const f of pool) if (f.hp < target.hp) target = f;
    return target;
  };

  let t = 0;
  let timedOut = false;
  while (true) {
    let cur: Fighter | null = null;
    for (const f of all) {
      if (f.hp > 0 && (cur === null || f.nextAt < cur.nextAt)) cur = f;
    }
    if (cur === null) break;
    if (cur.nextAt > bp.timeLimitSec) {
      t = bp.timeLimitSec;
      timedOut = true;
      break;
    }
    t = cur.nextAt;
    const foeSide: 0 | 1 = cur.side === 0 ? 1 : 0;
    const foes = alive(foeSide);
    const friends = alive(cur.side);
    if (foes.length === 0) break;

    if (cur.skill !== null && cur.gauge >= bp.gaugeMax) {
      cur.gauge = 0;
      const s = cur.skill;
      if (s.type === "strike") {
        hit(cur, pickTarget(cur, foes), cur.atk * s.power, "strike", t);
      } else if (s.type === "aoe") {
        for (const f of foes) hit(cur, f, cur.atk * s.power, "aoe", t);
      } else if (s.type === "heal") {
        let target = friends[0] as Fighter;
        for (const f of friends) if (f.hp / f.maxHp < target.hp / target.maxHp) target = f;
        heal(cur, target, cur.atk * s.power, "heal", t);
      } else if (s.type === "healall") {
        for (const f of friends) heal(cur, f, cur.atk * s.power, "healall", t);
      } else if (s.type === "selfheal") {
        heal(cur, cur, cur.maxHp * s.power, "selfheal", t);
      } else {
        for (const f of friends) {
          f.rallyUntil = t + bp.rallySec;
          f.rallyMult = 1 + s.power;
        }
        push({ t, side: cur.side, actor: cur.index, kind: "rally", targetSide: cur.side, target: -1, amount: 0 });
      }
    } else {
      cur.gauge += bp.gaugePerAttack;
      hit(cur, pickTarget(cur, foes), cur.atk, "attack", t);
    }
    cur.nextAt = t + cur.interval;

    if (alive(0).length === 0 || alive(1).length === 0) break;
  }

  const allyHp = all.filter((f) => f.side === 0).map((f) => f.hp);
  const enemyHp = all.filter((f) => f.side === 1).map((f) => f.hp);
  const win = !timedOut && enemyHp.every((h) => h === 0) && allyHp.some((h) => h > 0);
  return { win, timedOut, durationSec: Math.round(t * 100) / 100, events, allyHp, enemyHp };
}
