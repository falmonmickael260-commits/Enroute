"use client";

import { create } from "zustand";
import { getIncomingPlatformToken } from "./platformToken";
import { CHEST_PRICE, VEHICLE_PRICE, type ChestReceipt, type ChestReward } from "@/game/lib/garage";

const origin = process.env.NEXT_PUBLIC_REVANCHE_ORIGIN || "https://revanchegames-production.up.railway.app";
type Wallet = { balance: number; owned: string[]; receipt: ChestReceipt | null; permit?: { expires: number; signature: string } };
type Race = { match: string; player: string };

async function shop(body: object): Promise<Wallet> {
  const token = getIncomingPlatformToken();
  if (!token) throw new Error("Ouvre Kilomax depuis ton compte Revanche Games.");
  let response: Response;
  try {
    response = await fetch(new URL("/api/game/kilomax/shop", origin), {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("Portefeuille temporairement indisponible.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error ?? "Portefeuille indisponible.");
  return result;
}

export const useKilomaxWallet = create<{ wallet: Wallet | null; setWallet: (value: Wallet) => void }>(set => ({
  wallet: null,
  setWallet: wallet => set({ wallet }),
}));

let loading: Promise<Wallet> | undefined;

export function loadGarage(): Promise<Wallet> {
  loading ??= updateWallet(shop({ action: "catalog" })).finally(() => { loading = undefined; });
  return loading;
}

async function updateWallet(request: Promise<Wallet>) {
  const wallet = await request;
  useKilomaxWallet.getState().setWallet(wallet);
  return wallet;
}

export function buyVehicle(item: string) {
  return updateWallet(shop({ action: "vehicle", item, price: VEHICLE_PRICE }));
}

export function lookupChest(race: Race) {
  return updateWallet(shop({ action: "catalog", ...race }));
}

export function buyChest(race: Race, item: ChestReward) {
  return updateWallet(shop({ action: "chest", item, price: CHEST_PRICE, ...race }));
}


export async function authorizeVehicle(code: string, seat: { playerId: string; secret: string }, item: string) {
  const result = await shop({ action: "permit", item, match: code, player: seat.playerId, secret: seat.secret });
  if (!result.permit) throw new Error("Véhicule premium indisponible.");
  return result.permit;
}
