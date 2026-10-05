"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { RulesContent } from "./RulesContent";

/**
 * A small "?" in the game's toolbar: the rules slide up over the table, the
 * game stays where it is underneath.
 */
export function RulesButton() {
  const [open, setOpen] = useState(false);
  // the sheet joins the page on first use (nothing to hydrate before that)
  const [used, setUsed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
        aria-label="Règles du jeu"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 font-display text-lg text-white transition-colors hover:bg-white/10 sm:h-10 sm:w-10"
      >
        ?
      </button>
      {used
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="rules"
                  className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Règles du jeu"
                    className="panel-leather flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/15 sm:rounded-3xl"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                      <p className="text-brass font-display text-2xl tracking-wide">Règles du jeu</p>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Fermer les règles"
                        className="btn-enroute-ghost panel-leather !h-9 !w-9 !p-0 !text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-col gap-8 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                      <RulesContent />
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
