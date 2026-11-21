"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GameState } from "@/game/types/game";
import { CHEST_PRICE, raceWalletKey, type ChestReceipt, type ChestReward } from "@/game/lib/garage";
import { buyChest, lookupChest } from "@/game/lib/online/kilomaxShop";

export function RaceChest({ state, viewerId, apply }: {
  state: GameState;
  viewerId?: string;
  apply: (receipt: ChestReceipt) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<ChestReceipt | null>(null);
  const [error, setError] = useState("");
  const operation = useRef(false);
  const player = state.players[state.currentPlayerIndex];
  const race = { match: raceWalletKey(state), player: player.id };
  const ready = state.phase === "action" && (!viewerId || viewerId === player.id) && !player.isBot;
  const repaired = Boolean(player.hazard || player.limited);
  const used = state.usedChestReceipts?.some(entry => entry.player === player.id) ?? false;
  const recoverable = receipt?.match === race.match && receipt?.player === player.id ? receipt : null;

  async function request(reward?: ChestReward) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      const wallet = reward ? await buyChest(race, reward) : await lookupChest(race);
      setBalance(wallet.balance);
      setReceipt(wallet.receipt);
      if (reward && wallet.receipt) apply(wallet.receipt);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Coffre indisponible.");
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-enroute-secondary !px-2 !py-1.5 !text-xs" onClick={() => {
        setOpen(true);
        void request();
      }} aria-expanded={open}>
        Coffre
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onClick={() => { if (!operation.current) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Coffre de secours" onClick={event => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-violet-400/65 bg-zinc-950 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-menu text-2xl font-black text-violet-200">Coffre de secours</h2>
              <button type="button" aria-label="Fermer" disabled={busy} onClick={() => { if (!operation.current) setOpen(false); }} className="rounded-lg px-2 py-1 text-xl">×</button>
            </div>
            {balance !== null && <p className="mt-2 text-sm text-amber-200">{balance.toLocaleString("fr-FR")} pièces d’or</p>}
            <p className="my-3 text-sm text-zinc-300">Une ouverture par pilote et par course.</p>
            {!ready && <p className="mb-2 text-sm text-zinc-300">Disponible pendant ton tour, après avoir pioché.</p>}
            {error && <p role="alert" className="mb-2 text-sm text-amber-200">{error}</p>}
            {used ? <p className="text-violet-200">Coffre utilisé pour cette course.</p>
              : recoverable ? (
                <button type="button" className="btn-enroute-primary disabled:opacity-45" disabled={busy || !ready || (recoverable.reward === "repair" && !repaired)}
                  onClick={() => apply(recoverable)}>Récupérer mon achat</button>
              ) : (
                <div className="grid gap-2">
                  <button type="button" disabled={busy || !ready || balance === null || balance < CHEST_PRICE}
                    className="rounded-lg bg-violet-700 px-3 py-2 font-bold disabled:opacity-45" onClick={() => void request("purple")}>
                    GPS stratégique · {CHEST_PRICE} pièces
                  </button>
                  <button type="button" disabled={busy || !ready || !repaired || balance === null || balance < CHEST_PRICE}
                    className="rounded-lg border border-violet-300/60 px-3 py-2 font-bold disabled:opacity-45" onClick={() => void request("repair")}>
                    Retirer le malus · {CHEST_PRICE} pièces
                  </button>
                </div>
              )}
          </section>
        </div>, document.body
      )}
    </>
  );
}
