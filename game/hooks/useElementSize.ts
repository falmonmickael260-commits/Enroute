"use client";

import { useCallback, useRef, useState } from "react";

/** Callback ref + live content-box size of the element it's attached to. */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  return [ref, size] as const;
}
