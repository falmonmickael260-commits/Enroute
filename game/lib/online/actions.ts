"use client";

import { createRoom, joinRoom, type RoomSettings } from "./api";
import { getOnlineSession, rememberName, rememberSeat } from "./session";

/** Creates a room hosted by this device and returns its code. */
export async function createOnlineRoom(name: string, settings: RoomSettings): Promise<string> {
  const { playerId } = getOnlineSession();
  const { code, secret } = await createRoom(playerId, name, settings);
  rememberName(name);
  rememberSeat(code, secret);
  return code;
}

/** Takes a seat in an existing room (no-op if this device already has one). */
export async function joinOnlineRoom(code: string, name: string): Promise<string> {
  const session = getOnlineSession();
  if (session.rooms[code]) return code;
  const joined = await joinRoom(code, session.playerId, name);
  rememberName(name);
  rememberSeat(joined.code, joined.secret);
  return joined.code;
}
