"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const POLL_INTERVAL_MS = 3000;

type NowPlaying = {
  id: string;
  youtubeVideoId: string;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  proposedByName: string;
  state: string;
  positionHint: number;
  startedAt: string | null;
};

type UpcomingItem = {
  id: string;
  videoTitle: string;
  channelTitle: string;
  proposedByName: string;
};

type ConnectionState = "connecting" | "online" | "offline";

export default function PantallaPage() {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/jukebox/now", { cache: "no-store" });
        if (!res.ok) throw new Error("poll failed");
        const data = (await res.json()) as {
          nowPlaying: NowPlaying | null;
          upcoming: UpcomingItem[];
        };
        if (cancelled) return;
        setNowPlaying(data.nowPlaying);
        setUpcoming(data.upcoming ?? []);
        setConnection("online");
      } catch {
        if (!cancelled) setConnection("offline");
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const jukboxUrl = origin ? `${origin}/jukebox` : "";

  const connectionClass =
    connection === "online"
      ? "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#d8ffc7]"
      : connection === "offline"
        ? "border-red-400/30 bg-red-500/10 text-red-200"
        : "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";

  const connectionLabel =
    connection === "online" ? "En vivo" : connection === "offline" ? "Reconectando..." : "Conectando...";

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(140,255,89,0.08),_transparent_40%),#0a0a0a] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#8cff59]/70">
              A51 Barber
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Jukebox
            </h1>
          </div>
          <span className={`rounded-full border px-4 py-2 text-sm font-medium ${connectionClass}`}>
            {connectionLabel}
          </span>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">

          {/* Now playing */}
          <section className="flex-1 rounded-[36px] border border-white/10 bg-white/4 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            {nowPlaying ? (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {nowPlaying.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={nowPlaying.thumbnailUrl}
                    alt=""
                    className="h-32 w-32 shrink-0 rounded-2xl object-cover shadow-[0_8px_40px_rgba(140,255,89,0.15)] sm:h-40 sm:w-40"
                  />
                )}
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8cff59]" />
                    Sonando ahora
                  </span>
                  <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                    {nowPlaying.videoTitle}
                  </h2>
                  <p className="text-lg text-zinc-300">{nowPlaying.channelTitle}</p>
                  <p className="text-sm text-zinc-500">
                    Pedido por{" "}
                    <span className="font-medium text-zinc-300">{nowPlaying.proposedByName}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
                  Esperando propuestas
                </p>
                <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
                  Listos para sonar
                </h2>
                <p className="mx-auto max-w-lg text-base text-zinc-400">
                  Escaneá el QR, buscá tu tema y proponeselo al local.
                </p>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mt-8 space-y-2 border-t border-white/8 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Próximos
                </p>
                {upcoming.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-zinc-600">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-300">{item.videoTitle}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {item.channelTitle} · {item.proposedByName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* QR panel */}
          {jukboxUrl ? (
            <aside className="flex shrink-0 flex-col items-center gap-4 rounded-[36px] border border-white/10 bg-white/4 p-8 text-center backdrop-blur-sm xl:w-[280px]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Pedí tu tema
              </p>
              <div className="rounded-[24px] bg-white p-4 shadow-[0_16px_60px_rgba(140,255,89,0.12)]">
                <QRCodeSVG value={jukboxUrl} size={180} includeMargin={false} />
              </div>
              <p className="max-w-[200px] text-sm text-zinc-300">
                Escaneá con tu celu y proponé una canción
              </p>
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                Sin login. Gratis.
              </span>
            </aside>
          ) : null}
        </div>

        {/* Footer */}
        <p className="text-xs text-zinc-700">
          A51 Barber · Jukebox · Polling cada {POLL_INTERVAL_MS / 1000}s
        </p>
      </div>
    </main>
  );
}
