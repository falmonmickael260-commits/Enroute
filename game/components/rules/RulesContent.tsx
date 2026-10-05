import { Card } from "@/game/components/cards/Card";
import { CARD_CATALOG } from "@/game/lib/engine/cardCatalog";
import { STUCK_TURNS_LIMIT } from "@/game/lib/engine/deck";

const HAZARD_PAIRS: [string, string][] = [
  ["collision", "reparation"],
  ["crevaison", "roueSecours"],
  ["panne", "pleinEssence"],
  ["radar", "gps"],
  ["barrage", "passageLibre"],
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-brass mb-3 font-display text-3xl tracking-wide">{children}</h2>;
}

/** The rules of KILOMAX: on their own page and in the in-game rules sheet. */
export function RulesContent() {
  return (
    <>
      <section>
        <H2>Le principe</H2>
        <p className="leading-relaxed text-white/80">
          KILOMAX se joue de 2 à 6 joueurs. Chacun pilote son véhicule sur une route qui traverse la campagne, la ville, la
          montagne et la côte. Le premier à parcourir la distance choisie (700, 1000 ou 1500 km) franchit la ligne
          d&apos;arrivée et remporte la partie.
        </p>
      </section>

      <section>
        <H2>Déroulement d&apos;un tour</H2>
        <ol className="list-inside list-decimal space-y-2 text-white/80">
          <li>Piochez une carte (la pioche se reconstitue automatiquement avec la défausse).</li>
          <li>Jouez une carte de votre main, ou défaussez-en une si rien n&apos;est jouable.</li>
          <li>Le tour passe au joueur suivant — sauf tour bonus (voir Défense).</li>
        </ol>
      </section>

      <section>
        <H2>Cartes de distance</H2>
        <p className="mb-4 text-white/80">Jouables si la route est libre. Sous RADAR, seules les cartes de 50 km ou moins passent.</p>
        <div className="flex flex-wrap gap-3">
          {["dist25", "dist50", "dist75", "dist100", "dist200"].map((id) => (
            <Card key={id} defId={id} size="md" />
          ))}
        </div>
      </section>

      <section>
        <H2>Attaque &amp; défense</H2>
        <p className="mb-4 text-white/80">
          Une attaque arrête un adversaire (ou le limite à 50 km pour le RADAR) jusqu&apos;à ce qu&apos;il joue la défense
          correspondante. Arrêté, on ne peut que réparer ou défausser. Une défense jouée <em>avant</em> d&apos;être attaqué
          devient un bouclier permanent contre ce danger — et offre un tour bonus. Chaque pilote peut avoir au maximum 2 boucliers
          à la fois : les autres cartes de défense servent alors uniquement à réparer.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {HAZARD_PAIRS.map(([hazardId, defenseId]) => (
            <div key={hazardId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
              <Card defId={hazardId} size="sm" />
              <span className="font-display text-2xl text-[var(--color-brass-300)]">→</span>
              <Card defId={defenseId} size="sm" />
              <p className="ml-1 text-sm text-white/65">
                {CARD_CATALOG[hazardId].title} est neutralisé par {CARD_CATALOG[defenseId].title}.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <H2>Anti-blocage</H2>
        <p className="leading-relaxed text-white/80">
          Personne ne reste coincé au bord de la route&nbsp;: si vous êtes arrêté (collision, crevaison, panne ou barrage — le
          radar ne compte pas) pendant plus de {STUCK_TURNS_LIMIT} pioches d&apos;affilée, vous piochez directement la carte de
          réparation qu&apos;il vous faut, prise dans la pioche ou, à défaut, dans la défausse. Le compteur repart de zéro à
          chaque nouvel arrêt.
        </p>
      </section>

      <section>
        <H2>Cartes spéciales KILOMAX</H2>
        <div className="grid gap-3 sm:grid-cols-2">
          {["turbo", "raccourci", "depassement", "gpsStrategique", "derniereLigneDroite"].map((id) => (
            <div key={id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
              <Card defId={id} size="sm" />
              <div>
                <p className="font-display text-lg tracking-wide">{CARD_CATALOG[id].title}</p>
                <p className="text-sm text-white/65">{CARD_CATALOG[id].subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <H2>Victoire</H2>
        <p className="text-white/80">Le premier à atteindre la distance cible franchit la ligne d&apos;arrivée et gagne immédiatement.</p>
      </section>

    </>
  );
}
