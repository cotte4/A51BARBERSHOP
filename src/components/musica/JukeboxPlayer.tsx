"use client";

import { useCallback, useEffect, useRef } from "react";
import type { JukeboxQueueItem } from "@/lib/jukebox";

const PLAYER_ORIGIN = "https://www.youtube.com";
const FALLBACK_DURATION_SECONDS = 6 * 60;
const FALLBACK_MARGIN_SECONDS = 5;
const RETRY_CHECK_MS = 5000;

type Props = {
  /** El tema en aire según el sondeo de la pantalla (/musica/jukebox). Este componente no consulta nada. */
  nowPlaying: JukeboxQueueItem | null;
};

/**
 * Reproduce el jukebox en este navegador. Se monta recién cuando el staff toca "Activar Jukebox"
 * (ese toque es el gesto que el navegador exige para dejar sonar el video) y se desmonta al apagarlo
 * o al salir de la ruta: el iframe, el temporizador de respaldo y el listener se limpian solos.
 */
export default function JukeboxPlayer({ nowPlaying }: Props) {
  const deadlineRef = useRef<{ id: string; at: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentIdRef = useRef<string | null>(null);
  const advancingRef = useRef(false);

  const nowPlayingId = nowPlaying?.id ?? null;
  const nowPlayingDuration = nowPlaying?.durationSeconds ?? null;

  useEffect(() => {
    currentIdRef.current = nowPlayingId;
  }, [nowPlayingId]);

  const advance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      // Se manda el id del tema para que un aviso tardío (evento + temporizador) no salte el siguiente.
      const res = await fetch("/api/jukebox/next", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueItemId: currentIdRef.current }),
      });
      if (!res.ok) throw new Error("next");
    } catch {
      // Sin red o sin sesión: el control de abajo vuelve a intentar en unos segundos.
    } finally {
      advancingRef.current = false;
    }
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== PLAYER_ORIGIN) return;
      try {
        const data =
          typeof event.data === "string"
            ? (JSON.parse(event.data) as unknown)
            : event.data;

        if (
          data &&
          typeof data === "object" &&
          "event" in data &&
          (data as { event: string }).event === "infoDelivery" &&
          "info" in data &&
          (data as { info: { playerState?: number } }).info?.playerState === 0
        ) {
          void advance();
        }
      } catch {
        // mensaje no JSON, ignorar
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [advance]);

  // Respaldo: si YouTube no avisa el fin, avanzamos cuando se cumple la duración (+ margen).
  // Se revisa cada pocos segundos: si avanzar falla (red, sesión), se reintenta solo.
  useEffect(() => {
    if (!nowPlayingId) return;
    if (deadlineRef.current?.id !== nowPlayingId) {
      const seconds = (nowPlayingDuration ?? FALLBACK_DURATION_SECONDS) + FALLBACK_MARGIN_SECONDS;
      deadlineRef.current = { id: nowPlayingId, at: Date.now() + seconds * 1000 };
    }
    const timer = window.setInterval(() => {
      if (deadlineRef.current && Date.now() >= deadlineRef.current.at) void advance();
    }, RETRY_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [nowPlayingId, nowPlayingDuration, advance]);

  // Handshake: sin este mensaje el iframe no emite infoDelivery (playerState 0 = terminó).
  function handleIframeLoad() {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
      PLAYER_ORIGIN,
    );
  }

  if (!nowPlaying) return null;
  if (!nowPlaying.youtubeVideoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-zinc-800 bg-black text-sm text-zinc-400">
        Buscando el video…
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${nowPlaying.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

  // Solo el video: el título y quién lo pidió los muestra el plato de /musica/jukebox.
  return (
    <div className="overflow-hidden rounded-2xl">
      <iframe
        key={nowPlaying.id}
        ref={iframeRef}
        src={embedUrl}
        onLoad={handleIframeLoad}
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={nowPlaying.videoTitle}
        className="aspect-video w-full"
      />
    </div>
  );
}
