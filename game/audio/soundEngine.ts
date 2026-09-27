"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}) {
  const audio = getCtx();
  if (!audio) return;
  const { type = "sine", gain = 0.16, delay = 0, slideTo } = opts;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  const start = audio.currentTime + delay;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseBurst(duration: number, opts: { gain?: number; delay?: number } = {}) {
  const audio = getCtx();
  if (!audio) return;
  const { gain = 0.14, delay = 0 } = opts;
  const bufferSize = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const g = audio.createGain();
  const start = audio.currentTime + delay;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(g);
  g.connect(audio.destination);
  src.start(start);
}

export const SFX = {
  click: () => tone(520, 0.06, { type: "triangle", gain: 0.1 }),
  cardPlay: () => {
    tone(340, 0.09, { type: "triangle", gain: 0.14 });
    noiseBurst(0.06, { gain: 0.08, delay: 0.02 });
  },
  cardDraw: () => {
    tone(280, 0.08, { type: "sine", gain: 0.1 });
    tone(420, 0.08, { type: "sine", gain: 0.08, delay: 0.05 });
  },
  cardDiscard: () => noiseBurst(0.12, { gain: 0.12 }),
  move: () => {
    tone(180, 0.25, { type: "sawtooth", gain: 0.05, slideTo: 260 });
  },
  hazard: () => {
    tone(160, 0.18, { type: "square", gain: 0.14, slideTo: 60 });
    noiseBurst(0.2, { gain: 0.12, delay: 0.02 });
  },
  shield: () => {
    tone(440, 0.1, { type: "sine", gain: 0.12 });
    tone(660, 0.14, { type: "sine", gain: 0.1, delay: 0.08 });
  },
  turnChange: () => {
    tone(500, 0.08, { type: "triangle", gain: 0.1 });
    tone(660, 0.1, { type: "triangle", gain: 0.1, delay: 0.09 });
  },
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, { type: "triangle", gain: 0.14, delay: i * 0.12 }));
  },
};

export type SoundName = keyof typeof SFX;
