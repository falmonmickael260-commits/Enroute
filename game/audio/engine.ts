"use client";

import { mixer, type SoundName, type Voice } from "./mixer";

/**
 * A living engine: three recordings of the same road-car engine at rising
 * rpm, crossfaded and re-pitched continuously from the car's real speed,
 * through a simulated four-speed gearbox. On throttle the engine is louder
 * and brighter; lifting off drops it into a muffled overrun; stopped, it
 * settles back to idle. Tyre roll and air rush grow with speed, and braking
 * scrubs, or on a hard stop squeals, the tyres.
 */

/** Firing frequency of the engine at idle and at the top of the rev range (Hz). */
const F_IDLE = 30;
const F_MAX = 148;
/** The three recordings and the firing frequency each was captured at. */
const LAYERS: { name: SoundName; f: number }[] = [
  { name: "engineLow", f: 42.9 },
  { name: "engineMid", f: 64.8 },
  { name: "engineHigh", f: 76.3 },
];
/** Engine level idling, and flat out on throttle. */
const IDLE_LEVEL = 0.1;
const FULL_LEVEL = 0.85;
/** Top speed of each gear, as a share of the car's top speed. */
const GEAR_TOP = [0.3, 0.52, 0.76, 1];

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (x: number) => x * x * (3 - 2 * x);
/** 0 below a, 1 above b, eased between. */
const band = (x: number, a: number, b: number) => smooth(clamp((x - a) / (b - a)));

interface Layer {
  voice: Voice;
  f: number;
}

export class EngineVoice {
  private layers: Layer[] = [];
  private filter: BiquadFilterNode | null = null;
  private body: GainNode | null = null;
  private shift: GainNode | null = null;
  private road: { voice: Voice; filter: BiquadFilterNode } | null = null;
  private air: { voice: Voice; filter: BiquadFilterNode } | null = null;
  private skid: Voice | null = null;
  private skidUntil = 0;
  private starting = false;
  private on = false;
  /** Bumped by stop(): a start still loading its files when this changes gives up. */
  private generation = 0;

  /** 0..1, smoothed from the motion reported each frame. */
  private speed = 0;
  private prevSpeed = 0;
  private accel = 0;
  private rpm = 0;
  private throttle = 0;
  private gear = 1;
  private boostUntil = 0;
  private lastShift = 0;

  async start() {
    if (this.on || this.starting) return;
    this.starting = true;
    const generation = this.generation;
    const ctx = mixer.start();
    const buffers = await Promise.all(LAYERS.map((l) => mixer.load(l.name)));
    this.starting = false;
    const out = mixer.output("engine");
    if (!ctx || !out || buffers.some((b) => !b) || this.on) return;
    // the screen went away (or came back and asked again) while loading
    if (generation !== this.generation) {
      if (this.wanted) void this.start();
      return;
    }

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 1100;
    this.filter.Q.value = 0.5;
    this.shift = ctx.createGain();
    this.body = ctx.createGain();
    this.body.gain.value = 0;
    this.filter.connect(this.shift);
    this.shift.connect(this.body);
    this.body.connect(out);

    this.layers = LAYERS.map((l, i) => {
      const source = ctx.createBufferSource();
      source.buffer = buffers[i]!;
      source.loop = true;
      source.playbackRate.value = F_IDLE / l.f;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 1 : 0;
      source.connect(gain);
      gain.connect(this.filter!);
      // each loop starts at a different point so they never phase together
      source.start(0, (buffers[i]!.duration * i) / 3);
      return { voice: { source, gain, stop: () => source.stop() }, f: l.f };
    });

    // tyres rolling on asphalt, and air rushing past: shaped noise
    const noise = mixer.noiseBuffer();
    if (noise) {
      this.road = this.noiseLayer(ctx, noise, "bandpass", 400, 0.8, 0);
      this.air = this.noiseLayer(ctx, noise, "highpass", 1400, 0.4, 0.9);
    }

    this.on = true;
    mixer.ramp(this.body.gain, IDLE_LEVEL, 1.2);
  }

