"use client";

/**
 * Who this device is online: a random player id and the pilot name, plus the
 * secret handed out by the server for each room joined. Kept in localStorage
 * so a reload or a lost connection puts the player straight back in their seat.
 */

const STORAGE_KEY = "enroute:online:v1";

export interface RoomSeat {
  secret: string;
  joinedAt: number;
}

export interface OnlineSession {
  playerId: string;
  name: string;
  rooms: Record<string, RoomSeat>;
}

let cache: OnlineSession | null = null;
const listeners = new Set<() => void>();

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join("-");
}

function load(): OnlineSession {
  if (cache) return cache;
  let stored: Partial<OnlineSession> = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<OnlineSession>;
  } catch {
    // corrupted or unavailable storage: start fresh
  }
  cache = {
    playerId: typeof stored.playerId === "string" && stored.playerId.length >= 8 ? stored.playerId : randomId(),
    name: typeof stored.name === "string" ? stored.name : "",
    rooms: stored.rooms && typeof stored.rooms === "object" ? stored.rooms : {},
  };
  // Persist a freshly minted id right away, but silently: load() runs while
  // React reads the snapshot, where notifying subscribers is not allowed.
  persist(cache);
  return cache;
}

function persist(session: OnlineSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // private browsing: the session only lives as long as the tab
  }
}

function save(next: OnlineSession) {
  cache = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

export function getOnlineSession(): OnlineSession {
  return load();
}

export function getOnlineSessionServer(): OnlineSession | null {
  return null;
}

export function subscribeOnlineSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function rememberName(name: string) {
  const session = load();
  if (session.name !== name) save({ ...session, name });
}

export function rememberSeat(code: string, secret: string) {
  const session = load();
  // Keep the list short: only the most recent rooms matter.
  const rooms = Object.entries({ ...session.rooms, [code]: { secret, joinedAt: Date.now() } })
    .sort((a, b) => b[1].joinedAt - a[1].joinedAt)
    .slice(0, 12);
  save({ ...session, rooms: Object.fromEntries(rooms) });
}

export function forgetSeat(code: string) {
  const session = load();
  if (!session.rooms[code]) return;
  const rooms = { ...session.rooms };
  delete rooms[code];
  save({ ...session, rooms });
}
