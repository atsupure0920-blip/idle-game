// 効果音。外部の音のファイルは使わず、ブラウザの中で音を作って鳴らす（権利の心配がなく、読み込みも要らない）。
//
// - iPhone では、画面に1回触れるまで音を鳴らせない。最初に触れたときに準備する（unlock）。
// - 鳴らすかどうかは、端末ごとの設定（localStorage）。セーブには入れない。
// - 同じ音が短い間に重なりすぎないように、種類ごとに間隔を空ける。

export type Sfx = "tap" | "hit" | "skill" | "heal" | "win" | "lose" | "gacha" | "gachaRare" | "levelup" | "coin" | "error";

const STORE_KEY = "idle-game.sound";

/** 同じ音を続けて鳴らすときの、最短の間隔（ミリ秒）。 */
const MIN_GAP: Record<Sfx, number> = {
  tap: 40,
  hit: 70,
  skill: 150,
  heal: 150,
  win: 500,
  lose: 500,
  gacha: 300,
  gachaRare: 300,
  levelup: 80,
  coin: 120,
  error: 200,
};

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let enabled = true;
const lastAt: Partial<Record<Sfx, number>> = {};

function readSetting(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) !== "off";
  } catch {
    return true;
  }
}

/** 起動時に、端末の設定を読む。 */
export function initSound(): void {
  enabled = readSetting();
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORE_KEY, on ? "on" : "off");
  } catch {
    // 保存できなくても、この起動のあいだは切り替わる
  }
}

/** 画面に触れたときに呼ぶ（iPhone で音を鳴らせるようにする）。 */
export function unlockSound(): void {
  try {
    if (ctx === null) {
      const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(c: Ctx, out: AudioNode, freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(out);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(c: Ctx, out: AudioNode, start: number, dur: number, vol: number, cutoff: number): void {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(start);
}

/** 効果音を鳴らす。設定で切っているとき、まだ準備できていないときは、何もしない。 */
export function play(name: Sfx): void {
  if (!enabled || ctx === null || master === null || ctx.state !== "running") return;
  const nowMs = performance.now();
  if (nowMs - (lastAt[name] ?? -1e9) < MIN_GAP[name]) return;
  lastAt[name] = nowMs;
  const c = ctx;
  const out = master;
  const t = c.currentTime + 0.005;
  switch (name) {
    case "tap":
      tone(c, out, 1400, t, 0.045, "triangle", 0.25);
      break;
    case "hit":
      noise(c, out, t, 0.07, 0.5, 1800);
      tone(c, out, 220, t, 0.06, "square", 0.08, 120);
      break;
    case "skill":
      tone(c, out, 500, t, 0.18, "sawtooth", 0.12, 1400);
      noise(c, out, t + 0.05, 0.12, 0.3, 3500);
      break;
    case "heal":
      tone(c, out, 880, t, 0.16, "sine", 0.22);
      tone(c, out, 1320, t + 0.07, 0.18, "sine", 0.16);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(c, out, f, t + i * 0.09, 0.22, "triangle", 0.3));
      break;
    case "lose":
      [392, 330, 262].forEach((f, i) => tone(c, out, f, t + i * 0.14, 0.28, "triangle", 0.25));
      break;
    case "gacha":
      [784, 988, 1175, 1568].forEach((f, i) => tone(c, out, f, t + i * 0.06, 0.14, "sine", 0.22));
      break;
    case "gachaRare":
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(c, out, f, t + i * 0.07, 0.3, "triangle", 0.28));
      noise(c, out, t + 0.4, 0.4, 0.15, 6000);
      break;
    case "levelup":
      tone(c, out, 660, t, 0.08, "square", 0.1);
      tone(c, out, 990, t + 0.06, 0.12, "square", 0.1);
      break;
    case "coin":
      tone(c, out, 1320, t, 0.06, "square", 0.1);
      tone(c, out, 1760, t + 0.05, 0.14, "square", 0.1);
      break;
    case "error":
      tone(c, out, 180, t, 0.16, "square", 0.12);
      break;
  }
}
