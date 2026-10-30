"use client";

import { getSoundEnabled, subscribeSoundEnabled } from "@/game/lib/store/soundStore";
import { getAudioLevels, subscribeAudioLevels, type Bus } from "./settings";

/**
 * The audio graph: every sound goes through one of four buses (engine,
 * effects, ambience, interface), each with the player's volume and a ducking
 * stage, then a master gain (the mute) and a limiter so stacked sounds never
 * clip. Files are fetched once and decoded on demand.
 *
 * Browsers only let sound start after a gesture: the context is resumed (and
 * iOS primed with a silent buffer) on the first tap, click or key press, and
 * it sleeps while the page is hidden.
 */

const FILES = {
  engineLow: "/audio/engine/engine-low.wav",
  engineMid: "/audio/engine/engine-mid.wav",
  engineHigh: "/audio/engine/engine-high.wav",
  skid: "/audio/sfx/skid.mp3",
  impactCar: "/audio/sfx/impact-car.mp3",
  metalHeavy: "/audio/sfx/metal-heavy.mp3",
  metalHeavy2: "/audio/sfx/metal-heavy-2.mp3",
  metalMedium: "/audio/sfx/metal-medium.mp3",
  metalLight: "/audio/sfx/metal-light.mp3",
  metalLight2: "/audio/sfx/metal-light-2.mp3",
  plateHeavy: "/audio/sfx/plate-heavy.mp3",
  plank: "/audio/sfx/plank.mp3",
  tick: "/audio/sfx/tick.mp3",
  glassLight: "/audio/sfx/glass-light.mp3",
  cardDraw: "/audio/ui/card-draw.mp3",
  cardPlay: "/audio/ui/card-play.mp3",
  cardDiscard: "/audio/ui/card-discard.mp3",
  click: "/audio/ui/click.mp3",
  victory: "/audio/ui/victory.mp3",
  wind: "/audio/ambience/wind.mp3",
  birds: "/audio/ambience/birds.mp3",
  crickets: "/audio/ambience/crickets.mp3",
} as const;

export type SoundName = keyof typeof FILES;

/** Needed as soon as a race is on screen; the rest follows when the page is idle. */
const FIRST: SoundName[] = ["engineLow", "engineMid", "engineHigh", "skid", "cardDraw", "cardPlay", "cardDiscard", "click"];

export interface PlayOptions {
  bus?: Bus;
  /** Linear gain on top of the bus. */
  gain?: number;
  rate?: number;
  /** Seconds from now. */
  delay?: number;
  /** -1 (left) .. 1 (right). */
  pan?: number;
  lowpass?: number;
  highpass?: number;
  /** Plays only this many seconds, fading out over the last `fadeOut`. */
  duration?: number;
  fadeOut?: number;
  /** Start offset in the file, seconds. */
  offset?: number;
  loop?: boolean;
}

export interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  stop: (fade?: number) => void;
}

class Mixer {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses = new Map<Bus, { level: GainNode; duck: GainNode }>();
  private buffers = new Map<SoundName, AudioBuffer>();
  private pending = new Map<SoundName, Promise<AudioBuffer | null>>();
  private raw = new Map<SoundName, Promise<ArrayBuffer | null>>();
  private noise: AudioBuffer | null = null;
  private unlocked = false;
  private listening = false;

