"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/game/components/ui/Logo";
import { HomeBackdrop } from "@/game/components/home/HomeBackdrop";
import { BrandLoader } from "@/game/components/animations/BrandLoader";
import { getIntroShown, getIntroShownServer, markIntroShown, subscribeIntroShown } from "@/game/lib/store/introStore";

export default function Home() {
  const introShown = useSyncExternalStore(subscribeIntroShown, getIntroShown, getIntroShownServer);
  const showIntro = !introShown;

  const finishIntro = () => markIntroShown();

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      <AnimatePresence>{showIntro ? <BrandLoader key="loader" onFinish={finishIntro} /> : null}</AnimatePresence>
      <HomeBackdrop />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={showIntro ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <Logo size="xl" priority className="drop-shadow-2xl" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={showIntro ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="flex flex-col items-center gap-4 w-full max-w-xs"
        >
          <Link href="/play/create" className="btn-enroute-primary w-full text-center">
            JOUER
          </Link>

          <div className="flex gap-3 w-full">
            <Link href="/play/create" className="btn-enroute-secondary flex-1 !text-base text-center">
              CRÉER
            </Link>
            <Link href="/play/join" className="btn-enroute-secondary flex-1 !text-base text-center">
              REJOINDRE
            </Link>
          </div>

          <div className="flex gap-3 w-full">
            <Link href="/rules" className="btn-enroute-ghost flex-1 !text-sm text-center">
              RÈGLES
            </Link>
            <Link href="/collection" className="btn-enroute-ghost flex-1 !text-sm text-center">
              COLLECTION
            </Link>
          </div>
        </motion.div>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 text-center pb-6 text-xs text-white/40 font-hud tracking-widest"
      >
        KILOMAX — jeu de plateau numérique · 2 à 4 joueurs
      </motion.footer>
    </main>
  );
}
