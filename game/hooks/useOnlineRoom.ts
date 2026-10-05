"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AnimationEvent, GameState } from "@/game/types/game";
import { createGame, gameReducer, type GameAction } from "@/game/lib/engine/gameReducer";
import { supabase } from "@/game/lib/online/client";
import {
  commitState,
  leaveRoom,
  OnlineError,
  roomSync,
  setReady,
  setCar,
  startGame,
  type RoomSnapshot,
  type Seat,
} from "@/game/lib/online/api";
import { forgetSeat } from "@/game/lib/online/session";

const POLL_VISIBLE_MS = 1500;
const POLL_HIDDEN_MS = 5000;
/** Animations waiting to play are capped so a long absence doesn't replay a whole game. */
const MAX_QUEUED_EVENTS = 8;

export type RoomMeta = Omit<RoomSnapshot, "state" | "events">;

export type ConnectionState = "connecting" | "online" | "reconnecting";

/** What is stored server-side: the animation queue is per-device. */
function toStored(state: GameState): GameState {
  return { ...state, animationQueue: [] };
}

function sameGame(a: GameState, b: GameState): boolean {
  return JSON.stringify(toStored(a)) === JSON.stringify(toStored(b));
}

/**
 * Keeps this device in sync with an online room.
 *
 * The server stores the whole game state with a version number. Moves are
 * applied locally right away with the shared engine (so the table reacts
 * instantly), then committed with the version they were based on; if someone
 * else committed first the write is refused and the device resyncs. Every
 * client polls the room (which doubles as its presence heartbeat) and is also
 * nudged through a realtime broadcast when a move lands, when available.
 */