  /** Creates the graph (once) and starts listening for the unlocking gesture. */
  start(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor({ latencyHint: "interactive" });
      this.ctx = ctx;

      // limiter: stacked sounds are squeezed, never clipped
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 4;
      limiter.ratio.value = 16;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.18;
      // the compressor adds its own make-up gain: trimmed back so peaks stay under 0 dBFS
      const trim = ctx.createGain();
      trim.gain.value = 0.5;
      limiter.connect(trim);
      trim.connect(ctx.destination);

      this.master = ctx.createGain();
      this.master.gain.value = getSoundEnabled() ? 1 : 0;
      this.master.connect(limiter);

      const levels = getAudioLevels();
      for (const bus of ["engine", "effects", "ambience", "ui"] as Bus[]) {
        const level = ctx.createGain();
        const duck = ctx.createGain();
        level.gain.value = levels[bus];
        level.connect(duck);
        duck.connect(this.master);
        this.buses.set(bus, { level, duck });
      }

      subscribeSoundEnabled(() => this.ramp(this.master!.gain, getSoundEnabled() ? 1 : 0, 0.12));
      subscribeAudioLevels(() => {
        const next = getAudioLevels();
        for (const [bus, nodes] of this.buses) this.ramp(nodes.level.gain, next[bus], 0.08);
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) void ctx.suspend().catch(() => {});
        else if (this.unlocked) void ctx.resume().catch(() => {});
      });
    }
    this.listenForGesture();
    if (this.ctx.state === "suspended" && !document.hidden) void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  get running() {
    return this.ctx?.state === "running";
  }

  private listenForGesture() {
    if (this.listening || this.unlocked) return;
    this.listening = true;
    const unlock = () => {
      const ctx = this.ctx;
      if (!ctx) return;
      void ctx.resume().then(() => {
        if (ctx.state !== "running") return;
        this.unlocked = true;
        for (const type of ["pointerdown", "touchend", "keydown", "click"]) window.removeEventListener(type, unlock, true);
      });
      // iOS only opens the output after something plays inside the gesture
      const silent = ctx.createBufferSource();
      silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      silent.connect(ctx.destination);
      silent.start();
    };
    for (const type of ["pointerdown", "touchend", "keydown", "click"]) window.addEventListener(type, unlock, true);
  }

  /** Fetches files now (network only); decoding waits for the context. */
  prefetch(names: SoundName[] = FIRST) {
    for (const name of names) {
      if (this.raw.has(name) || this.buffers.has(name)) continue;
      this.raw.set(
        name,
        fetch(FILES[name])
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null),
      );
    }
  }

  /** The critical set first, everything else once the page is idle. */
  preloadAll() {
    this.prefetch(FIRST);
    for (const name of FIRST) void this.load(name);
    const rest = (Object.keys(FILES) as SoundName[]).filter((n) => !FIRST.includes(n));
    const later = () => {
      this.prefetch(rest);
      for (const name of rest) void this.load(name);
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
    if (w.requestIdleCallback) w.requestIdleCallback(later, { timeout: 2500 });
    else setTimeout(later, 1200);
  }

  load(name: SoundName): Promise<AudioBuffer | null> {
    const ready = this.buffers.get(name);
    if (ready) return Promise.resolve(ready);
    const inFlight = this.pending.get(name);
    if (inFlight) return inFlight;
    const ctx = this.start();
    if (!ctx) return Promise.resolve(null);
    this.prefetch([name]);
    const promise = this.raw.get(name)!.then(async (data) => {
      if (!data) return null;
      try {
        // callbacks for older Safari; the promise (where there is one) is caught too
        const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
          const result = ctx.decodeAudioData(data.slice(0), resolve, reject) as Promise<AudioBuffer> | undefined;
          result?.catch?.(reject);
        });
        this.buffers.set(name, buffer);
        return buffer;
      } catch {
        return null;
      }
    });
    this.pending.set(name, promise);
    return promise;
  }

  buffer(name: SoundName): AudioBuffer | null {
    return this.buffers.get(name) ?? null;
  }

  output(bus: Bus): AudioNode | null {
    return this.buses.get(bus)?.level ?? null;
  }

  /** Two seconds of pink noise, the raw material for road, air and hiss. */
  noiseBuffer(): AudioBuffer | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (this.noise) return this.noise;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    // loop seam: fade the ends into each other
    const x = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < x; i++) {
      const t = i / x;
      data[i] = data[i] * t + data[length - x + i] * (1 - t);
    }
    this.noise = buffer;
    return buffer;
  }

  /** Plays a decoded sound; silently skipped if it isn't loaded yet. */
  play(name: SoundName, opts: PlayOptions = {}): Voice | null {
    const buffer = this.buffers.get(name);
    if (!buffer) {
      void this.load(name);
      return null;
    }
    return this.playBuffer(buffer, opts);
  }

  playBuffer(buffer: AudioBuffer, opts: PlayOptions = {}): Voice | null {
    const ctx = this.ctx;
    const out = this.output(opts.bus ?? "effects");
    if (!ctx || !out || ctx.state !== "running") return null;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop ?? false;
    source.playbackRate.value = opts.rate ?? 1;
    let node: AudioNode = source;
    if (opts.highpass) {
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = opts.highpass;
      node.connect(f);
      node = f;
    }
    if (opts.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = opts.lowpass;
      node.connect(f);
      node = f;
    }
    if (opts.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = opts.pan;
      node.connect(p);
      node = p;
    }
    const gain = ctx.createGain();
    const level = opts.gain ?? 1;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(level, t0 + 0.004);
    node.connect(gain);
    gain.connect(out);
    const offset = opts.offset ?? 0;
    if (opts.duration) {
      const fadeOut = Math.min(opts.fadeOut ?? 0.08, opts.duration);
      gain.gain.setValueAtTime(level, t0 + opts.duration - fadeOut);
      gain.gain.linearRampToValueAtTime(0, t0 + opts.duration);
      source.start(t0, offset);
      source.stop(t0 + opts.duration + 0.05);
    } else {
      source.start(t0, offset);
    }
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    const stop = (fade = 0.08) => {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fade);
      try {
        source.stop(now + fade + 0.02);
      } catch {
        // already stopped
      }
    };
    return { source, gain, stop };
  }

  /** Lowers a bus for a moment (e.g. the interface while the car drives). */
  duck(bus: Bus, amount: number, time = 0.25) {
    const nodes = this.buses.get(bus);
    if (nodes) this.ramp(nodes.duck.gain, amount, time);
  }

  ramp(param: AudioParam, value: number, time: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, Math.max(0.005, time / 3));
  }
}

export const mixer = new Mixer();
