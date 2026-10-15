"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PedidoCliente } from "@/lib/jukebox-pedido";
import { usarMovimientoReducido } from "../torneo/_movimiento";
import Disco from "./_Disco";

gsap.registerPlugin(useGSAP);

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
  nowPlaying: { videoTitle: string; proposedByName: string; thumbnailUrl: string | null } | null;
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
  // El código de tecla ("B3") del tema elegido: lo acompaña hasta la pantalla de "puesto".
  const [codigo, setCodigo] = useState<string | null>(null);
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
    setCodigo(null);

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

  const tuTema = miPedido ? <TuTema pedido={miPedido} /> : null;

  if (submitted) {
    return (
      <>
        <Puesto tema={selected} codigo={codigo} autoAprobado={autoApproved} />
        {tuTema}
        <section className="jukebox-motion">
          {cooldownSecs > 0 ? (
            <Espera segundos={cooldownSecs} />
          ) : (
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSelected(null);
                setCodigo(null);
                setProposerName("");
                setResults([]);
                setQuery("");
              }}
              className="ghost-button pop-in min-h-12 w-full rounded-[20px] text-sm font-semibold active:scale-[0.98]"
            >
              Poner otro tema
            </button>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      <Maquina ahora={ahora} />
      {tuTema}

      {!selected ? (
        <section className="jukebox-motion panel-card rounded-[28px] p-5">
          <h1 className="font-display text-2xl font-semibold text-white">Elegí tu tema</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Buscalo y pedilo. Si lo aprueban, suena en el local.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="mt-4 flex gap-2"
            role="search"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Artista o canción"
              aria-label="Artista o canción"
              enterKeyHint="search"
              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]/60"
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

          {/* Las teclas de la máquina: un toque busca el género. */}
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                disabled={searching}
                aria-pressed={query === genre}
                onClick={() => {
                  setQuery(genre);
                  handleSearch(genre);
                }}
                className={`min-h-12 truncate rounded-xl border px-0.5 text-xs font-semibold transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.95] disabled:opacity-50 ${
                  query === genre
                    ? "border-[#8cff59]/70 bg-[#8cff59]/15 text-[#d8ffc7] shadow-[inset_0_-3px_0_rgba(140,255,89,0.35)]"
                    : "border-zinc-800 bg-zinc-900/80 text-zinc-300 shadow-[inset_0_-3px_0_rgba(0,0,0,0.45)]"
                }`}
              >
                {genre === "Electrónica" ? "Electro" : genre}
              </button>
            ))}
          </div>

          {searchError && (
            <p
              role="alert"
              className="pop-in mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {searchError}
            </p>
          )}
        </section>
      ) : null}

      {searching && (
        <section className="jukebox-motion panel-card rounded-[28px] p-4" aria-busy="true" aria-label="Buscando temas">
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="skeleton h-6 w-8 shrink-0 rounded-md" />
                <div className="skeleton h-12 w-12 shrink-0 rounded-lg" />
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
        <section className="jukebox-motion panel-card rounded-[28px] p-4">
          <p className="px-1 text-sm text-zinc-400">Tocá el tuyo.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {results.map((r, i) => (
              <li key={r.videoId}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setCodigo(codigoDe(i));
                  }}
                  className="pop-in flex min-h-16 w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-2.5 text-left transition-[transform,border-color] duration-150 ease-out active:scale-[0.98] active:border-[#8cff59]/50"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <span className="w-8 shrink-0 text-center font-mono text-sm font-bold text-[#8cff59]">{codigoDe(i)}</span>
                  {r.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumbnailUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">{r.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">{r.channelTitle}</span>
                  </span>
                  {r.durationSeconds && (
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">{formatDuration(r.durationSeconds)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && (
        <section className="jukebox-motion pop-in panel-card rounded-[28px] p-5">
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setCodigo(null);
            }}
            className="-ml-2 -mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm text-zinc-400 hover:text-white active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Elegir otro
          </button>

          {/* La tapa con el disco asomando: lo que va a entrar a la máquina. */}
          <div className="mt-2 flex justify-center">
            <div className="relative h-[150px] w-[230px]">
              <Disco tamano={140} etiqueta={selected.thumbnailUrl || null} className="absolute left-[85px] top-[5px]" />
              <Tapa url={selected.thumbnailUrl} className="absolute left-0 top-0 h-[150px] w-[150px]" />
            </div>
          </div>

          <div className="mt-4 text-center">
            {codigo ? <p className="font-mono text-xs font-bold tracking-[0.25em] text-[#8cff59]">{codigo}</p> : null}
            <p className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-white">{selected.title}</p>
            <p className="mt-0.5 truncate text-sm text-zinc-400">{selected.channelTitle}</p>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300" htmlFor="proposer-name">
              Tu nombre o apodo
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
              className="mt-2 min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]/60"
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
                  Poniendo…
                </>
              ) : (
                "Poner mi tema"
              )}
            </button>
          )}
        </section>
      )}
    </>
  );
}

