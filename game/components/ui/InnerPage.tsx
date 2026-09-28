import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { TableBackdrop } from "./TableBackdrop";

/** Menu-style page laid on the game table, below the inlaid logo. */
export function InnerPage({
  backHref,
  backLabel,
  title,
  wide = false,
  children,
}: {
  backHref: string;
  backLabel: string;
  title?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="relative isolate min-h-dvh text-[var(--color-paper)]">
      <TableBackdrop />
      <Link
        href={backHref}
        className="panel-leather fixed left-3 top-3 z-20 rounded-full px-4 py-2 font-hud text-xs font-bold uppercase tracking-widest text-white/80 transition-colors hover:text-white"
      >
        ← {backLabel}
      </Link>
      <div className="relative z-10 flex min-h-dvh flex-col items-center px-4 pb-10" style={{ paddingTop: "calc(var(--logo-band) + 1.25rem)" }}>
        <div className={clsx("panel-leather flex w-full flex-col gap-6 rounded-3xl p-5 sm:p-7", wide ? "max-w-4xl" : "max-w-lg")}>
          {title ? <h1 className="text-brass text-center font-display text-4xl tracking-wide sm:text-5xl">{title}</h1> : null}
          {children}
        </div>
      </div>
    </main>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 font-hud text-[0.7rem] font-bold uppercase tracking-[0.25em] text-[var(--color-brass-300)]/85">{children}</p>;
}
