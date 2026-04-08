"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { playSound } from "@/lib/marciano-sounds";
import type { StyleProfile, FaceShape } from "@/lib/types";

const SHAPE_LABELS: Record<string, string> = {
  oval: "Ovalado",
  cuadrado: "Cuadrado fuerte",
  redondo: "Redondo",
  corazon: "Corazón",
  diamante: "Diamante",
};

type StyleDNARevealProps = {
  profile: StyleProfile;
  faceShape: FaceShape | null;
  totalVisits: number;
  onShare: () => void;
};

export default function StyleDNAReveal({ profile, faceShape, totalVisits, onShare }: StyleDNARevealProps) {
  const [visible, setVisible] = useState({
    bg: false,
    faceShape: false,
    estilo: false,
    cortes: false,
    tiempo: false,
    barber: false,
    ctas: false,
  });

  useEffect(() => {
    const timers = [
      setTimeout(() => { setVisible((v) => ({ ...v, bg: true })); playSound("tick"); }, 0),
      setTimeout(() => { setVisible((v) => ({ ...v, faceShape: true })); playSound("tick"); }, 400),
      setTimeout(() => { setVisible((v) => ({ ...v, estilo: true })); playSound("reveal"); }, 900),
      setTimeout(() => { setVisible((v) => ({ ...v, cortes: true })); playSound("tick"); }, 1600),
      setTimeout(() => { setVisible((v) => ({ ...v, tiempo: true })); playSound("tick"); }, 2400),
      setTimeout(() => { setVisible((v) => ({ ...v, barber: true })); playSound("tick"); }, 2700),
      setTimeout(() => { setVisible((v) => ({ ...v, ctas: true })); }, 3100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  function revealStyle(show: boolean): React.CSSProperties {
    return {
      opacity: show ? 1 : 0,
      transform: show ? "none" : "translateY(8px)",
      transition: "opacity 0.5s, transform 0.5s",
    };
  }

  const barberName = profile.idealBarberoId ? "Tu barbero asignado" : "Pinky";

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto py-16 px-6 flex flex-col items-center justify-start gap-6">
      {/* Eyebrow */}
      <div style={revealStyle(visible.bg)}>
        <p className="text-zinc-500 uppercase tracking-widest text-xs text-center">Tu Perfil Marciano</p>
      </div>

      {/* Face shape */}
      <div style={revealStyle(visible.faceShape)} className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1">Tipo de rostro</p>
        <p className="text-xl font-semibold text-white">
          {faceShape ? (SHAPE_LABELS[faceShape] ?? faceShape) : "Ovalado"}
        </p>
      </div>

      {/* Dominant style — the hero reveal */}
      <div style={revealStyle(visible.estilo)} className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Estilo dominante</p>
        <h1 className="font-display text-6xl sm:text-8xl font-bold text-[#8cff59] leading-none">
          {profile.dominantStyle}
        </h1>
      </div>

      {/* Recommended cuts */}
      <div style={revealStyle(visible.cortes)} className="text-center w-full max-w-sm">
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">Cortes que te quedan</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {profile.recommendedCuts.map((cut, i) => (
            <span
              key={i}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white"
            >
              {cut}
            </span>
          ))}
        </div>
      </div>

      {/* Chair time */}
      <div style={revealStyle(visible.tiempo)} className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1">Tiempo en silla</p>
        <p className="text-xl font-semibold text-white">{profile.chairTimeMin} min</p>
      </div>

      {/* Ideal barber */}
      <div style={revealStyle(visible.barber)} className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1">Tu barber ideal</p>
        <p className="text-xl font-semibold text-white">{barberName}</p>
      </div>

      {/* CTAs */}
      <div
        style={revealStyle(visible.ctas)}
        className="flex flex-col gap-3 w-full max-w-sm pt-4"
      >
        <Link
          href="/marciano/turnos/nuevo"
          className="neon-button rounded-[20px] px-6 py-4 font-semibold text-[#07130a] text-center block"
        >
          {totalVisits === 0 ? "Reservar mi primer corte Marciano" : "Reservar con mi Perfil Marciano"}
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="ghost-button rounded-[20px] px-6 py-4 font-semibold"
        >
          Compartir mi perfil
        </button>
        <Link
          href="/marciano"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition text-center py-2"
        >
          Volver al portal
        </Link>
      </div>
    </div>
  );
}
