import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full rounded-[28px] p-3 sm:p-5 panel-wood">
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(100deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 26px)",
        }}
      />
      <div className="relative rounded-2xl overflow-hidden border-4 border-[var(--color-wood-900)] shadow-[0_10px_0_rgba(0,0,0,0.35),0_24px_40px_rgba(0,0,0,0.5)]">
        {children}
      </div>
    </div>
  );
}
