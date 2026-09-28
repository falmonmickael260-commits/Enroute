"use client";

export function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={enabled ? "Couper le son" : "Activer le son"}
      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-colors"
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
