import type { MusicRuntimeState } from "@/lib/music-types";

const STYLES: Record<MusicRuntimeState, string> = {
  ready: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  degraded: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  offline: "border-red-400/30 bg-red-500/10 text-red-200",
};

const LABELS: Record<MusicRuntimeState, string> = {
  ready: "Listo para sonar",
  degraded: "Sin player",
  offline: "Provider caido",
};

export default function MusicStateBadge({ state }: { state: MusicRuntimeState }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STYLES[state]}`}>
      {LABELS[state]}
    </span>
  );
}