/** "A1", "A2"… como las teclas de una jukebox: 4 por letra. */
function codigoDe(indice: number): string {
  return `${"ABCDEFGHIJ"[Math.floor(indice / 4)] ?? "Z"}${(indice % 4) + 1}`;
}

/** La tapa del disco: la miniatura del video, o un cuadrado verde si no hay. */
function Tapa({ url, className = "" }: { url: string | null; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-md border border-white/10 bg-[#8cff59] shadow-[0_14px_30px_rgba(0,0,0,0.6)] ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display flex h-full w-full items-center justify-center text-3xl font-bold text-[#07130a]">A51</span>
      )}
    </div>
  );
}

/** Arriba de todo: la máquina con lo que suena. El disco gira y el brazo baja solo si hay un tema sonando. */
function Maquina({ ahora }: { ahora: AhoraSonando | null }) {
  const suena = ahora?.nowPlaying ?? null;
  return (
    <section
      className="jukebox-motion relative overflow-hidden rounded-b-[28px] rounded-t-[180px] border border-[#8cff59]/30 px-5 pb-5 pt-12 shadow-[0_0_60px_rgba(140,255,89,0.08)]"
      style={{ background: "radial-gradient(90% 70% at 50% 30%, rgba(140,255,89,0.10), rgba(9,9,11,0.95) 70%)" }}
      aria-live="polite"
    >
      {/* El arco de neón de adentro: es lo que hace que se lea como una jukebox y no como una tarjeta. */}
      <span
        className="pointer-events-none absolute inset-x-3 top-3 bottom-[45%] rounded-t-[170px] border border-b-0 border-[#8cff59]/20"
        aria-hidden="true"
      />
      <div className="flex justify-center">
        <Disco tamano={196} etiqueta={suena?.thumbnailUrl ?? null} girando={!!suena} brazoAbajo={!!suena} />
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 shadow-[inset_0_0_20px_rgba(140,255,89,0.06)]">
        {ahora === null ? (
          <div className="space-y-2" aria-busy="true">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-3 w-4/5 rounded-full" />
          </div>
        ) : suena ? (
          <>
            <div className="flex items-center gap-2">
              <Ecualizador />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#8cff59]">Suena ahora</p>
            </div>
            <p key={suena.videoTitle} className="pop-in mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-white">
              {suena.videoTitle}
            </p>
            {ahora.upcoming[0] ? <p className="mt-1 truncate text-xs text-zinc-500">Sigue: {ahora.upcoming[0].videoTitle}</p> : null}
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">En silencio</p>
            <p className="mt-1.5 text-sm font-semibold text-white">Poné el primer tema.</p>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * La mística: el disco sale de la tapa, la tapa se va, el disco queda solo, baja la aguja y arranca a girar.
 * Se ve una vez por pedido, así que puede durar (~2,5 s). Con movimiento reducido aparece ya puesto.
 */
function Puesto({ tema, codigo, autoAprobado }: { tema: SearchResult | null; codigo: string | null; autoAprobado: boolean }) {
  const raiz = useRef<HTMLDivElement>(null);
  const quieto = usarMovimientoReducido();
  const [agujaAbajo, setAgujaAbajo] = useState(false);

  useGSAP(
    () => {
      const q = gsap.utils.selector(raiz);
      if (quieto) {
        gsap.set(q(".tapa"), { autoAlpha: 0 });
        gsap.set(q(".texto"), { autoAlpha: 1 });
        setAgujaAbajo(true);
        return;
      }
      const vinilo = q(".vinilo");
      const giro = gsap.to(vinilo, { rotation: "+=360", duration: 1.8, ease: "none", repeat: -1, paused: true });

      gsap
        .timeline({ delay: 0.25 })
        .fromTo(q(".tapa"), { autoAlpha: 0, y: 30, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" })
        .fromTo(q(".disco"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, "<")
        // Sale de la tapa hacia la derecha…
        .to(q(".disco"), { x: 64, duration: 0.6, ease: "power2.out" }, "+=0.15")
        // …la tapa se va y el disco vuelve al centro, solo.
        .to(q(".tapa"), { x: -70, autoAlpha: 0, rotation: -8, duration: 0.45, ease: "power2.in" }, "+=0.05")
        .to(q(".disco"), { x: 0, scale: 1.08, duration: 0.6, ease: "power3.inOut" }, "<0.1")
        .call(() => setAgujaAbajo(true), [], "+=0.05")
        // La aguja tarda 0,7 s en bajar (transición del brazo): recién ahí arranca, acelerando como un plato.
        .call(
          () => {
            giro.play();
            gsap.fromTo(giro, { timeScale: 0 }, { timeScale: 1, duration: 1.2, ease: "power2.in" });
          },
          [],
          "+=0.6",
        )
        .fromTo(q(".halo"), { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out" }, "<")
        .fromTo(q(".texto"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power3.out" }, "<0.2");

      return () => giro.kill();
    },
    { scope: raiz, dependencies: [quieto] },
  );

  const etiqueta = tema?.thumbnailUrl || null;
  return (
    <section
      ref={raiz}
      className="jukebox-motion relative overflow-hidden rounded-[28px] border border-[#8cff59]/30 px-5 pb-6 pt-8 text-center"
      style={{ background: "radial-gradient(80% 60% at 50% 35%, rgba(140,255,89,0.12), rgba(9,9,11,0.96) 70%)" }}
      aria-live="polite"
    >
      <div className="relative mx-auto h-[220px] w-[220px]">
        <span
          className="halo pointer-events-none absolute -inset-6 rounded-full opacity-0"
          style={{ background: "radial-gradient(circle, rgba(140,255,89,0.28), transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="disco absolute inset-[10px] opacity-0">
          <Disco tamano={200} etiqueta={etiqueta} brazoAbajo={agujaAbajo} />
        </div>
        <Tapa url={tema?.thumbnailUrl ?? null} className="tapa absolute inset-[10px] opacity-0" />
      </div>

      <p className="texto mt-5 font-mono text-xs font-bold tracking-[0.25em] text-[#8cff59] opacity-0">
        {codigo ? `${codigo} · ` : ""}
        {autoAprobado ? "En la cola" : "Pedido"}
      </p>
      <h2 className="texto font-display mt-2 text-2xl font-semibold text-white opacity-0">
        {autoAprobado ? "Tu tema ya está en la cola" : "Tu tema está pedido"}
      </h2>
      {tema ? <p className="texto mt-2 line-clamp-2 text-sm text-zinc-300 opacity-0">{tema.title}</p> : null}
      <p className="texto mt-2 text-sm text-zinc-500 opacity-0">
        {autoAprobado ? "Va a sonar pronto." : "Si lo aprueban, suena pronto."}
      </p>
    </section>
  );
}

/** Seguimiento del pedido: en revisión → en la cola → sonando. */
function TuTema({ pedido }: { pedido: PedidoCliente }) {
  const activo = pedido.estado === "en_cola" || pedido.estado === "sonando";
  const paso = PASO_ACTUAL[pedido.estado];
  return (
    <section
      className={`jukebox-motion pop-in panel-card rounded-[22px] px-4 py-4 ${
        pedido.estado === "sonando" ? "border-[#8cff59]/40 shadow-[0_0_32px_rgba(140,255,89,0.12)]" : ""
      }`}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Tu tema</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{pedido.videoTitle}</p>
      {/* key: al cambiar de estado (o de lugar) la línea entra de nuevo, así se nota el avance. */}
      <p
        key={`${pedido.estado}-${pedido.lugar ?? ""}`}
        className={`pop-in mt-1.5 flex items-center gap-2 text-sm ${activo ? "text-[#8cff59]" : "text-zinc-300"}`}
      >
        {pedido.estado === "sonando" ? (
          <Ecualizador />
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${PUNTO_PEDIDO[pedido.estado]}`} aria-hidden="true" />
        )}
        {textoPedido(pedido)}
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
  );
}
