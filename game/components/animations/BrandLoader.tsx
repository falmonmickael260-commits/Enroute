"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { BRAND, BRAND_NAME, LOGO_ASPECT } from "@/game/lib/brand";
import styles from "./BrandLoader.module.css";

/** Share of the bar each part of the loading stands for. */
const WEIGHT = { background: 0.5, logo: 0.3, fonts: 0.1, page: 0.1 } as const;
type Part = keyof typeof WEIGHT;

/** How long the logo's entrance lasts: the loader never cuts it short. */
const LOGO_INTRO_MS = 1700;
/** A beat at 100 % before the screen opens on the game. */
const HOLD_MS = 350;
/** Whatever happens (offline, blocked file), the game opens after this. */
const GIVE_UP_MS = 15000;

/**
 * Downloads a file while reporting the bytes received (0..1), then decodes it
 * so it can be shown at once. Resolves with a local URL, or null on failure.
 */
async function load(url: string, expectedBytes: number, onProgress: (p: number) => void): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(String(res.status));
    const total = Number(res.headers.get("content-length")) || expectedBytes;
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) onProgress(Math.min(0.96, received / total));
    }
    const objectUrl = URL.createObjectURL(new Blob(chunks, { type: res.headers.get("content-type") ?? undefined }));
    const img = new Image();
    img.src = objectUrl;
    await img.decode().catch(() => undefined);
    onProgress(1);
    return objectUrl;
  } catch {
    onProgress(1);
    return null;
  }
}

/**
 * The KILOMAX loading screen: the official background for the screen's
 * orientation, the transparent logo laid over it (fade, slight settle, a
 * light sweep, a soft glow), and under it a bar that follows what is really
 * being loaded: the background, the logo, the fonts and the page itself.
 */
export function BrandLoader({ onFinish }: { onFinish: () => void }) {
  const [bgUrl, setBgUrl] = useState<{ portrait?: string; landscape?: string }>({});
  const [bgShown, setBgShown] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoShown, setLogoShown] = useState(false);
  const fillRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const parts: Record<Part, number> = { background: 0, logo: 0, fonts: 0, page: 0 };
    const set = (part: Part, p: number) => {
      parts[part] = Math.max(parts[part], p);
    };
    const target = () => (Object.keys(WEIGHT) as Part[]).reduce((sum, k) => sum + WEIGHT[k] * parts[k], 0);
    const urls: string[] = [];
    let cancelled = false;
    let logoAt = 0;
    let bgDone = false;
    let logoFile: string | null | undefined;
    let finished = false;

    const revealLogo = () => {
      // the logo comes in over the picture, not before it
      if (cancelled || logoAt || !bgDone || logoFile === undefined) return;
      logoAt = performance.now();
      setLogoUrl(logoFile);
      setLogoShown(true);
    };

    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const bg = portrait ? BRAND.portrait : BRAND.landscape;
    load(bg.src, bg.bytes, (p) => set("background", p)).then((url) => {
      if (url) urls.push(url);
      if (cancelled) return;
      bgDone = true;
      if (url) setBgUrl(portrait ? { portrait: url } : { landscape: url });
      setBgShown(true);
      revealLogo();
    });
    load(BRAND.logo.src, BRAND.logo.bytes, (p) => set("logo", p)).then((url) => {
      if (url) urls.push(url);
      logoFile = url;
      revealLogo();
    });
    document.fonts.ready.then(() => set("fonts", 1));
    const onLoad = () => set("page", 1);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    const started = performance.now();
    let shown = 0;
    let raf = 0;
    const tick = () => {
      const goal = target();
      // eases towards what has really been loaded, never goes back
      shown = Math.min(goal, shown + Math.max(0.004, (goal - shown) * 0.12));
      const pct = Math.round(shown * 100);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${shown})`;
      if (tipRef.current) tipRef.current.style.left = `${shown * 100}%`;
      if (valueRef.current) valueRef.current.textContent = `${pct} %`;
      barRef.current?.setAttribute("aria-valuenow", String(pct));

      const now = performance.now();
      const complete = shown >= 0.999 && logoAt > 0 && now - logoAt >= LOGO_INTRO_MS;
      if (!finished && (complete || now - started > GIVE_UP_MS)) {
        finished = true;
        setTimeout(() => finishRef.current(), complete ? HOLD_MS : 0);
      }
      if (!finished) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
      // let the exit fade finish with the pictures still on screen
      setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 2000);
    };
  }, []);

  const logoSrc = logoUrl ?? BRAND.logo.src;
  const rootStyle = {
    "--logo-aspect": LOGO_ASPECT,
    "--logo-url": `url("${logoSrc}")`,
  } as CSSProperties;

  return (
    <motion.div
      className={styles.root}
      style={rootStyle}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } }}
    >
      {/* the official picture for this orientation, filling the screen without distortion */}
      <div className={clsx(styles.bg, bgShown && styles.bgIn)} aria-hidden>
        {BRAND.ready ? (
          <picture>
            <source media="(orientation: portrait)" srcSet={bgUrl.portrait ?? BRAND.portrait.src} />
            <img src={bgUrl.landscape ?? BRAND.landscape.src} alt="" draggable={false} />
          </picture>
        ) : null}
      </div>

      <div className={styles.stack}>
        <div className={clsx(styles.logo, logoShown && styles.logoIn)}>
          {BRAND.ready ? (
            <>
              {/* soft glow: the logo's own shape, blurred — never a box */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="" aria-hidden className={styles.glow} draggable={false} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={BRAND_NAME} className={styles.mark} draggable={false} />
              {/* light sweeping across the logo, cut to its shape */}
              <span className={styles.sheen} aria-hidden />
            </>
          ) : (
            <span className={clsx(styles.placeholder, "font-display")}>{BRAND_NAME}</span>
          )}
        </div>

        <div
          ref={barRef}
          className={styles.progress}
          role="progressbar"
          aria-label={`Chargement de ${BRAND_NAME}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        >
          <div className={styles.track}>
            <div ref={fillRef} className={styles.fill} />
          </div>
          <div ref={tipRef} className={styles.tip} />
          <div className={clsx(styles.meta, "font-hud")}>
            <span>Chargement</span>
            <span ref={valueRef} className="tabular-nums">
              0 %
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
