"use client";

import type { AmbianceId, AnimationEvent, GameState, PlayerColor } from "@/game/types/game";
import { supabase } from "./client";

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  /** Chosen car (game/lib/cars.ts); absent until the pilot picks one. */
  car?: string;
  ready: boolean;
}

export interface RoomSettings {
  ambiance: AmbianceId;
  target: number;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  hostId: string;
  settings: RoomSettings;
  players: RoomPlayer[];
  online: string[];
  version: number;
  lastActor: string | null;
  /** Only sent when the version differs from the one the client already has. */
  state: GameState | null;
  events: AnimationEvent[] | null;
}

export interface RoomPreview {
  code: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: { name: string; color: PlayerColor }[];
}

export interface Seat {
  playerId: string;
  secret: string;
}

export class OnlineError extends Error {
  constructor(
    message: string,
    /** "denied": this device is not (or no longer) a member of the room. */
    readonly kind: "denied" | "rejected" | "network",
  ) {
    super(message);
  }
}

export const CODE_PATTERN = /^ENR-[A-Z0-9]{4}$/;

export function normalizeCode(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const suffix = compact.startsWith("ENR") ? compact.slice(3) : compact;
  return `ENR-${suffix.slice(0, 4)}`;
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  let result;
  try {
    result = await supabase().rpc(fn, args);
  } catch {
    throw new OnlineError("Connexion impossible. Vérifiez votre réseau.", "network");
  }
  const { data, error } = result;
  if (error) {
    if (error.code === "42501") throw new OnlineError(error.message, "denied");
    // Our functions raise user-facing French messages; anything else is plumbing.
    const known = ["22023", "P0002", "55000", "23505", "54000"].includes(error.code ?? "");
    if (known) throw new OnlineError(error.message, "rejected");
    throw new OnlineError("Connexion impossible. Vérifiez votre réseau.", "network");
  }
  return data as T;
}

export function createRoom(playerId: string, name: string, settings: RoomSettings) {
  return call<{ code: string; secret: string }>("create_room", {
    p_player_id: playerId,
    p_name: name,
    p_ambiance: settings.ambiance,
    p_target: settings.target,
  });
}

export function joinRoom(code: string, playerId: string, name: string) {
  return call<{ code: string; secret: string }>("join_room", { p_code: code, p_player_id: playerId, p_name: name });
}

export function roomInfo(code: string) {
  return call<RoomPreview | null>("room_info", { p_code: code });
}

export function setReady(code: string, seat: Seat, ready: boolean) {
  return call<void>("set_ready", { p_code: code, p_player_id: seat.playerId, p_secret: seat.secret, p_ready: ready });
}

export function setCar(code: string, seat: Seat, car: string) {
  return call<void>("set_car", { p_code: code, p_player_id: seat.playerId, p_secret: seat.secret, p_car: car });
}

export function leaveRoom(code: string, seat: Seat) {
  return call<void>("leave_room", { p_code: code, p_player_id: seat.playerId, p_secret: seat.secret });
}

export function startGame(code: string, seat: Seat, state: GameState) {
  return call<number>("start_game", { p_code: code, p_player_id: seat.playerId, p_secret: seat.secret, p_state: state });
}

export function commitState(code: string, seat: Seat, expectedVersion: number, state: GameState, events: AnimationEvent[]) {
  return call<{ ok: boolean; version: number }>("commit_state", {
    p_code: code,
    p_player_id: seat.playerId,
    p_secret: seat.secret,
    p_expected_version: expectedVersion,
    p_state: state,
    p_events: events,
  });
}

export function roomSync(code: string, seat: Seat, knownVersion: number) {
  return call<RoomSnapshot>("room_sync", {
    p_code: code,
    p_player_id: seat.playerId,
    p_secret: seat.secret,
    p_known_version: knownVersion,
  });
}
