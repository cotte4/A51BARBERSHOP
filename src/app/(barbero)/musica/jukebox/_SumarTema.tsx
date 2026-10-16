"use client";

import { useState, useTransition } from "react";
import type { TemaCatalogo } from "@/lib/spotify-catalogo";
import { buscarTemasStaffAction, sumarTemaStaffAction } from "./actions";

/**
 * Pinky como DJ: busca en Spotify y suma directo, sin aprobación ni espera.
 * "Que siga" lo pone primero de lo que espera; "Al final" lo deja atrás de lo que ya pidió la gente.
 */
export default function SumarTema({ alSumar }: { alSumar: (mensaje: string) => void }) {
  const [q, setQ] = useState("");
  const [temas, setTemas] = useState<TemaCatalogo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, startBusqueda] = useTransition();
  const [sumando, setSumando] = useState<string | null>(null);
  const [sumados, setSumados] = useState<Set<string>>(() => new Set());

  function buscar() {
    if (q.trim().length < 2) return;
    setError(null);
    startBusqueda(async () => {
      const r = await buscarTemasStaffAction(q);
      if (r.error) setError(r.error);
      setTemas(r.temas ?? []);
    });
  }

  async function sumar(tema: TemaCatalogo, alFrente: boolean) {
    setSumando(`${tema.id}-${alFrente ? "frente" : "final"}`);
    setError(null);
    const r = await sumarTemaStaffAction(tema.id, alFrente);
    setSumando(null);
    if (r.error) {
      setError(r.error);
      return;
    }
    setSumados((s) => new Set(s).add(tema.id));
    alSumar(alFrente ? `"${tema.nombre}" suena a continuación.` : `"${tema.nombre}" quedó en la cola.`);
  }

  function limpiar() {
    setQ("");
    setTemas(null);
    setError(null);
  }

  return (
    <section className="panel-card rounded-[28px] p-5">
      <h2 className="font-display text-xl font-semibold text-white">Sumar un tema</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar();
        }}
        className="mt-3 flex gap-2"
        role="search"
      >
        <div className="relative min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Artista o canción"
            aria-label="Buscar un tema para sumar"
            enterKeyHint="search"
            className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 pl-4 pr-11 text-base text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]/60"
          />
          {q ? (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Borrar búsqueda"
              className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-zinc-500 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={buscando || q.trim().length < 2}
          className="neon-button min-h-12 min-w-[92px] rounded-[20px] px-4 text-sm font-semibold text-[#07130a] active:scale-[0.97] disabled:opacity-60"
        >
          {buscando ? "…" : "Buscar"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {temas && temas.length === 0 && !buscando && !error ? (
        <p className="mt-3 text-sm text-zinc-400">No encontré nada con eso.</p>
      ) : null}

      {temas && temas.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2" aria-busy={buscando}>
          {temas.map((t) => {
            const sumado = sumados.has(t.id);
            return (
              <li key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2.5">
                <div className="flex items-center gap-3">
                  {t.tapa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.tapa} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-lg bg-zinc-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{t.nombre}</p>
                    <p className="truncate text-xs text-zinc-500">{t.artistas}</p>
                  </div>
                </div>
                {sumado ? (
                  <p className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#8cff59]/10 text-sm font-semibold text-[#8cff59]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    En la cola
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={sumando !== null}
                      onClick={() => sumar(t, true)}
                      className="min-h-11 rounded-xl border border-[#8cff59]/35 bg-[#8cff59]/10 text-sm font-semibold text-[#d8ffc7] transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
                    >
                      {sumando === `${t.id}-frente` ? "Sumando…" : "Que siga"}
                    </button>
                    <button
                      type="button"
                      disabled={sumando !== null}
                      onClick={() => sumar(t, false)}
                      className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-300 transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
                    >
                      {sumando === `${t.id}-final` ? "Sumando…" : "Al final"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