  private noiseLayer(ctx: AudioContext, noise: AudioBuffer, type: BiquadFilterType, freq: number, q: number, offset: number) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(mixer.output("engine")!);
    source.start(0, offset);
    return { voice: { source, gain, stop: () => source.stop() }, filter };
  }

  /** Whether a screen currently wants the engine running. */
  wanted = false;

  stop(fade = 0.8) {
    this.generation++;
    if (!this.on || !mixer.ctx) return;
    this.on = false;
    const ctx = mixer.ctx;
    const end = ctx.currentTime + fade;
    const voices = [...this.layers.map((l) => l.voice), this.road?.voice, this.air?.voice].filter(Boolean) as Voice[];
    if (this.body) mixer.ramp(this.body.gain, 0, fade);
    for (const v of voices) {
      mixer.ramp(v.gain.gain, 0, fade);
      try {
        v.source.stop(end + 0.1);
      } catch {
        // already stopped
      }
    }
    this.skid?.stop(0.2);
    this.layers = [];
    this.road = this.air = null;
    this.speed = this.prevSpeed = this.rpm = this.throttle = 0;
    this.gear = 1;
  }

  /** A hard launch (turbo, sprint): the revs lead and the tyres chirp. */
  boost(ms = 700) {
    this.boostUntil = performance.now() + ms;
    mixer.play("skid", { bus: "effects", gain: 0.22, highpass: 900, duration: 0.32, fadeOut: 0.2, offset: 0.4 });
  }

  /** A few blips of the throttle, standing still (the finish). */
  blip(times = 3) {
    for (let i = 0; i < times; i++) setTimeout(() => (this.boostUntil = performance.now() + 260), i * 520);
  }

  /**
   * Feeds the engine with the car's speed (0..1 of its top speed) and time
   * step; call it every frame while the race is on screen.
   */
  drive(speed01: number, dt: number) {
    if (!this.on || !mixer.ctx || dt <= 0) return;
    const now = performance.now();
    const t = mixer.ctx.currentTime;

    this.prevSpeed = this.speed;
    this.speed += (clamp(speed01) - this.speed) * Math.min(1, dt * 10);
    const accel = (this.speed - this.prevSpeed) / dt;
    this.accel += (accel - this.accel) * Math.min(1, dt * 8);
    const boosting = now < this.boostUntil;
    const moving = this.speed > 0.015;

    // gearbox
    if (moving) {
      const top = GEAR_TOP[this.gear - 1];
      if (this.speed > top * 0.97 && this.gear < GEAR_TOP.length && this.accel > 0) this.shiftTo(this.gear + 1, now);
      else if (this.gear > 1 && this.speed < GEAR_TOP[this.gear - 2] * 0.72) {
        // coasting down: gears drop quietly; only a downshift under throttle blips
        if (this.throttle > 0.4) this.shiftTo(this.gear - 1, now);
        else this.gear--;
      }
    } else if (this.gear !== 1) {
      this.gear = 1;
    }

    // throttle: pushing while speeding up, lifted while slowing down
    const wantThrottle = boosting ? 1 : moving ? clamp(0.3 + this.accel * 1.4) * (this.accel < -0.08 ? 0 : 1) : 0;
    this.throttle += (wantThrottle - this.throttle) * Math.min(1, dt * (wantThrottle > this.throttle ? 7 : 4));

    // revs: from the speed within the gear; the clutch lets them lead on a launch
    const lo = this.gear === 1 ? 0 : GEAR_TOP[this.gear - 2];
    const hi = GEAR_TOP[this.gear - 1];
    let target = moving ? 0.22 + 0.72 * clamp((this.speed - lo) / (hi - lo)) : 0;
    if (moving && this.gear === 1 && this.accel > 0) target = Math.max(target, 0.42 * this.throttle);
    if (boosting) target = Math.max(target, 0.85);
    this.rpm += (target - this.rpm) * Math.min(1, dt * (target > this.rpm ? 5 : moving ? 3 : 5));

    const f = F_IDLE + (F_MAX - F_IDLE) * Math.pow(this.rpm, 0.9);
    const w = [1 - band(f, 50, 72), band(f, 50, 72) * (1 - band(f, 95, 120)), band(f, 95, 120)];
    const k = 1 / Math.max(0.001, Math.hypot(w[0], w[1], w[2])); // equal power
    this.layers.forEach((layer, i) => {
      layer.voice.source.playbackRate.setTargetAtTime(f / layer.f, t, 0.03);
      layer.voice.gain.gain.setTargetAtTime(w[i] * k, t, 0.05);
    });

    // on throttle: louder and brighter; lifted: muffled overrun
    const level = IDLE_LEVEL + (FULL_LEVEL - IDLE_LEVEL) * clamp(0.45 * this.rpm + 0.55 * this.throttle * (0.5 + 0.5 * this.rpm));
    this.body?.gain.setTargetAtTime(level, t, 0.06);
    this.filter?.frequency.setTargetAtTime(700 + 1500 * this.rpm + 3600 * this.throttle * (0.4 + 0.6 * this.rpm), t, 0.06);

    // tyres and air grow with speed
    if (this.road) {
      this.road.voice.gain.gain.setTargetAtTime(0.24 * Math.pow(this.speed, 1.2), t, 0.08);
      this.road.filter.frequency.setTargetAtTime(260 + 700 * this.speed, t, 0.08);
    }
    if (this.air) {
      this.air.voice.gain.gain.setTargetAtTime(0.1 * this.speed * this.speed, t, 0.1);
      this.air.filter.frequency.setTargetAtTime(900 + 1400 * this.speed, t, 0.1);
    }

    // braking: a light scrub, or a squeal when stopping hard from speed
    const brake = moving ? clamp(-this.accel * 0.75) : 0;
    if (brake > 0.3 && this.speed > 0.18 && now > this.skidUntil) {
      // a squeal only when stopping hard from real speed; otherwise a discreet scrub
      const hard = brake > 0.7 && this.speed > 0.7;
      const length = 0.35 + this.speed * 0.6;
      this.skid = mixer.play("skid", {
        bus: "effects",
        gain: hard ? 0.28 : 0.1,
        highpass: hard ? 700 : 200,
        lowpass: hard ? 9000 : 1800,
        rate: hard ? 1 : 0.85,
        duration: length,
        fadeOut: length * 0.6,
        offset: Math.random() * 1.5,
      });
      this.skidUntil = now + length * 1000 + 900;
    }
  }

  private shiftTo(gear: number, now: number) {
    if (now - this.lastShift < 350) return;
    this.lastShift = now;
    const up = gear > this.gear;
    this.gear = gear;
    const ctx = mixer.ctx;
    if (!ctx || !this.shift) return;
    const t = ctx.currentTime;
    // the clutch: the note drops away for an instant, then picks up again
    this.shift.gain.cancelScheduledValues(t);
    this.shift.gain.setValueAtTime(1, t);
    this.shift.gain.linearRampToValueAtTime(up ? 0.45 : 0.7, t + 0.05);
    this.shift.gain.linearRampToValueAtTime(1, t + (up ? 0.2 : 0.14));
    if (up) this.rpm *= 0.72;
    else this.rpm = Math.min(1, this.rpm + 0.2);
    mixer.play("tick", { bus: "effects", gain: 0.07, lowpass: 2400, rate: 0.7 + Math.random() * 0.1 });
  }
}
