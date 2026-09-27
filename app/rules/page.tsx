import Link from "next/link";
import { Logo } from "@/game/components/ui/Logo";
import { Card } from "@/game/components/cards/Card";
import { CARD_CATALOG } from "@/game/lib/engine/cardCatalog";

const HAZARD_PAIRS: [string, string][] = [
  ["collision", "reparation"],
  ["crevaison", "roueSecours"],
  ["panne", "pleinEssence"],
  ["radar", "gps"],
  ["barrage", "passageLibre"],
];

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-[var(--color-asphalt-900)] px-4 sm:px-8 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-10">
        <header className="flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="btn-enroute-ghost !text-sm !py-2 !px-4">
            Retour
          </Link>
        </header>

        <section>
          <h2 className="font-display text-3xl text-[var(--color-brand-gold)] mb-3">Le principe</h2>
          <p className="text-white/80 leading-relaxed">
            EN ROUTE se joue de 2 à 4 joueurs. Chacun pilote son véhicule sur la route et tente
            d&apos;atteindre le premier <strong className="text-white">1000 km</strong>. À tour de rôle,
            un joueur pioche une carte puis doit en jouer une (ou la défausser) : avancer sur la
            route, envoyer un obstacle à un adversaire, réparer son propre véhicule ou déclencher
            une action spéciale. Le premier à parcourir la distance totale remporte la partie.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl text-[var(--color-brand-gold)] mb-3">Déroulement d&apos;un tour</h2>
          <ol className="list-decimal list-inside space-y-2 text-white/80">
            <li>Piochez une carte (la pioche se reconstitue automatiquement avec la défausse si besoin).</li>
            <li>Jouez une carte de votre main, ou défaussez-en une si aucune n&apos;est jouable.</li>
            <li>Le tour passe au joueur suivant — sauf bonus de tour supplémentaire (voir Défense).</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-3xl text-[var(--color-brand-gold)] mb-3">Cartes de distance</h2>
          <p className="text-white/80 mb-4">
            Jouables si la route est libre. Sous RADAR, seules les cartes de 50 km ou moins sont
            autorisées.
          </p>
          <div className="flex gap-3 flex-wrap">
            {["dist25", "dist50", "dist75", "dist100", "dist200"].map((id) => (
              <Card key={id} defId={id} size="sm" />
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl text-[var(--color-brand-gold)] mb-3">Attaque &amp; Défense</h2>
          <p className="text-white/80 mb-4">
            Une carte d&apos;attaque bloque un adversaire jusqu&apos;à ce qu&apos;il joue la carte de
            défense correspondante. Une défense jouée <em>avant</em> d&apos;être attaqué agit comme un
            bouclier permanent contre ce danger — et offre un tour bonus immédiat.
          </p>
          <div className="flex flex-col gap-3">
            {HAZARD_PAIRS.map(([hazardId, defenseId]) => (
              <div key={hazardId} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                <Card defId={hazardId} size="xs" />
                <span className="text-white/40 font-display text-lg">→</span>
                <Card defId={defenseId} size="xs" />
                <p className="text-sm text-white/60 ml-2">
                  {CARD_CATALOG[hazardId].title} est neutralisée par {CARD_CATALOG[defenseId].title}.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl text-[var(--color-brand-gold)] mb-3">Cartes spéciales EN ROUTE</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {["turbo", "raccourci", "depassement", "gpsStrategique", "derniereLigneDroite"].map((id) => (
              <div key={id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                <Card defId={id} size="xs" />
                <p className="text-sm text-white/70">{CARD_CATALOG[id].subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl text-[var(--color-brand-gold)] mb-3">Victoire</h2>
          <p className="text-white/80">
            Le premier joueur à atteindre 1000 km franchit la ligne d&apos;arrivée et remporte
            immédiatement la partie.
          </p>
        </section>

        <Link href="/play/create" className="btn-enroute-primary self-center">
          À toi de prendre la route
        </Link>
      </div>
    </main>
  );
}
