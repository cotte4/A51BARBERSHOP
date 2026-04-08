"use client";

import Link from "next/link";
import type { StyleProfile, FaceShape } from "@/lib/types";

const SHAPE_LABELS: Record<string, string> = {
  oval: "Ovalado",
  cuadrado: "Cuadrado fuerte",
  redondo: "Redondo",
  corazon: "Corazón",
  diamante: "Diamante",
};

type StyleDNACardProps = {
  profile: StyleProfile;
  faceShape: FaceShape | string | null;
  totalVisits: number;
  allowRedo?: boolean;
};

export default function StyleDNACard({ profile, faceShape, totalVisits, allowRedo }: StyleDNACardProps) {
  const shapeLabel = faceShape ? (SHAPE_LABELS[faceShape] ?? faceShape) : null;
  const barberName = profile.idealBarberoId ? "Tu barbero asignado" : "Pinky";

  return (
    <div className="panel-card rounded-[28px] p-5 space-y-5">
      {/* Header */}
      <div>
        <p className="eyebrow text-xs text-zinc-500">Tu Perfil Marciano</p>
        <h2 className="font-display text-5xl font-bold text-[#8cff59] leading-none mt-2">
          {profile.dominantStyle}
        </h2>
      </div>

      {/* Face shape */}
      {shapeLabel && (
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1">Tipo de rostro</p>
          <p className="text-sm font-medium text-white">{shapeLabel}</p>
        </div>
      )}

      {/* Recommended cuts */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Cortes recomendados</p>
        <div className="flex flex-wrap gap-2">
          {profile.recommendedCuts.slice(0, 3).map((cut, i) => (
            <span
              key={i}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white"
            >
              {cut}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Tiempo en silla</p>
          <p className="mt-1 text-sm font-semibold text-white">{profile.chairTimeMin} min</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Barber ideal</p>
          <p className="mt-1 text-sm font-semibold text-white">{barberName}</p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 pt-1">
        <Link
          href="/marciano/turnos/nuevo"
          className="neon-button rounded-[20px] px-6 py-3 font-semibold text-[#07130a] text-center block text-sm"
        >
          Reservar con mi Perfil Marciano
        </Link>
        <button
          type="button"
          onClick={() => {}}
          className="ghost-button rounded-[20px] px-6 py-3 font-semibold text-sm"
        >
          Compartir mi perfil
        </button>
        {allowRedo && (
          <Link
            href="/marciano/estilo?redo=1"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition text-center py-1"
          >
            Rehacer mi análisis
          </Link>
        )}
      </div>
    </div>
  );
}
