import Link from "next/link";
import { Logo } from "@/game/components/ui/Logo";
import { Card } from "@/game/components/cards/Card";
import { CARD_CATALOG } from "@/game/lib/engine/cardCatalog";
import type { CardCategory } from "@/game/types/game";

const SECTIONS: { category: CardCategory; title: string; blurb: string }[] = [
  { category: "distance", title: "Cartes de distance", blurb: "Faites avancer votre véhicule sur la route." },
  { category: "attaque", title: "Cartes d'attaque", blurb: "Ralentissez vos adversaires." },
  { category: "defense", title: "Cartes de défense", blurb: "Réparez ou blindez votre véhicule." },
  { category: "special", title: "Cartes spéciales EN ROUTE", blurb: "L'identité unique du jeu." },
];

export default function CollectionPage() {
  const byCategory = Object.values(CARD_CATALOG).reduce<Record<CardCategory, typeof CARD_CATALOG[string][]>>(
    (acc, def) => {
      acc[def.category] = acc[def.category] ? [...acc[def.category], def] : [def];
      return acc;
    },
    { distance: [], attaque: [], defense: [], special: [] },
  );

  return (
    <main className="min-h-screen bg-[var(--color-asphalt-900)] px-4 sm:px-8 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <header className="flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="btn-enroute-ghost !text-sm !py-2 !px-4">
            Retour
          </Link>
        </header>

        <div className="text-center">
          <h1 className="font-display text-4xl text-[var(--color-paper)]">Collection</h1>
          <p className="text-white/60 mt-2">Toutes les cartes du jeu EN ROUTE.</p>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.category}>
            <h2 className="font-display text-2xl text-[var(--color-brand-gold)] mb-1">{section.title}</h2>
            <p className="text-white/60 mb-4 text-sm">{section.blurb}</p>
            <div className="flex flex-wrap gap-4">
              {byCategory[section.category].map((def) => (
                <div key={def.id} className="flex flex-col items-center gap-1">
                  <Card defId={def.id} size="md" />
                  <span className="text-[0.65rem] font-hud text-white/40">× {def.count}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
