"use client";

import { useEffect } from "react";

/**
 * Keeps the KILOMAX pictures from being saved with a right click or dragged
 * off the page (logo, backgrounds, the 3D board). Text, links and buttons
 * keep their usual behaviour; this only discourages casual copying.
 */
export function ImageGuard() {
  useEffect(() => {
    const isPicture = (target: EventTarget | null) =>
      target instanceof Element && (target.closest("img, picture, canvas, svg") !== null || target.closest(".menu-backdrop") !== null);
    const block = (e: Event) => {
      if (isPicture(e.target)) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}
