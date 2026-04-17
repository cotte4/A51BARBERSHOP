"use client";

import { useEffect, useRef, useState } from "react";

const GENRES = ["Reggaeton", "Trap", "Rock", "Cumbia", "Pop", "Hip Hop", "Electrónica", "Salsa"];
const DEVICE_KEY_STORAGE = "a51-jukebox-device-key";
const COOLDOWN_STORAGE = "a51-jukebox-last-propose";
const COOLDOWN_MS = 5 * 60 * 1000;

type SearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
};

function formatDuration(secs: number | null): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getOrCreateDeviceKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY_STORAGE, key);
  }
  return key;
}

function isInCooldown(): boolean {
  const last = localStorage.getItem(COOLDOWN_STORAGE);
  if (!last) return false;
  return Date.now() - parseInt(last) < COOLDOWN_MS;
}

function setCooldown() {
  localStorage.setItem(COOLDOWN_STORAGE, String(Date.now()));
}

function cooldownRemaining(): number {
  const last = localStorage.getItem(COOLDOWN_STORAGE);
  if (!last) return 0;
  return Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - parseInt(last))) / 1000));
}

export default function JukeboxClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [proposerName, setProposerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);

  const [cooldownSecs, setCooldownSecs] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isInCooldown()) setCooldownSecs(cooldownRemaining());
  }, []);

  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const t = setTimeout(() => setCooldownSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSecs]);

  useEffect(() => {
    if (selected) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [selected]);

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setSelected(null);

    try {
      const deviceKey = getOrCreateDeviceKey();
      const res = await fetch(
        `/api/jukebox/search?q=${encodeURIComponent(q.trim())}&deviceKey=${encodeURIComponent(deviceKey)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as { error?: string; results?: SearchResult[] };
      if (!res.ok) throw new Error(data.error ?? "No pude buscar.");
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        setSearchError(`No encontramos resultados para "${q}".`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "No pude buscar en YouTube.");
    } finally {
      setSearching(false);
    }
  }

  async function handlePropose() {
    if (!selected || !proposerName.trim()) return;
    if (cooldownSecs > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const deviceKey = getOrCreateDeviceKey();
      const res = await fetch("/api/jukebox/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: selected.videoId,
          title: selected.title,
          channelTitle: selected.channelTitle,
          thumbnailUrl: selected.thumbnailUrl,
          durationSeconds: selected.durationSeconds,
          proposerName: proposerName.trim(),
          deviceKey,
        }),
      });

      const data = (await res.json()) as { error?: string; autoApproved?: boolean };
      if (!res.ok) throw new Error(data.error ?? "No se pudo proponer.");

      setCooldown();
      setCooldownSecs(cooldownRemaining());
      setAutoApproved(data.autoApproved ?? false);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo enviar la propuesta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="panel-card rounded-[28px] p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#8cff59]" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">
          {autoApproved ? "Tu tema ya está en la cola" : "Propuesta enviada"}
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          {autoApproved
            ? "Está en la lista y va a sonar pronto. Gracias."
            : "Si la aprueban, va a sonar pronto. Gracias por participar."}
        </p>
        {selected && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-left">
            {selected.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{selected.title}</p>
              <p className="truncate text-xs text-zinc-400">{selected.channelTitle}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setSelected(null);
            setProposerName("");
            setResults([]);
            setQuery("");
          }}
          className="ghost-button mt-5 w-full rounded-[20px] py-3 text-sm font-semibold"
        >
          Proponer otra
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="panel-card rounded-[28px] p-5">
        <p className="eyebrow text-zinc-500">Jukebox</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">
          Pedí tu tema
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Buscá una canción y proponesela al local. Si la aprueban, suena.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              disabled={searching}
              onClick={() => { setQuery(genre); handleSearch(genre); }}
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

        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
          className="mt-4 flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá artista o canción..."
            className="min-h-[48px] flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]/60"
          />
          <button
            type="submit"
            disabled={searching}
            className="neon-button rounded-[20px] px-5 text-sm font-semibold text-[#07130a] disabled:opacity-60"
          >
            {searching ? "..." : "Buscar"}
          </button>
        </form>

        {searchError && (
          <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {searchError}
          </p>
        )}
      </section>

      {results.length > 0 && !selected && (
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-zinc-500">{results.length} resultados</p>
          <div className="mt-4 flex flex-col gap-2">
            {results.map((r) => (
              <button
                key={r.videoId}
                type="button"
                onClick={() => setSelected(r)}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-left transition-colors hover:border-[#8cff59]/30 hover:bg-zinc-900"
              >
                {r.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{r.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">{r.channelTitle}</p>
                </div>
                {r.durationSeconds && (
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatDuration(r.durationSeconds)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <section className="panel-card rounded-[28px] p-5">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-0.5 shrink-0 text-zinc-500 hover:text-zinc-300"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="eyebrow text-zinc-500">Elegiste</p>
              <p className="mt-1 text-base font-semibold text-white leading-tight">{selected.title}</p>
              <p className="text-sm text-zinc-400">{selected.channelTitle}</p>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300" htmlFor="proposer-name">
              Tu nombre (o apodo)
            </label>
            <input
              id="proposer-name"
              ref={nameInputRef}
              value={proposerName}
              onChange={(e) => setProposerName(e.target.value)}
              placeholder="¿Cómo te llamás?"
              maxLength={40}
              className="mt-2 min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]/60"
            />
          </div>

          {submitError && (
            <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {submitError}
            </p>
          )}

          {cooldownSecs > 0 ? (
            <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Esperá {cooldownSecs}s antes de proponer otro tema.
            </p>
          ) : (
            <button
              type="button"
              disabled={submitting || !proposerName.trim()}
              onClick={handlePropose}
              className="neon-button mt-4 w-full rounded-[20px] py-3 text-sm font-semibold text-[#07130a] disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Proponer tema"}
            </button>
          )}
        </section>
      )}
    </>
  );
}
