"use client";

import { useState } from "react";

const GENRES = ["Trap", "Boom Bap", "Drill", "Lo-Fi", "R&B", "Afrobeat", "Reggaeton", "Jazz"];

type Beat = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export default function BeatsStudio() {
  const [query, setQuery] = useState("");
  const [beats, setBeats] = useState<Beat[]>([]);
  const [activeBeat, setActiveBeat] = useState<Beat | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchBeats(q: string) {
    if (!q.trim()) {
      setError("Escribi una busqueda primero.");
      return;
    }

    setSearching(true);
    setError(null);
    setBeats([]);

    try {
      const res = await fetch(`/api/youtube/search-beat?q=${encodeURIComponent(q.trim())}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { error?: string; beats?: Beat[] };

      if (!res.ok) {
        throw new Error(data.error ?? "No pude buscar beats.");
      }

      setBeats(data.beats ?? []);
      if ((data.beats ?? []).length === 0) {
        setError(`No encontramos beats para "${q}".`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude buscar beats.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await searchBeats(query);
  }

  async function handleGenre(genre: string) {
    setQuery(genre);
    await searchBeats(genre);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Beats de YouTube</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Buscar beats</h3>

        <div className="mt-5 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              disabled={searching}
              onClick={() => handleGenre(genre)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                query === genre
                  ? "border-[#8cff59]/60 bg-[#8cff59]/15 text-[#d8ffc7]"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="boom bap, trap, drill, lo-fi..."
            className="min-h-[52px] flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-2xl bg-[#8cff59] px-5 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {error ? (
          <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </section>

      {activeBeat ? (
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Reproduciendo</p>
              <p className="mt-1 truncate text-base font-semibold text-white">{activeBeat.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{activeBeat.channelTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveBeat(null)}
              className="shrink-0 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-3xl">
            <iframe
              src={`https://www.youtube.com/embed/${activeBeat.videoId}?autoplay=1&rel=0&modestbranding=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
        </section>
      ) : null}

      {beats.length > 0 ? (
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Resultados</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{beats.length} beats</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {beats.map((beat) => (
              <button
                key={beat.videoId}
                type="button"
                onClick={() => setActiveBeat(beat)}
                className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/60 text-left transition-colors hover:border-[#8cff59]/40 hover:bg-zinc-900"
              >
                <div className="relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beat.thumbnailUrl}
                    alt={beat.title}
                    className="aspect-video w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-full bg-[#8cff59] px-4 py-2 text-sm font-semibold text-[#07130a]">
                      ▶ Reproducir
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{beat.title}</p>
                  <p className="mt-1 truncate text-xs text-zinc-400">{beat.channelTitle}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
