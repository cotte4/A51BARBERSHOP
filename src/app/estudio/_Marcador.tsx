"use client";

import type { EstadoJuego } from "./_naveJuego";

// El marcador del jueguito de la nave: vidas, puntos y multiplicador arriba; al perder, el cartel
// con el récord. Lo demás de la pantalla queda libre para la nave.

const VIDAS = 3;

function VidaIcon({ llena }: { llena: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${llena ? "text-[#8cff59]" : "text-zinc-600"}`} fill="none" stroke="currentColor" strokeWidth="1.9">
      <ellipse cx="12" cy="13" rx="9" ry="3" fill={llena ? "currentColor" : "none"} fillOpacity={0.25} />
      <path d="M8 11.5a4 4 0 0 1 8 0" strokeLinecap="round" />
    </svg>
  );
}

function CerrarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  estado: EstadoJuego;
  sonando: boolean;
  onSalir: () => void;
  onOtraVez: () => void;
};

export default function Marcador({ estado, sonando, onSalir, onOtraVez }: Props) {
  const { puntos, vidas, multiplicador, record, termino, recordNuevo } = estado;
  // La consigna se ve hasta el primer punto de la partida.
  const consigna = puntos === 0 && vidas === VIDAS && !termino;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 px-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_auto_1fr] items-start">
          <div className="flex gap-1 pt-2" role="img" aria-label={`${vidas} ${vidas === 1 ? "vida" : "vidas"}`}>
            {Array.from({ length: VIDAS }, (_, i) => (
              <VidaIcon key={i} llena={i < vidas} />
            ))}
          </div>
          <div className="flex flex-col items-center" aria-live="polite">
            <p className="font-display text-5xl font-bold leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(140,255,89,0.5)]">{puntos}</p>
            {multiplicador > 1 ? (
              <span className="mt-1.5 rounded-full bg-[#8cff59] px-2 py-0.5 text-xs font-bold tabular-nums text-[#07130a]">×{multiplicador}</span>
            ) : null}
            {!sonando && !termino ? <span className="mt-2 rounded-full bg-zinc-950/70 px-3 py-1 text-xs text-zinc-300">En pausa</span> : null}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSalir}
              aria-label="Salir del juego"
              className="pointer-events-auto rounded-full border border-white/15 bg-zinc-950/60 p-2.5 text-zinc-200 backdrop-blur hover:text-[#8cff59]"
            >
              <CerrarIcon />
            </button>
          </div>
        </div>
        {consigna ? <p className="mt-5 text-center text-sm text-zinc-300 drop-shadow">Esquivá los meteoritos</p> : null}
      </div>

      {termino ? (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center p-6">
          <div className="pointer-events-auto w-full max-w-xs rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 text-center backdrop-blur">
            <p className="eyebrow text-xs font-semibold">Fin del juego</p>
            <p className="mt-2 font-display text-6xl font-bold leading-none tabular-nums text-white">{puntos}</p>
            <p className="mt-1 text-sm text-zinc-400">{puntos === 1 ? "punto" : "puntos"}</p>
            <p className={`mt-3 ${recordNuevo ? "font-semibold text-[#8cff59]" : "text-sm text-zinc-400"}`}>
              {recordNuevo ? "¡Récord nuevo!" : `Récord: ${record}`}
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onSalir} className="ghost-button flex-1 rounded-[20px] px-4 py-3 font-semibold">
                Salir
              </button>
              <button type="button" onClick={onOtraVez} className="neon-button flex-1 rounded-[20px] px-4 py-3 font-semibold">
                Otra vez
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
