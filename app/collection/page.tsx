import { Card } from "@/game/components/cards/Card";
import { CARD_CATALOG } from "@/game/lib/engine/cardCatalog";
import type { CardCategory } from "@/game/types/game";
import { InnerPage } from "@/game/components/ui/InnerPage";

const SECTIONS: { category: CardCategory; title: string; blurb: string }[] = [
  { category: "distance", title: "Cartes de distance", blurb: "Faites avancer votre véhicule sur la route." },
  { category: "attaque", title: "Cartes d'attaque", blurb: "Ralentissez vos adversaires." },
  { category: "defense", title: "Cartes de défense", blurb: "Réparez ou blindez votre véhicule." },
  { category: "special", title: "Cartes spéciales KILOMAX", blurb: "L'identité unique du jeu." },
];

export default function CollectionPage() {
  const byCategory = Object.values(CARD_CATALOG).reduce<Record<CardCategory, (typeof CARD_CATALOG)[string][]>>(
    (acc, def) => {
      acc[def.category].push(def);
      return acc;
    },
    { distance: [], attaque: [], defense: [], special: [] },
  );

  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Collection" wide>
      <p className="-mt-3 text-center text-white/60">Toutes les cartes du jeu KILOMAX.</p>
      {SECTIONS.map((section) => (
        <section key={section.category}>
          <h2 className="text-brass font-display text-3xl tracking-wide">{section.title}</h2>
          <p className="mb-4 text-sm text-white/55">{section.blurb}</p>
          <div className="flex flex-wrap gap-4">
            {byCategory[section.category].map((def) => (
              <div key={def.id} className="flex flex-col items-center gap-1.5">
                <Card defId={def.id} size="lg" />
                <span className="font-hud text-xs font-semibold text-[var(--color-brass-300)]/80">× {def.count}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </InnerPage>
  );
}
