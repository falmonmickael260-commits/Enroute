"use client";

import { useRef, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Logo } from "@/game/components/ui/Logo";
import { useBootDone } from "@/game/components/animations/BootLoader";
import { MenuBackdrop } from "@/game/components/menu/MenuBackdrop";
import { HomeTopBar } from "@/game/components/menu/HomeTopBar";
import { LEGAL, LEGAL_READY } from "@/game/lib/brand/legal";
import { BookIcon, CardsIcon, CartIcon, ChartIcon, MedalIcon, PlayIcon, TrophyIcon, UsersIcon } from "@/game/components/menu/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const TILES: { href: string; title: string; sub: string; icon: Icon; tone: string }[] = [
  { href: "/play/create", title: "Créer", sub: "Une partie", icon: UsersIcon, tone: "menu-btn-blue" },
  { href: "/play/join", title: "Rejoindre", sub: "Une partie", icon: UsersIcon, tone: "menu-btn-red" },
  { href: "/rules", title: "Règles", sub: "Apprendre à jouer", icon: BookIcon, tone: "menu-btn-dark" },
  { href: "/collection", title: "Collection", sub: "Tes cartes", icon: CardsIcon, tone: "menu-btn-purple" },
];

/** Not built yet: shown so the layout is complete, and says so when tapped. */
const DOCK: { label: string; icon: Icon }[] = [
  { label: "Classement", icon: TrophyIcon },
  { label: "Statistiques", icon: ChartIcon },
  { label: "Boutique", icon: CartIcon },
  { label: "Succès", icon: MedalIcon },
];

export default function Home() {
  const booted = useBootDone();
  const [soon, setSoon] = useState<string | null>(null);
  const soonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSoon = (label: string) => {
    setSoon(label);
    if (soonTimer.current) clearTimeout(soonTimer.current);
    soonTimer.current = setTimeout(() => setSoon(null), 1800);
  };

  // everything fades in (no sliding) once the loading screen opens
  const enter = (delay: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: booted ? 1 : 0 },
    transition: { delay: booted ? delay : 0, duration: 0.5, ease: "easeOut" as const },
  });

  return (
    // the home screen always fits the screen exactly: nothing scrolls or slides
    <main className="fixed inset-0 isolate overflow-hidden text-white">
      <MenuBackdrop />

      <div className="home-layout relative z-10 mx-auto h-full w-full px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.6rem,env(safe-area-inset-top))]">
        <motion.div {...enter(0.05)} className="home-top relative z-20">
          <HomeTopBar />
        </motion.div>

        {/* the logo takes what room is left, never more than a third of the screen */}
        <motion.div {...enter(0.12)} className="home-logo">
          <Logo size="xl" priority className="home-logo-mark drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]" />
        </motion.div>

        <nav className="home-nav flex flex-col gap-3">
          <motion.div {...enter(0.2)}>
            <Link href="/play/create" className="menu-btn menu-btn-gold home-play !gap-0 !rounded-[20px] !px-0 !py-2">
              <span className="flex h-full w-[5.2rem] shrink-0 items-center justify-center border-r border-black/15">
                <PlayIcon className="h-11 w-11 text-[#1a1305] drop-shadow-[0_2px_0_rgba(255,255,255,0.4)]" />
              </span>
              <span className="flex flex-1 flex-col items-center pr-[5.2rem] text-center max-[380px]:pr-4">
                <span className="menu-btn-title text-[2.8rem] font-black italic">Jouer</span>
                <span className="menu-btn-sub text-[0.95rem] font-bold">À toi de prendre la route</span>
              </span>
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {TILES.map((t, i) => (
              <motion.div key={t.href} {...enter(0.26 + i * 0.05)}>
                <Link href={t.href} className={clsx("menu-btn home-tile !gap-2.5 !px-3", t.tone)}>
                  <t.icon className="h-9 w-9 shrink-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]" />
                  <span className="flex min-w-0 flex-col">
                    <span className="menu-btn-title text-[clamp(1.2rem,5.4vw,1.75rem)]">{t.title}</span>
                    <span className="menu-btn-sub truncate text-[clamp(0.68rem,2.9vw,0.9rem)]">{t.sub}</span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div {...enter(0.5)} className="relative mt-1">
            <AnimatePresence>
              {soon ? (
                <motion.p
                  key={soon}
                  className="absolute inset-x-0 -top-10 mx-auto w-max rounded-full border border-[#e9b84a]/60 bg-black/80 px-4 py-1.5 font-menu text-sm font-bold uppercase tracking-wide text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {soon} : bientôt disponible
                </motion.p>
              ) : null}
            </AnimatePresence>
            <div className="menu-dock">
              {DOCK.map((d) => (
                <button key={d.label} className="menu-dock-item" onClick={() => showSoon(d.label)} aria-label={`${d.label} (bientôt)`}>
                  <span className="menu-ring home-dock-ring">
                    <d.icon className="h-7 w-7" />
                  </span>
                  <span className="font-menu text-[clamp(0.7rem,3.1vw,0.9rem)] font-bold uppercase tracking-[0.02em]">{d.label}</span>
                </button>
              ))}
            </div>
            <p className="home-legal mt-1.5 text-center font-hud text-[0.68rem] font-semibold text-white/60 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
              © {LEGAL.year} KILOMAX · Tous droits réservés
              {LEGAL_READY ? (
                <>
                  {" · "}
                  <Link href="/mentions-legales" className="underline underline-offset-2 hover:text-white">
                    Mentions légales
                  </Link>
                </>
              ) : null}
            </p>
          </motion.div>
        </nav>
      </div>
    </main>
  );
}
