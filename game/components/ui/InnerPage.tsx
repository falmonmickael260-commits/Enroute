import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { MenuBackdrop } from "@/game/components/menu/MenuBackdrop";
import { ArrowLeftIcon, FlagIcon } from "@/game/components/menu/icons";
import { LEGAL, LEGAL_READY } from "@/game/lib/brand/legal";
import { Logo } from "./Logo";

/** Menu page: the KILOMAX picture behind, the logo on top, a carbon panel with a gold edge. */
export function InnerPage({
  backHref,
  backLabel,
  title,
  subtitle,
  wide = false,
  children,
}: {
  backHref: string;
  backLabel: string;
  title?: string;
  subtitle?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="relative isolate min-h-dvh text-[var(--color-paper)]">
      <MenuBackdrop variant="inner" />
      <div className={clsx("relative z-10 mx-auto flex min-h-dvh w-full flex-col px-3.5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5", wide ? "max-w-4xl" : "max-w-xl")}>
        {/* back · logo · (balance) — the logo never runs under the button */}
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-1 sm:gap-3">
          <Link href={backHref} className="menu-back">
            <ArrowLeftIcon className="h-[1.1em] w-[1.1em]" />
            {backLabel}
          </Link>
          <div className="flex justify-center">
            <Logo size="md" className="!w-[min(100%,17rem)] drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]" />
          </div>
          <span aria-hidden className="menu-back invisible">
            <ArrowLeftIcon className="h-[1.1em] w-[1.1em]" />
            {backLabel}
          </span>
        </header>

        <div className="menu-panel mt-2 flex w-full flex-col gap-5 px-4 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
          {title ? (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="flex items-center gap-2">
                <span className="menu-title text-[clamp(2.2rem,10.5vw,3.4rem)]">{title}</span>
                <FlagIcon className="h-9 w-9 shrink-0 -rotate-6 opacity-90" />
              </h1>
              {subtitle ? <p className="font-sans text-[0.78rem] font-medium uppercase tracking-[0.06em] text-white/70">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
        <p className="mt-5 text-center font-hud text-[0.7rem] font-semibold text-white/60 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
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
      </div>
    </main>
  );
}

export function SectionLabel({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <p className="menu-label">
      {icon ? <span className="flex h-6 w-6 shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full">{icon}</span> : null}
      {children}
    </p>
  );
}
