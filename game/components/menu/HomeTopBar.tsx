"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { getOnlineSession, getOnlineSessionServer, subscribeOnlineSession } from "@/game/lib/online/session";
import { setBoardView, useBoardView } from "@/game/lib/store/boardViewStore";
import { useSound } from "@/game/hooks/useSound";
import { GearIcon, UserIcon } from "./icons";

/** Top of the home screen: who is playing, and the settings. */
export function HomeTopBar() {
  const session = useSyncExternalStore(subscribeOnlineSession, getOnlineSession, getOnlineSessionServer);
  const name = session?.name.trim() || "Joueur 1";
  const [open, setOpen] = useState(false);
  const { enabled: soundOn, toggle: toggleSound } = useSound();
  const boardView = useBoardView();

  return (
    <div className="relative flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="menu-ring h-[3.2rem] w-[3.2rem] shrink-0 text-white/90">
          <UserIcon className="h-7 w-7" />
        </span>
        <span className="min-w-0 rounded-full bg-gradient-to-r from-black/55 via-black/30 to-transparent py-1 pl-2.5 pr-8">
          <span className="block truncate font-menu text-[1.35rem] font-bold leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">{name}</span>
          <span className="block font-menu text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#f4c64f]">Pilote</span>
        </span>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Réglages"
        aria-expanded={open}
        className="menu-ring h-[3.2rem] w-[3.2rem] shrink-0 !border-white/35 text-white transition-transform active:scale-95"
      >
        <GearIcon className="h-7 w-7" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button aria-label="Fermer les réglages" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
            <motion.div
              className="menu-panel absolute right-0 top-[3.8rem] z-40 w-64 p-4"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
            >
              <p className="menu-label !mb-3 !text-base">Réglages</p>
              <div className="flex items-center justify-between">
                <span className="font-menu text-lg font-semibold">Son</span>
                <button
                  onClick={toggleSound}
                  role="switch"
                  aria-checked={soundOn}
                  className={clsx("relative h-7 w-12 rounded-full border transition-colors", soundOn ? "border-[#ffc83d] bg-[#ffc83d]/80" : "border-white/25 bg-white/10")}
                >
                  <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", soundOn ? "left-6" : "left-0.5")} />
                </button>
              </div>
              <p className="mt-4 font-menu text-lg font-semibold">Plateau</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    ["3d", "3D"],
                    ["classic", "Classique"],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} onClick={() => setBoardView(id)} aria-pressed={boardView === id} className="menu-option py-1.5 text-center font-menu font-bold">
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
