"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PREMIUM_VEHICLES, VEHICLE_PRICE } from "@/game/lib/garage";
import { buyVehicle, loadGarage, useKilomaxWallet } from "@/game/lib/online/kilomaxShop";

export default function Boutique() {
  const wallet = useKilomaxWallet(state => state.wallet);
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { loadGarage().catch(issue => setError(issue.message)); }, []);

  async function buy(id: string) {
    setPending(id);
    setError("");
    try { await buyVehicle(id); setConfirm(null); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Achat indisponible."); }
    finally { setPending(null); }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-8 text-white sm:px-8">
      <Link href="/" className="text-sm font-bold text-amber-300">← Kilomax</Link>
      <div className="my-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-menu text-4xl font-black">Boutique</h1>
        {wallet && <p className="rounded-full border border-amber-300/40 px-4 py-2 text-amber-200">{wallet.balance.toLocaleString("fr-FR")} pièces d’or</p>}
      </div>
      {error && <p role="alert" className="mb-4 text-amber-200">{error}</p>}
      <section aria-label="Véhicules" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PREMIUM_VEHICLES.map(vehicle => {
          const owned = wallet?.owned.includes(vehicle.id);
          return (
            <article key={vehicle.id} className="overflow-hidden rounded-2xl border border-white/15 bg-zinc-900">
              <Image src={`/images/cars/${vehicle.id}.webp`} alt={vehicle.name} width={640} height={360}
                className="aspect-video w-full bg-zinc-950 object-contain" />
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-300">{vehicle.category}</p>
                <h2 className="mt-1 text-2xl font-black">{vehicle.name}</h2>
                <p className="mt-2 min-h-10 text-sm text-zinc-300">{vehicle.description}</p>
                {owned ? <Link href="/play/create" className="mt-4 inline-block font-bold text-amber-200">Acheté · Choisir dans le garage</Link>
                  : confirm === vehicle.id ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" disabled={pending !== null} onClick={() => void buy(vehicle.id)} className="btn-enroute-primary">
                        Confirmer · {VEHICLE_PRICE} pièces
                      </button>
                      <button type="button" disabled={pending !== null} onClick={() => setConfirm(null)} className="btn-enroute-secondary">Annuler</button>
                    </div>
                  ) : <button type="button" disabled={!wallet || wallet.balance < VEHICLE_PRICE || pending !== null}
                    className="btn-enroute-primary mt-4 disabled:opacity-50" onClick={() => setConfirm(vehicle.id)}>
                    Acheter · {VEHICLE_PRICE} pièces
                  </button>}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
