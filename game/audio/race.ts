"use client";

import type { AmbianceId, AnimationEvent, DefenseType, GameState, HazardType } from "@/game/types/game";
import { EngineVoice } from "./engine";
import { mixer, type Voice } from "./mixer";

/** Car speed (km per second, on screen) that counts as flat out. */
const TOP_SPEED = 110;

export interface CarMotion {
  id: string;
  km: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * The sound of a race: one engine for the car in focus (the one driving, or
 * idling while cards are played), the events of the game as real sounds, and
 * a quiet outdoor bed. Fed by the 3D board's motion each frame, or by a
 * simulated drive on the classic board.
 */
class RaceAudio {
  readonly engine = new EngineVoice();
  private ambience: Voice[] = [];
  private ambienceGeneration = 0;
  private mounted = 0;
  private lastKm = new Map<string, number>();
  private lastFrame = 0;
  /** Latest speed reported by the board (0..1) and when. */
  private input = 0;
  private inputAt = 0;
  /** Time between the board's last two frames (ms): a slow 3D frame rate mustn't read as a stop. */
  private frameGap = 16;
  private sim: { dist: number; start: number; dur: number; lastT: number } | null = null;
  private raf = 0;
  private moving = false;

  /** A race screen appeared: warm up, start the engine idling and the outdoors. */
  mount(ambiance: AmbianceId) {
    this.mounted++;
    if (this.mounted > 1) return;
    mixer.start();
    mixer.preloadAll();
    this.engine.wanted = true;
    void this.engine.start();
    void this.startAmbience(ambiance, ++this.ambienceGeneration);
    this.lastKm.clear();
    // the engine is updated every frame, moving or not, so it always settles back to idle
    let last = performance.now();
    const tick = (t: number) => {
      // real time between frames (up to half a second): a slow device still gets the whole curve
      const dt = Math.min(0.5, Math.max(0.001, (t - last) / 1000));
      last = t;
      this.feed(this.currentSpeed(t), dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private currentSpeed(t: number) {
    const sim = this.sim;
    if (sim) {
      const ease = (a: number) => (a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2);
      const a = Math.min(1, (t - sim.start) / sim.dur);
      const a0 = Math.min(1, Math.max(0, (sim.lastT - sim.start) / sim.dur));
      const dt = Math.max(0.001, (t - sim.lastT) / 1000);
      sim.lastT = t;
      if (a >= 1) this.sim = null;
      return ((ease(a) - ease(a0)) * sim.dist) / dt / TOP_SPEED;
    }
    return t - this.inputAt < Math.max(200, this.frameGap * 2.5) ? this.input : 0;
  }

  unmount() {
    this.mounted = Math.max(0, this.mounted - 1);
    if (this.mounted) return;
    this.engine.wanted = false;
    this.engine.stop(0.6);
    this.ambienceGeneration++;
    for (const v of this.ambience) v.stop(1.2);
    this.ambience = [];
    cancelAnimationFrame(this.raf);
    this.sim = null;
    mixer.duck("ui", 1);
    mixer.duck("ambience", 1);
  }

  private async startAmbience(ambiance: AmbianceId, generation: number) {
    const bed = ambiance === "nuit" ? "crickets" : "birds";
    const [wind, life] = await Promise.all([mixer.load("wind"), mixer.load(bed)]);
    // only the latest mount gets its outdoors (no doubled beds)
    if (!this.mounted || !mixer.ctx || generation !== this.ambienceGeneration) return;
    // long loops, faded in slowly; life (birds or crickets) sits under the wind
    for (const [buffer, gain] of [
      [wind, 0.07],
      [life, ambiance === "crepuscule" ? 0.05 : 0.07],
    ] as const) {
      if (!buffer) continue;
      const v = mixer.playBuffer(buffer, { bus: "ambience", loop: true, gain: 0, offset: rand(0, buffer.duration) });
      if (v) {
        mixer.ramp(v.gain.gain, gain, 4);
        this.ambience.push(v);
      }
    }
    // the context wasn't running yet (no tap so far): try again shortly
    if (!this.ambience.length)
      setTimeout(() => generation === this.ambienceGeneration && !this.ambience.length && void this.startAmbience(ambiance, generation), 1500);
  }

  /**
   * Positions of the cars this frame (3D board): the fastest one drives the
   * engine, and a car going past another one makes it heard.
   */
  motion(cars: CarMotion[]) {
    const now = performance.now();
    const gap = this.lastFrame ? now - this.lastFrame : 16;
    const dt = Math.min(1, gap / 1000);
    this.frameGap = gap;
    this.lastFrame = now;
    let fastest = 0;
    let mover: CarMotion | null = null;
    for (const car of cars) {
      const prev = this.lastKm.get(car.id);
      this.lastKm.set(car.id, car.km);
      if (prev === undefined) continue;
      const v = Math.abs(car.km - prev) / dt;
      if (v > fastest) {
        fastest = v;
        mover = car;
      }
      if (mover === car && v > 20) {
        // overtaking: the mover crosses a standing car
        for (const other of cars) {
          if (other.id === car.id) continue;
          if ((prev < other.km && car.km >= other.km) || (prev > other.km && car.km <= other.km)) this.passBy(v / TOP_SPEED);
        }
      }
    }
    this.input = fastest / TOP_SPEED;
    this.inputAt = now;
  }

  private feed(speed01: number, dt: number) {
    this.engine.drive(speed01, dt);
    const moving = speed01 > 0.05;
    if (moving !== this.moving) {
      this.moving = moving;
      // while a car drives, the engine leads and the rest steps back
      mixer.duck("ui", moving ? 0.6 : 1, moving ? 0.3 : 1.2);
      mixer.duck("ambience", moving ? 0.7 : 1, moving ? 0.5 : 2);
    }
  }

  /**
   * Classic board (no 3D motion): drives the engine along the same kind of
   * run the 3D board animates, from `from` to `to` km.
   */
  simulate(from: number, to: number, target: number) {
    const dist = Math.abs(to - from);
    // same timing as the 3D board's cars
    const dur = Math.min(2600, 950 + (dist / Math.max(1, target)) * 5200);
    const now = performance.now();
    this.sim = { dist, start: now, dur, lastT: now };
  }

  /** Air displaced by a car going past another. */
  passBy(intensity: number) {
    const ctx = mixer.ctx;
    const noise = mixer.noiseBuffer();
    const out = mixer.output("effects");
    if (!ctx || !noise || !out || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const level = 0.05 + 0.1 * Math.min(1, intensity);
    // a band of noise sweeping down and across: the whoosh of a car passing close
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.7);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.8);
    src.connect(bp);
    if (pan) {
      pan.pan.setValueAtTime(-0.6, t);
      pan.pan.linearRampToValueAtTime(0.6, t + 0.7);
      bp.connect(pan);
      pan.connect(g);
    } else bp.connect(g);
    g.connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.85);
    // and the other car's engine, dopplered from above to below its note
    mixer.play("engineMid", { bus: "effects", gain: level * 1.4, rate: 1.25, duration: 0.75, fadeOut: 0.45, lowpass: 2400, pan: 0.3 });
  }

  /** Start count: a beep per number, a higher one and the engines revving on "go" (0). */
  countdown(remaining: number) {
    if (remaining > 0) mixer.play("tick", { bus: "ui", gain: 0.5, rate: 0.85 });
    else {
      mixer.play("tick", { bus: "ui", gain: 0.6, rate: 1.7 });
      this.launch("sprint");
    }
  }

  /** The launch of a move, from the style of card played. */
  launch(style: "turbo" | "sprint" | "fast" | "drive" | "overtake" | "shortcut") {
    if (style === "turbo" || style === "sprint") this.engine.boost(style === "turbo" ? 900 : 700);
  }

  // ------------------------------------------------------------- events

  /** A game event is shown: plays what it sounds like. */
  event(ev: AnimationEvent, state: GameState) {
    switch (ev.kind) {
      case "draw":
        return mixer.play("cardDraw", { bus: "ui", gain: 0.55, rate: rand(0.96, 1.04) });
      case "discard":
        return mixer.play("cardDiscard", { bus: "ui", gain: 0.5, rate: rand(0.95, 1.05) });
      case "turnChange":
        return mixer.play("click", { bus: "ui", gain: 0.22, lowpass: 5000 });
      case "move":
        return;
      case "hazard":
        return this.hazard(ev.hazard);
      case "shield": {
        const player = state.players.find((p) => p.id === ev.playerId);
        return this.defense(ev.defense, !!player?.shields.includes(ev.defense));
      }
      case "victory":
        mixer.play("victory", { bus: "ui", gain: 0.7 });
        this.engine.blip(3);
        return;
    }
  }

  private hazard(h: HazardType) {
    mixer.duck("engine", 0.55, 0.1);
    setTimeout(() => mixer.duck("engine", 1, 0.8), 900);
    switch (h) {
      case "collision":
        // brakes locked, then the hit and the debris
        mixer.play("skid", { gain: 0.3, highpass: 600, duration: 0.42, fadeOut: 0.12, offset: 0.2 });
        mixer.play("impactCar", { gain: 0.9, rate: 0.82, delay: 0.34 });
        mixer.play("plateHeavy", { gain: 0.6, rate: 0.75, delay: 0.35, lowpass: 5000 });
        mixer.play("metalHeavy", { gain: 0.45, rate: 0.9, delay: 0.37 });
        mixer.play("glassLight", { gain: 0.22, rate: 1.1, delay: 0.46, highpass: 1500 });
        return;
      case "crevaison":
        // the tyre bursts, air rushes out, the rim settles
        mixer.play("impactCar", { gain: 0.7, rate: 1.25, highpass: 180 });
        this.hiss(1.4, 0.22, 0.04);
        mixer.play("metalLight", { gain: 0.18, rate: 0.7, delay: 0.55, lowpass: 3000 });
        return;
      case "panne":
        this.sputter();
        return;
      case "barrage":
        // braking before the barrier, then barrier boards knocked into place
        mixer.play("skid", { gain: 0.24, highpass: 500, duration: 0.55, fadeOut: 0.3, offset: 1 });
        mixer.play("plank", { gain: 0.6, delay: 0.45 });
        mixer.play("metalMedium", { gain: 0.35, rate: 0.85, delay: 0.52 });
        return;
      case "radar":
        // a light dab on the brakes, then the camera's shutter
        mixer.play("skid", { gain: 0.12, lowpass: 1600, duration: 0.3, fadeOut: 0.2, offset: 2 });
        mixer.play("tick", { gain: 0.6, rate: 1.9, highpass: 1500, delay: 0.25 });
        mixer.play("glassLight", { gain: 0.3, rate: 2.2, highpass: 2500, delay: 0.27 });
        return;
    }
  }

  private defense(d: DefenseType, asShield: boolean) {
    if (asShield) {
      // protection taken in advance: a quick check-over of the car
      mixer.play("metalLight", { gain: 0.25, rate: 1.2 });
      mixer.play("click", { bus: "ui", gain: 0.25, delay: 0.12 });
      return;
    }
    switch (d) {
      case "reparation":
        // a few spanner turns, then the engine starts again
        [0, 0.2, 0.42].forEach((delay, i) => mixer.play(i % 2 ? "metalLight2" : "metalLight", { gain: 0.32, rate: rand(0.9, 1.1), delay }));
        this.restart(0.8);
        return;
      case "roueSecours":
        // the impact wrench spinning the nuts off and on
        for (let i = 0; i < 9; i++) mixer.play("tick", { gain: 0.4, rate: rand(1.6, 1.8), highpass: 700, delay: i * 0.045 });
        for (let i = 0; i < 9; i++) mixer.play("tick", { gain: 0.4, rate: rand(1.6, 1.8), highpass: 700, delay: 0.65 + i * 0.045 });
        mixer.play("metalHeavy2", { gain: 0.45, rate: 0.7, delay: 0.45, lowpass: 3000 });
        return;
      case "pleinEssence":
        this.restart(0.2);
        return;
      case "passageLibre":
        mixer.play("plank", { gain: 0.4, rate: 1.1 });
        mixer.play("metalMedium", { gain: 0.2, delay: 0.1 });
        this.engine.blip(1);
        return;
      case "gps":
        mixer.play("click", { bus: "ui", gain: 0.3 });
        mixer.play("click", { bus: "ui", gain: 0.25, rate: 1.3, delay: 0.12 });
        return;
    }
  }

  /** Air escaping (a punctured tyre). */
  private hiss(duration: number, gain: number, delay: number) {
    const ctx = mixer.ctx;
    const noise = mixer.noiseBuffer();
    const out = mixer.output("effects");
    if (!ctx || !noise || !out || ctx.state !== "running") return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.setValueAtTime(5200, t);
    hp.frequency.exponentialRampToValueAtTime(2600, t + duration);
    hp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, t + duration);
    src.connect(hp);
    hp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  /** Out of fuel: the engine coughs, stumbles and dies. */
  private sputter() {
    const buffer = mixer.buffer("engineLow");
    const ctx = mixer.ctx;
    if (!buffer || !ctx) return;
    const v = mixer.playBuffer(buffer, { bus: "effects", loop: true, gain: 0.5, rate: 0.78, lowpass: 1800 });
    if (!v) return;
    const t = ctx.currentTime;
    const g = v.gain.gain;
    g.cancelScheduledValues(t);
    let at = t;
    // irregular misfires, further and further apart
    g.setValueAtTime(0, at);
    for (const [on, off] of [
      [0.12, 0.05],
      [0.1, 0.09],
      [0.14, 0.06],
      [0.08, 0.16],
      [0.1, 0.22],
      [0.07, 0.3],
    ]) {
      // each misfire rounded off by a few milliseconds: stumbles, not clicks
      g.setTargetAtTime(0.5, at, 0.012);
      g.setTargetAtTime(0.05, at + on, 0.02);
      at += on + off;
    }
    g.setTargetAtTime(0, at, 0.04);
    v.source.playbackRate.setValueAtTime(0.78, t);
    v.source.playbackRate.linearRampToValueAtTime(0.42, at);
    v.source.stop(at + 0.2);
    mixer.play("tick", { gain: 0.12, rate: 0.6, delay: at - t, lowpass: 1500 });
  }

  /** Starter motor cranking, then the engine catches. */
  private restart(delay: number) {
    const buffer = mixer.buffer("engineLow");
    const ctx = mixer.ctx;
    if (!buffer || !ctx) return;
    const v = mixer.playBuffer(buffer, { bus: "effects", loop: true, gain: 0, rate: 0.36, lowpass: 1400, delay });
    if (!v) return;
    const t = ctx.currentTime + delay;
    const g = v.gain.gain;
    g.cancelScheduledValues(t);
    // cranking: rhythmic, rising
    g.setValueAtTime(0, t);
    for (let i = 0; i < 6; i++) {
      g.setTargetAtTime(0.32, t + i * 0.11, 0.012);
      g.setTargetAtTime(0.1, t + i * 0.11 + 0.06, 0.015);
    }
    const caught = t + 0.66;
    v.source.playbackRate.setValueAtTime(0.36, t);
    v.source.playbackRate.linearRampToValueAtTime(0.5, caught);
    // it fires: a quick rev, then it hands over to the idling engine
    v.source.playbackRate.linearRampToValueAtTime(1.15, caught + 0.18);
    v.source.playbackRate.linearRampToValueAtTime(0.75, caught + 0.7);
    g.setTargetAtTime(0.35, caught, 0.01);
    g.linearRampToValueAtTime(0.55, caught + 0.18);
    g.linearRampToValueAtTime(0, caught + 0.9);
    v.source.stop(caught + 1);
  }
}

export const raceAudio = new RaceAudio();
