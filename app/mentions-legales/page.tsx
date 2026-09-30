import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InnerPage } from "@/game/components/ui/InnerPage";
import { notFound } from "next/navigation";
import { LEGAL, LEGAL_READY } from "@/game/lib/brand/legal";

export const metadata: Metadata = {
  title: "Mentions légales — KILOMAX",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="menu-label !mb-1">{title}</h2>
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-white/85">{children}</div>
    </section>
  );
}

export default function LegalNoticePage() {
  if (!LEGAL_READY) notFound();
  const mail = (
    <a href={`mailto:${LEGAL.email}`} className="text-[#f4c64f] underline underline-offset-2">
      {LEGAL.email}
    </a>
  );
  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Mentions légales">
      <Section title="Éditeur du site">
        <p>
          Le site www.kilomax.fr et le jeu KILOMAX sont édités par <strong>{LEGAL.editor}</strong>.
        </p>
        <p>Contact : {mail}</p>
        <p>Directeur de la publication : {LEGAL.editor}.</p>
      </Section>

      <Section title="Hébergement">
        <p>
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis —{" "}
          <a href="https://vercel.com" className="text-[#f4c64f] underline underline-offset-2" rel="noopener noreferrer" target="_blank">
            vercel.com
          </a>
          .
        </p>
        <p>Les parties en ligne passent par le service Supabase (Supabase Inc.).</p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          Le nom KILOMAX, son logo, les illustrations, les cartes, les décors, les textes et le code du jeu sont protégés par le droit
          d&apos;auteur et le droit des marques. Toute reproduction, représentation, adaptation ou diffusion, totale ou partielle, sans
          autorisation écrite préalable de l&apos;éditeur est interdite et constitue une contrefaçon (articles L.335-2 et suivants du Code de
          la propriété intellectuelle).
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          Pour jouer en ligne, le jeu enregistre le nom de pilote que vous choisissez, le code du salon et l&apos;état de la partie. Ces
          informations servent uniquement à faire fonctionner les parties : elles ne sont ni vendues, ni utilisées à des fins publicitaires.
        </p>
        <p>Vous pouvez demander l&apos;accès à vos données ou leur suppression en écrivant à {mail}.</p>
      </Section>

      <Section title="Cookies">
        <p>
          Le site n&apos;utilise ni cookie publicitaire ni outil de suivi. Il garde seulement, dans votre navigateur, vos préférences (son,
          type de plateau) et de quoi vous remettre à votre place si vous êtes déconnecté pendant une partie.
        </p>
      </Section>
    </InnerPage>
  );
}
