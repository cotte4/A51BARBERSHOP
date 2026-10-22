"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TemaEstudio } from "@/lib/estudio";
import { formatDuracion } from "@/lib/estudio-reglas";

const ARTISTA = "Was & Pinky";

function audioUrl(id: string) {
  return `/api/estudio/temas/${id}/audio`;
}

export function portadaUrl(tema: TemaEstudio) {
  return tema.tienePortada ? `/api/estudio/temas/${tema.id}/portada` : null;
}

export type Reproductor = ReturnType<typeof useReproductor>;

/**
 * Un solo <audio> para toda la página. El primer play tiene que salir de un toque (iOS),
 * por eso `reproducir` llama a play() en el mismo handler. Pantalla bloqueada, Bluetooth y
 * auto se manejan con la Media Session.
 */
export function useReproductor(temas: TemaEstudio[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [actualId, setActualId] = useState<string | null>(null);
  const [sonando, setSonando] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const reintentoRef = useRef(false);
  // Al recargar un link vencido, la posición se aplica recién cuando hay metadata.
  const retomarDesdeRef = useRef<number | null>(null);

  const actual = temas.find((tema) => tema.id === actualId) ?? null;

  const cargarYSonar = useCallback((id: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    reintentoRef.current = false;
    setActualId(id);
    setTiempo(0);
    setDuracion(0);
    audio.src = audioUrl(id);
    void audio.play().catch(() => setSonando(false));
  }, []);

  const reproducir = useCallback(
    (id: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (id === actualId) {
        if (audio.paused) void audio.play().catch(() => setSonando(false));
        else audio.pause();
        return;
      }
      cargarYSonar(id);
    },
    [actualId, cargarYSonar]
  );

  const alternar = useCallback(() => {
    if (actualId) reproducir(actualId);
    else if (temas[0]) cargarYSonar(temas[0].id);
  }, [actualId, cargarYSonar, reproducir, temas]);

  const indice = actual ? temas.findIndex((tema) => tema.id === actual.id) : -1;

  const siguiente = useCallback(() => {
    const proximo = temas[indice + 1];
    if (proximo) {
      cargarYSonar(proximo.id);
      return;
    }
    // Terminó el último: queda pausado al principio del mismo tema.
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [cargarYSonar, indice, temas]);

  const anterior = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const previo = temas[indice - 1];
    if (previo) cargarYSonar(previo.id);
    else if (audio) audio.currentTime = 0;
  }, [cargarYSonar, indice, temas]);

  const irA = useCallback((segundos: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(segundos)) return;
    audio.currentTime = Math.max(0, segundos);
    setTiempo(audio.currentTime);
  }, []);

  // Si borran el tema que está sonando, se para.
  useEffect(() => {
    if (actualId && !temas.some((tema) => tema.id === actualId)) {
      const audio = audioRef.current;
      audio?.pause();
      audio?.removeAttribute("src");
      setActualId(null);
      setSonando(false);
    }
  }, [actualId, temas]);

  // Eventos del <audio>. Los handlers que cambian de tema se leen de una ref para no re-suscribir.
  const siguienteRef = useRef(siguiente);
  useEffect(() => {
    siguienteRef.current = siguiente;
  }, [siguiente]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const posicion = () => {
      if (!("mediaSession" in navigator) || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          position: Math.min(audio.currentTime, audio.duration),
          playbackRate: audio.playbackRate,
        });
      } catch {
        // Algunos navegadores tiran si el estado no es válido todavía.
      }
    };

    const alSonar = () => {
      setSonando(true);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
      posicion();
    };
    const alPausar = () => {
      setSonando(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
      posicion();
    };
    const alAvanzar = () => setTiempo(audio.currentTime);
    const alCargar = () => {
      if (retomarDesdeRef.current !== null) {
        audio.currentTime = retomarDesdeRef.current;
        retomarDesdeRef.current = null;
      }
      setDuracion(Number.isFinite(audio.duration) ? audio.duration : 0);
      posicion();
    };
    const alTerminar = () => siguienteRef.current();
    // El link firmado vence a las 6 h: si falla, se pide uno nuevo y sigue desde donde estaba.
    const alFallar = () => {
      if (reintentoRef.current || !audio.getAttribute("src")) {
        setSonando(false);
        return;
      }
      reintentoRef.current = true;
      retomarDesdeRef.current = audio.currentTime;
      const id = new URL(audio.src, window.location.href).pathname.split("/")[4];
      if (!id) return;
      audio.src = `${audioUrl(id)}?r=${Date.now()}`;
      void audio.play().catch(() => setSonando(false));
    };

    audio.addEventListener("play", alSonar);
    audio.addEventListener("pause", alPausar);
    audio.addEventListener("timeupdate", alAvanzar);
    audio.addEventListener("loadedmetadata", alCargar);
    audio.addEventListener("durationchange", alCargar);
    audio.addEventListener("seeked", posicion);
    audio.addEventListener("ended", alTerminar);
    audio.addEventListener("error", alFallar);
    return () => {
      audio.removeEventListener("play", alSonar);
      audio.removeEventListener("pause", alPausar);
      audio.removeEventListener("timeupdate", alAvanzar);
      audio.removeEventListener("loadedmetadata", alCargar);
      audio.removeEventListener("durationchange", alCargar);
      audio.removeEventListener("seeked", posicion);
      audio.removeEventListener("ended", alTerminar);
      audio.removeEventListener("error", alFallar);
    };
  }, []);

  // Media Session: lo que se ve en la pantalla bloqueada y lo que mandan el parlante y el auto.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !actual) return;
    const portada = portadaUrl(actual);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: actual.titulo,
      artist: ARTISTA,
      album: actual.genero ?? "A51",
      artwork: [
        portada
          ? { src: new URL(portada, window.location.href).href, sizes: "1024x1024" }
          : { src: new URL("/icon-512.png", window.location.href).href, sizes: "512x512", type: "image/png" },
      ],
    });
  }, [actual]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => void audio?.play()],
      ["pause", () => audio?.pause()],
      ["nexttrack", () => siguiente()],
      ["previoustrack", () => anterior()],
      ["seekto", (detalle) => irA(detalle.seekTime ?? 0)],
      ["seekforward", (detalle) => irA((audio?.currentTime ?? 0) + (detalle.seekOffset ?? 10))],
      ["seekbackward", (detalle) => irA((audio?.currentTime ?? 0) - (detalle.seekOffset ?? 10))],
    ];
    for (const [accion, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(accion, handler);
      } catch {
        // Acción no soportada en este navegador.
      }
    }
  }, [anterior, irA, siguiente]);

  return { audioRef, actual, sonando, tiempo, duracion, reproducir, alternar, siguiente, anterior, irA };
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

