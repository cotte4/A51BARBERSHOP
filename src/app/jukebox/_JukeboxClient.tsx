"use client";

import { useEffect, useRef, useState } from "react";
import type { PedidoCliente } from "@/lib/jukebox-pedido";

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

type AhoraSonando = {
  nowPlaying: { videoTitle: string; proposedByName: string } | null;
  upcoming: { videoTitle: string }[];
};

function formatCooldown(secs: number): string {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
}

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

// La marca del cooldown queda guardada tras proponer: sirve para saber si hay un pedido que seguir.
function yaPropuso(): boolean {
  return localStorage.getItem(COOLDOWN_STORAGE) !== null;
}

const PUNTO_PEDIDO: Record<PedidoCliente["estado"], string> = {
  en_revision: "bg-zinc-400",
  en_cola: "bg-[#8cff59]",
  sonando: "animate-pulse bg-[#8cff59]",
  ya_sono: "bg-zinc-600",
  no_entro: "bg-zinc-600",
};

function textoPedido(pedido: PedidoCliente): string {
  switch (pedido.estado) {
    case "en_revision":
      return "Esperando que Pinky lo apruebe";
    case "en_cola":
      return pedido.lugar ? `En la cola, lugar ${pedido.lugar}` : "En la cola, sale ahora";
    case "sonando":
      return "Está sonando ahora";
    case "ya_sono":
      return "Ya sonó";
    case "no_entro":
      return "No entró a la cola";
  }
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

// Pasos que ve el cliente; "no_entro" no tiene paso (se muestra solo el texto).
const PASOS = ["Enviado", "En la cola", "Sonando"] as const;
const PASO_ACTUAL: Record<PedidoCliente["estado"], number> = {
  en_revision: 0,
  en_cola: 1,
  sonando: 2,
  ya_sono: 3,
  no_entro: -1,
};

const ALTURAS_EQ = ["h-3", "h-4", "h-2.5", "h-3.5"] as const;

/** Barritas de ecualizador: dicen "esto está sonando" sin leer. Quietas con movimiento reducido. */
function Ecualizador() {
  return (
    <span className="inline-flex h-4 shrink-0 items-end gap-[3px]" aria-hidden="true">
      {ALTURAS_EQ.map((alto, i) => (
        <span
          key={i}
          className={`eq-bar w-[3px] rounded-full bg-[#8cff59] ${alto}`}
          style={{ animationDelay: `${i * 0.13}s`, animationDuration: `${0.8 + i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-current border-t-transparent"
      style={{ animation: "a51-spin 0.7s linear infinite" }}
      aria-hidden="true"
    />
  );
}

/** Barra que se vacía mientras corre la espera para proponer otro tema. */
function Espera({ segundos }: { segundos: number }) {
  return (
    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left" role="status">
      <p className="text-sm text-amber-200">
        Podés proponer otro tema en <span className="font-semibold tabular-nums">{formatCooldown(segundos)}</span>.
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-amber-500/15">
        <div
          className="h-full origin-left rounded-full bg-amber-300/70 transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${Math.min(1, segundos / (COOLDOWN_MS / 1000))})` }}
        />
      </div>
    </div>
  );
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
  // Sube con cada error para re-disparar el "shake" aunque el texto sea el mismo.
  const [intentoFallido, setIntentoFallido] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);

  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [ahora, setAhora] = useState<AhoraSonando | null>(null);
  // Cambia con cada pedido para consultar al toque, sin esperar los 10 s.
  const [pedidosHechos, setPedidosHechos] = useState(0);
  const [miPedido, setMiPedido] = useState<PedidoCliente | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isInCooldown()) setCooldownSecs(cooldownRemaining());
    if (yaPropuso()) setPedidosHechos(1);
  }, []);

  useEffect(() => {
    if (pedidosHechos === 0) return;
    let vivo = true;
    const deviceKey = getOrCreateDeviceKey();
    const consultar = async () => {
      try {
        const res = await fetch(`/api/jukebox/mine?deviceKey=${encodeURIComponent(deviceKey)}`, {
          cache: "no-store",
        });
        if (res.ok && vivo) setMiPedido(((await res.json()) as { pedido: PedidoCliente | null }).pedido);
      } catch {
        // sin conexión un momento: queda lo último que se vio
      }
    };
    void consultar();
    const timer = setInterval(consultar, 10_000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [pedidosHechos]);

  useEffect(() => {
    let vivo = true;
    const consultar = async () => {
      try {
        const res = await fetch("/api/jukebox/now", { cache: "no-store" });
        if (res.ok && vivo) setAhora((await res.json()) as AhoraSonando);
      } catch {
        // sin conexión un momento: queda lo último que se vio
      }
    };
    void consultar();
    const timer = setInterval(consultar, 10_000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
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
    if (cooldownSecs > 0 || submitting) return;

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
      setPedidosHechos((n) => n + 1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo enviar la propuesta.");
      setIntentoFallido((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  const sonando = ahora?.nowPlaying ? (
    <section
      className="jukebox-motion pop-in rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/8 px-4 py-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Ecualizador />
        <p className="eyebrow text-xs font-semibold text-[#8cff59]">Suena ahora</p>
      </div>
      <p key={ahora.nowPlaying.videoTitle} className="pop-in mt-1.5 truncate text-sm font-semibold text-white">
        {ahora.nowPlaying.videoTitle}
      </p>
      {ahora.upcoming[0] ? (
        <p className="mt-0.5 truncate text-xs text-zinc-400">Sigue: {ahora.upcoming[0].videoTitle}</p>
      ) : null}
    </section>
  ) : null;

  const activo = miPedido?.estado === "en_cola" || miPedido?.estado === "sonando";
  const paso = miPedido ? PASO_ACTUAL[miPedido.estado] : -1;
  const tuTema = miPedido ? (
    <section
      className={`jukebox-motion pop-in panel-card rounded-[22px] px-4 py-4 ${
        miPedido.estado === "sonando" ? "border-[#8cff59]/40 shadow-[0_0_32px_rgba(140,255,89,0.12)]" : ""
      }`}
      aria-live="polite"
    >
      <p className="eyebrow text-sm font-semibold text-zinc-400">Tu tema</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{miPedido.videoTitle}</p>
      {/* key: al cambiar de estado (o de lugar) la línea entra de nuevo, así se nota el avance. */}
      <p
        key={`${miPedido.estado}-${miPedido.lugar ?? ""}`}
        className={`pop-in mt-1.5 flex items-center gap-2 text-sm ${activo ? "text-[#8cff59]" : "text-zinc-300"}`}
      >
        {miPedido.estado === "sonando" ? (
          <Ecualizador />
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${PUNTO_PEDIDO[miPedido.estado]}`} aria-hidden="true" />
        )}
        {textoPedido(miPedido)}
      </p>
      {paso >= 0 ? (
        <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label="Avance de tu tema">
          {PASOS.map((nombre, i) => {
            const hecho = i <= paso;
            return (
              <li key={nombre} className="min-w-0">
                <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full origin-left rounded-full bg-[#8cff59] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                      hecho ? "scale-x-100" : "scale-x-0"
                    }`}
                    style={{ transitionDelay: `${i * 120}ms` }}
                  />
                </div>
                <p className={`mt-1 truncate text-[11px] ${hecho ? "text-zinc-200" : "text-zinc-500"}`}>{nombre}</p>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  ) : null;

  if (submitted) {
    return (
      <>
      {sonando}
      {tuTema}
      <section className="jukebox-motion pop-in panel-card rounded-[28px] p-6 text-center">
        <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
          <span className="ring-pulse absolute inset-0 rounded-full border border-[#8cff59]/50" aria-hidden="true" />
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#8cff59]" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path className="check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
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
        {cooldownSecs > 0 ? (
          <Espera segundos={cooldownSecs} />
        ) : (
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setSelected(null);
              setProposerName("");
              setResults([]);
              setQuery("");
            }}
            className="ghost-button pop-in mt-5 min-h-12 w-full rounded-[20px] text-sm font-semibold active:scale-[0.98]"
          >
            Proponer otra
          </button>
        )}
      </section>
      </>
    );
  }

  return (
    <>
      {sonando}
      {tuTema}
      <section className="jukebox-motion panel-card rounded-[28px] p-5">
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
              aria-pressed={query === genre}
              onClick={() => { setQuery(genre); handleSearch(genre); }}
              className={`min-h-12 rounded-full border px-4 text-sm font-medium active:scale-[0.96] disabled:opacity-50 ${
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
          role="search"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá artista o canción..."
            aria-label="Artista o canción"
            enterKeyHint="search"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]/60"
          />
          <button
            type="submit"
            disabled={searching}
            className="neon-button inline-flex min-h-12 min-w-[96px] items-center justify-center gap-2 rounded-[20px] px-5 text-sm font-semibold text-[#07130a] active:scale-[0.97] disabled:opacity-70"
          >
            {searching ? (
              <>
                <Spinner />
                <span className="sr-only">Buscando</span>
              </>
            ) : (
              "Buscar"
            )}
          </button>
        </form>

        {searchError && (
          <p
            role="alert"
            className="pop-in mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {searchError}
          </p>
        )}
      </section>

      {searching && (
        <section className="jukebox-motion panel-card rounded-[28px] p-5" aria-busy="true" aria-label="Buscando temas">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="mt-4 flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="skeleton h-14 w-14 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-4/5 rounded-full" />
                  <div className="skeleton h-3 w-2/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && !selected && (
        <section className="jukebox-motion panel-card rounded-[28px] p-5">
          <p className="eyebrow text-zinc-500">{results.length} resultados</p>
          <p className="mt-1 text-xs text-zinc-500">Tocá el que querés pedir.</p>
          <div className="mt-4 flex flex-col gap-2">
            {results.map((r, i) => (
              <button
                key={r.videoId}
                type="button"
                onClick={() => setSelected(r)}
                className="pop-in flex min-h-12 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-left hover:border-[#8cff59]/30 hover:bg-zinc-900 active:scale-[0.98] active:border-[#8cff59]/50"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                {r.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbnailUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{r.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">{r.channelTitle}</p>
                </div>
                {r.durationSeconds && (
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {formatDuration(r.durationSeconds)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <section className="jukebox-motion pop-in panel-card rounded-[28px] p-5">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Volver a los resultados"
              className="-ml-3 -mt-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white active:scale-[0.94]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {selected.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0">
                <p className="eyebrow text-zinc-500">Elegiste</p>
                <p className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-white">{selected.title}</p>
                <p className="truncate text-sm text-zinc-400">{selected.channelTitle}</p>
              </div>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handlePropose();
                }
              }}
              placeholder="¿Cómo te llamás?"
              maxLength={40}
              enterKeyHint="send"
              autoComplete="nickname"
              className="mt-2 min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]/60"
            />
          </div>

          {submitError && (
            <p
              key={intentoFallido}
              role="alert"
              className="shake mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {submitError}
            </p>
          )}

          {cooldownSecs > 0 ? (
            <Espera segundos={cooldownSecs} />
          ) : (
            <button
              type="button"
              disabled={submitting || !proposerName.trim()}
              onClick={handlePropose}
              className="neon-button mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] text-base font-semibold text-[#07130a] active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Spinner />
                  Enviando…
                </>
              ) : (
                "Proponer tema"
              )}
            </button>
          )}
        </section>
      )}
    </>
  );
}