export function useOnlineRoom(code: string, seat: Seat | null) {
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [lost, setLost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gameRef = useRef<GameState | null>(null);
  const versionRef = useRef(-1);
  const pendingRef = useRef(0);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const syncRef = useRef<(force?: boolean) => Promise<void>>(async () => {});

  const replaceGame = useCallback((next: GameState | null) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const applySnapshot = useCallback(
    (snap: RoomSnapshot, playerId: string) => {
      const { state, events, ...rest } = snap;
      setMeta(rest);
      // Versions only grow: an older snapshot (a poll that raced our own commit) is ignored.
      if (!state || snap.version <= versionRef.current || pendingRef.current > 0) return;

      const prev = gameRef.current;
      const firstLoad = versionRef.current === -1 || !prev || prev.startedAt !== state.startedAt;
      versionRef.current = snap.version;

      let queue: AnimationEvent[] = [];
      if (!firstLoad && snap.lastActor !== playerId && events) {
        const known = new Set(prev.animationQueue.map((e) => e.id));
        queue = [...prev.animationQueue, ...events.filter((e) => !known.has(e.id))].slice(-MAX_QUEUED_EVENTS);
      } else if (!firstLoad) {
        queue = prev.animationQueue;
      }
      replaceGame({ ...state, animationQueue: queue });
    },
    [replaceGame],
  );

  const sync = useCallback(
    async (force = false) => {
      if (!seat) return;
      try {
        const snap = await roomSync(code, seat, force ? -1 : versionRef.current);
        if (force) versionRef.current = -1; // make sure the fresh state is applied
        applySnapshot(snap, seat.playerId);
        setConnection("online");
      } catch (e) {
        if (e instanceof OnlineError && e.kind === "denied") {
          setLost("Vous ne faites plus partie de cette partie, ou elle n'existe plus.");
          forgetSeat(code);
        } else {
          setConnection("reconnecting");
        }
      }
    },
    [code, seat, applySnapshot],
  );

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  // Poll loop + realtime nudges.
  useEffect(() => {
    if (!seat) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await syncRef.current();
      if (stopped) return;
      timer = setTimeout(tick, document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS);
    };
    tick();

    const wake = () => {
      if (!document.hidden) syncRef.current();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);

    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase()
        .channel(`enroute-${code}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "changed" }, () => syncRef.current())
        .subscribe();
      channelRef.current = channel;
    } catch {
      // realtime is only a speed-up: polling keeps the game going without it
    }

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      channelRef.current = null;
      if (channel) supabase().removeChannel(channel);
    };
  }, [code, seat]);

  const nudgeOthers = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    const send = channel.state === "joined" ? channel.send({ type: "broadcast", event: "changed", payload: {} }) : null;
    send?.catch(() => {});
  }, []);

  /** Queues a state write; writes go out one at a time, each on top of the previous version. */
  const enqueueCommit = useCallback(
    (state: GameState, events: AnimationEvent[]) => {
      if (!seat) return;
      pendingRef.current += 1;
      chainRef.current = chainRef.current.then(async () => {
        let outOfSync = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await commitState(code, seat, versionRef.current, toStored(state), events);
            if (res.ok) {
              versionRef.current = res.version;
              nudgeOthers();
            } else {
              outOfSync = true;
            }
            break;
          } catch (e) {
            if (e instanceof OnlineError && e.kind !== "network") {
              outOfSync = true;
              break;
            }
            if (attempt === 2) outOfSync = true;
            else await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          }
        }
        pendingRef.current -= 1;
        if (outOfSync && pendingRef.current === 0) {
          setError("Coup refusé : la partie a été resynchronisée.");
          await syncRef.current(true);
        }
      });
    },
    [code, seat, nudgeOthers],
  );

  const dispatch = useCallback(
    (action: GameAction) => {
      const base = gameRef.current;
      if (!base || !seat) return;
      if (action.type === "CLEAR_ANIMATION") {
        replaceGame(gameReducer(base, action));
        return;
      }
      const current = base.players[base.currentPlayerIndex];
      if (action.type !== "SKIP_TURN" && current.id !== seat.playerId) return;

      const next = gameReducer(base, action);
      if (sameGame(base, next)) return; // the engine refused the move
      const known = new Set(base.animationQueue.map((e) => e.id));
      const events = next.animationQueue.filter((e) => !known.has(e.id));
      replaceGame(next);
      enqueueCommit(next, events);
    },
    [seat, replaceGame, enqueueCommit],
  );

  const run = useCallback(
    async (task: () => Promise<unknown>) => {
      setError(null);
      try {
        await task();
        await syncRef.current();
        nudgeOthers();
      } catch (e) {
        setError(e instanceof OnlineError ? e.message : "Une erreur est survenue.");
      }
    },
    [nudgeOthers],
  );

  const toggleReady = useCallback(
    (ready: boolean) => (seat ? run(() => setReady(code, seat, ready)) : Promise.resolve()),
    [code, seat, run],
  );

  /** Host only: deals a fresh game from the current lobby (or rematch). */
  const deal = useCallback(() => {
    if (!seat || !meta) return Promise.resolve();
    const state = createGame({
      id: code,
      players: meta.players.map((p) => ({ id: p.id, name: p.name, color: p.color, car: p.car })),
      ambiance: meta.settings.ambiance,
      target: meta.settings.target,
    });
    return run(() => startGame(code, seat, toStored(state)));
  }, [code, seat, meta, run]);

  const leave = useCallback(async () => {
    if (!seat) return;
    try {
      await leaveRoom(code, seat);
    } catch {
      // leaving is best effort
    }
    if (meta?.status === "lobby") forgetSeat(code);
  }, [code, seat, meta]);

  const clearError = useCallback(() => setError(null), []);

  /** This pilot's car, chosen in the lobby. */
  const chooseCar = useCallback(
    (car: string) => (seat ? run(() => setCar(code, seat, car)) : Promise.resolve()),
    [code, seat, run],
  );

  return { meta, game, connection, lost, error, clearError, dispatch, toggleReady, chooseCar, deal, leave, nudgeOthers };
}
