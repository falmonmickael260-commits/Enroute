"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import { BrandLoader } from "./BrandLoader";

/**
 * The loading screen, shown each time the site is opened (whatever the page),
 * not on moves between pages: it lives in the root layout, and the flag below
 * only lasts as long as the page itself.
 */
let done = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getDone = () => done;
const getDoneServer = () => false;

function finish() {
  done = true;
  listeners.forEach((listener) => listener());
}

/** True once the loading screen has opened on the page. */
export function useBootDone() {
  return useSyncExternalStore(subscribe, getDone, getDoneServer);
}

export function BootLoader() {
  const finished = useBootDone();
  return <AnimatePresence>{finished ? null : <BrandLoader key="boot" onFinish={finish} />}</AnimatePresence>;
}
