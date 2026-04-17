"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 3000;
const PLAYER_ORIGIN = "https://www.youtube.com";

type NowPlayingResponse = {
  nowPlaying: {
    id: string;
    youtubeVideoId: string;
    videoTitle: string;
    proposedByName: string;
  } | null;
};

export default function JukeboxPlayer() {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse["nowPlaying"]>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentIdRef = useRef<string | null>(null);
  const advancingRef = useRef(false);

  const advance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      await fetch("/api/jukebox/next", { method: "POST", cache: "no-store" });
    } finally {
      advancingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/jukebox/now", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as NowPlayingResponse;
        if (!cancelled) setNowPlaying(data.nowPlaying);
      } catch {
        // silencioso — el player no es crítico
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
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
          advance();
        }
      } catch {
        // mensaje no JSON, ignorar
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [advance]);

  if (!nowPlaying) return null;

  const videoChanged = nowPlaying.id !== currentIdRef.current;
  if (videoChanged) currentIdRef.current = nowPlaying.id;

  const embedUrl = `https://www.youtube.com/embed/${nowPlaying.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`;

  return (
    <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Jukebox</p>
          <h3 className="mt-1 text-base font-semibold text-white truncate max-w-xs">
            {nowPlaying.videoTitle}
          </h3>
          <p className="text-xs text-zinc-400">Propuesto por {nowPlaying.proposedByName}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
          Sonando
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl">
        <iframe
          key={nowPlaying.id}
          ref={iframeRef}
          src={embedUrl}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="aspect-video w-full"
        />
      </div>
    </section>
  );
}