function SaltoIcon({ atras = false }: { atras?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${atras ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 6l9 6-9 6V6Z" strokeLinejoin="round" />
      <path d="M18 6v12" strokeLinecap="round" />
    </svg>
  );
}

export function Portada({ tema, size }: { tema: TemaEstudio; size: "sm" | "md" }) {
  const url = portadaUrl(tema);
  const clase = size === "sm" ? "h-12 w-12 rounded-xl text-lg" : "h-14 w-14 rounded-2xl text-xl";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- link firmado privado, no pasa por next/image
    return <img src={url} alt="" className={`${clase} shrink-0 bg-zinc-800 object-cover`} />;
  }
  return (
    <span className={`${clase} flex shrink-0 items-center justify-center bg-zinc-800 font-display font-bold text-[#8cff59]`}>
      {tema.titulo.charAt(0).toUpperCase()}
    </span>
  );
}

/** Barra fija abajo: portada, título, controles y la línea de tiempo arrastrable. */
export function BarraReproductor({ reproductor }: { reproductor: Reproductor }) {
  const { audioRef, actual, sonando, tiempo, duracion, alternar, siguiente, anterior, irA } = reproductor;

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      {actual ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            <div className="flex items-center gap-3">
              <Portada tema={actual} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{actual.titulo}</p>
                <p className="truncate text-sm text-zinc-400">{ARTISTA}</p>
              </div>
              <button type="button" onClick={anterior} aria-label="Anterior" className="rounded-full p-2 text-zinc-300 hover:text-white">
                <SaltoIcon atras />
              </button>
              <button
                type="button"
                onClick={alternar}
                aria-label={sonando ? "Pausar" : "Reproducir"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8cff59] text-[#07130a]"
              >
                {sonando ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button type="button" onClick={siguiente} aria-label="Siguiente" className="rounded-full p-2 text-zinc-300 hover:text-white">
                <SaltoIcon />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs tabular-nums text-zinc-400">
              <span className="w-9 text-right">{formatDuracion(tiempo)}</span>
              <input
                type="range"
                min={0}
                max={duracion || 0}
                step={0.1}
                value={Math.min(tiempo, duracion || 0)}
                onChange={(evento) => irA(Number(evento.target.value))}
                aria-label="Posición del tema"
                className="h-1 flex-1 cursor-pointer accent-[#8cff59]"
              />
              <span className="w-9">{formatDuracion(duracion || actual.duracionSeg)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
