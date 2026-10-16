"use client";

import { useEffect, useState, type ReactNode } from "react";
import Disco from "@/components/musica/Disco";
import type { JukeboxQueueItem } from "@/lib/jukebox";
import type { FotoSpotify, FuenteJukebox } from "@/lib/jukebox-runtime";

type Props = {
  nowPlaying: JukeboxQueueItem | null;
  foto: FotoSpotify | null;
  fuente: FuenteJukebox;
  hayCola: boolean;
  ocupado: string | null;
  onSaltar: () => void;
  onPausaPlay: () => void;
  /** Modo YouTube: el reproductor va adentro del plato. */
  children?: ReactNode;
};

type Tema = { titulo: string; artistas: string; tapa: string | null; quien: string | null; deLaLista: boolean };

/** El plato: qué suena, quién lo pidió, cuánto falta, y los dos controles que importan (pausa y saltar). */
export default function Deck({ nowPlaying, foto, fuente, hayCola, ocupado, onSaltar, onPausaPlay, children }: Props) {
  const conSpotify = fuente === "spotify";
  const fotoTema = conSpotify ? foto?.tema ?? null : null;

  const tema: Tema | null = nowPlaying
    ? {
        titulo: nowPlaying.videoTitle,
        artistas: nowPlaying.channelTitle,
        tapa: nowPlaying.thumbnailUrl,
        quien: nowPlaying.proposedByName || null,
        deLaLista: false,
      }
    : fotoTema
      ? { titulo: fotoTema.nombre, artistas: fotoTema.artistas, tapa: fotoTema.tapa, quien: null, deLaLista: true }
      : null;

  const sonando = conSpotify ? foto?.estado === "sonando" : !!nowPlaying;
  // La barra solo tiene sentido si la foto de Spotify es de este mismo tema.
  const mismoTema = !!fotoTema && (!nowPlaying || nowPlaying.spotifyTrackUri === fotoTema.uri);
  const progreso = useProgreso(mismoTema ? foto : null);

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-[#8cff59]/25 p-5"
      style={{ background: "radial-gradient(90% 80% at 15% 20%, rgba(140,255,89,0.10), rgba(9,9,11,0.96) 70%)" }}
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <Disco tamano={112} etiqueta={tema?.tapa ?? null} girando={sonando && !!tema} brazoAbajo={sonando && !!tema} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#8cff59]">
            {!tema ? "En silencio" : sonando ? "Suena" : "En pausa"}
          </p>
          {tema ? (
            <>
              <p key={tema.titulo} className="pop-in mt-1 line-clamp-2 text-lg font-semibold leading-snug text-white">
                {tema.titulo}
              </p>
              <p className="mt-0.5 truncate text-sm text-zinc-400">{tema.artistas}</p>
              <p className="mt-2 inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-zinc-300">
                <span className="truncate">
                  {tema.deLaLista ? "Tu lista de Spotify" : tema.quien ? `Lo pidió ${tema.quien}` : "De la jukebox"}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              {hayCola ? "Hay temas esperando. Dale play para arrancar." : "Cuando alguien pida un tema, aparece acá."}
            </p>
          )}
        </div>
      </div>

      {progreso ? (
        <div className="mt-4">
          <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full origin-left rounded-full bg-[#8cff59] transition-transform duration-1000 ease-linear"
              style={{ transform: `scaleX(${progreso.fraccion})` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
            <span>{reloj(progreso.ms)}</span>
            <span>-{reloj(progreso.totalMs - progreso.ms)}</span>
          </div>
        </div>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}

      <div className={`mt-4 grid gap-2 ${conSpotify ? "grid-cols-2" : "grid-cols-1"}`}>
        {conSpotify ? (
          <button
            type="button"
            onClick={onPausaPlay}
            disabled={ocupado !== null || (!tema && !hayCola)}
            className="ghost-button flex min-h-14 items-center justify-center gap-2 rounded-[20px] text-base font-semibold transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
          >
            {ocupado === "pausa" ? <Girando /> : sonando ? <IconoPausa /> : <IconoPlay />}
            {sonando ? "Pausa" : "Play"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSaltar}
          disabled={ocupado !== null || !tema}
          className="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border border-zinc-700 bg-zinc-900 text-base font-semibold text-zinc-200 transition-transform duration-150 ease-out hover:border-zinc-500 active:scale-[0.97] disabled:opacity-50"
        >
          {ocupado === "saltar" ? <Girando /> : <IconoSaltar />}
          Saltar
        </button>
      </div>
    </section>
  );
}

/** El avance del tema: la foto dice dónde estaba hace unos segundos y acá se lo deja correr. */
function useProgreso(foto: FotoSpotify | null): { ms: number; totalMs: number; fraccion: number } | null {
  const [ahora, setAhora] = useState(() => Date.now());
  const corre = foto?.estado === "sonando";
  useEffect(() => {
    if (!corre) return;
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [corre]);

  if (!foto || !foto.duracionMs) return null;
  const transcurrido = corre ? Math.max(0, ahora - new Date(foto.en).getTime()) : 0;
  const ms = Math.min(foto.duracionMs, foto.progresoMs + transcurrido);
  return { ms, totalMs: foto.duracionMs, fraccion: ms / foto.duracionMs };
}

function reloj(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function Girando() {
  return (
    <span
      className="h-5 w-5 shrink-0 rounded-full border-2 border-current border-t-transparent"
      style={{ animation: "a51-spin 0.7s linear infinite" }}
      aria-hidden="true"
    />
  );
}

function IconoPausa() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M9 6v12M15 6v12" strokeLinecap="round" />
    </svg>
  );
}

function IconoPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5-10-6.5z" strokeLinejoin="round" />
    </svg>
  );
}

function IconoSaltar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M6 6l8 6-8 6V6zM18 6v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
