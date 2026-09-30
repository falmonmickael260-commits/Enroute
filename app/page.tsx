"use client";

import { useRef, useState, useSyncExternalStore, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Logo } from "@/game/components/ui/Logo";
import { BrandLoader } from "@/game/components/animations/BrandLoader";
import { MenuBackdrop } from "@/game/components/menu/MenuBackdrop";
import { HomeTopBar } from "@/game/components/menu/HomeTopBar";
import { BookIcon, CardsIcon, CartIcon, ChartIcon, MedalIcon, PlayIcon, TrophyIcon, UsersIcon } from "@/game/components/menu/icons";
import { LOGO_ASPECT } from "@/game/lib/brand";
import { getIntroShown, getIntroShownServer, markIntroShown, subscribeIntroShown } from "@/game/lib/store/introStore";

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
  const introShown = useSyncExternalStore(subscribeIntroShown, getIntroShown, getIntroShownServer);
  const showIntro = !introShown;
  const [soon, setSoon] = useState<string | null>(null);
  const soonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSoon = (label: string) => {
    setSoon(label);
    if (soonTimer.current) clearTimeout(soonTimer.current);
    soonTimer.current = setTimeout(() => setSoon(null), 1800);
  };

  // everything comes in once the loading screen opens
  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: showIntro ? { opacity: 0, y: 18 } : { opacity: 1, y: 0 },
    transition: { delay, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const },
  });

  return (
    <main className="relative isolate min-h-dvh overflow-hidden text-white">
      <AnimatePresence>{showIntro ? <BrandLoader key="loader" onFinish={markIntroShown} /> : null}</AnimatePresence>
      <MenuBackdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[34rem] flex-col px-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <motion.div {...enter(0.05)} className="relative z-20">
          <HomeTopBar />
        </motion.div>

        <motion.div {...enter(0.12)} className="mt-1 flex justify-center">
          <div style={{ width: `min(94vw, 34rem, calc(34dvh * ${LOGO_ASPECT}))` }}>
            <Logo size="xl" priority className="!w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]" />
          </div>
        </motion.div>

        {/* the picture's car shows through here */}
        <div className="min-h-[4rem] flex-1" />

        <nav className="flex flex-col gap-3">
          <motion.div {...enter(0.2)}>
            <Link href="/play/create" className="menu-btn menu-btn-gold min-h-[5.5rem] !gap-0 !rounded-[20px] !px-0 !py-2">
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
                <Link href={t.href} className={clsx("menu-btn min-h-[4.4rem] !gap-2.5 !px-3", t.tone)}>
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                >
                  {soon} : bientôt disponible
                </motion.p>
              ) : null}
            </AnimatePresence>
            <div className="menu-dock">
              {DOCK.map((d) => (
                <button key={d.label} className="menu-dock-item" onClick={() => showSoon(d.label)} aria-label={`${d.label} (bientôt)`}>
                  <span className="menu-ring h-[3.3rem] w-[3.3rem]">
                    <d.icon className="h-7 w-7" />
                  </span>
                  <span className="font-menu text-[clamp(0.7rem,3.1vw,0.9rem)] font-bold uppercase tracking-[0.02em]">{d.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </nav>
      </div>
    </main>
  );
}
