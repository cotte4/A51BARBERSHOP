"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import AlienSignalPanel from "@/components/branding/AlienSignalPanel";
import type { ClientSummary } from "@/lib/types";
import ClientCard from "@/components/clientes/ClientCard";

type ClientSearchProps = {
  initialClients: ClientSummary[];
  allClients: ClientSummary[];
  totalClients: number;
  recentCount: number;
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClientCardSkeleton() {
  return (
    <article className="panel-card animate-pulse rounded-[28px] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="size-14 rounded-full bg-white/6" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-1/2 rounded-full bg-white/8" />
          <div className="h-3 w-2/3 rounded-full bg-white/6" />
          <div className="h-3 w-3/4 rounded-full bg-white/6" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-10 rounded-xl bg-white/6" />
        <div className="h-10 rounded-xl bg-white/6" />
        <div className="h-10 rounded-xl bg-white/6" />
      </div>
    </article>
  );
}

export default function ClientSearch({
  initialClients,
  allClients,
  totalClients,
  recentCount,
}: ClientSearchProps) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"recent" | "all">("recent");
  const [clients, setClients] = useState(initialClients);
  const [isLoading, setIsLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const requestIdRef = useRef(0);

  const baseClients = useMemo(
    () => (view === "recent" ? initialClients : allClients),
    [allClients, initialClients, view]
  );
  const queryTerm = deferredQuery.trim();
  const isSearching = queryTerm.length > 0;
  const sourceLabel = view === "recent" ? "recientes" : "base completa";
  const visibleCount = clients.length;

  useEffect(() => {
    if (queryTerm === "") {
      requestIdRef.current += 1;
      setClients(baseClients);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/clients/search?q=${encodeURIComponent(queryTerm)}`, {
          signal: controller.signal,
        });

        if (!response.ok || requestIdRef.current !== requestId) {
          return;
        }

        const data = (await response.json()) as { clients: ClientSummary[] };
        setClients(data.clients);
      } catch {
        // Keep the previous result set if the search request fails or is aborted.
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [baseClients, queryTerm]);

  return (
    <section className="space-y-4">
      <div className="panel-card rounded-[28px] p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow text-[11px] font-semibold">Buscador</p>
            <h2 className="font-display mt-2 text-2xl font-semibold text-white sm:text-[2rem]">
              Busqueda rapida para leer al cliente y saltar a la accion.
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {queryTerm
                ? `Mostrando ${visibleCount} resultado${visibleCount === 1 ? "" : "s"} en ${sourceLabel}.`
                : `Arrancas con ${recentCount} recientes y puedes abrir ${totalClients} clientes totales.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("recent")}
              aria-pressed={view === "recent"}
              className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold ${
                view === "recent"
                  ? "bg-[#8cff59] text-[#07130a]"
                  : "border border-white/10 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              Recientes
            </button>
            <button
              type="button"
              onClick={() => setView("all")}
              aria-pressed={view === "all"}
              className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold ${
                view === "all"
                  ? "bg-[#8cff59] text-[#07130a]"
                  : "border border-white/10 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              Ver todos
            </button>
            <Link
              href="/clientes/nuevo"
              className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold"
            >
              + Nuevo cliente
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/6 bg-white/[0.03] p-3 text-sm text-zinc-400">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Modo
            </span>
            <span className="mt-1 block text-white">{sourceLabel}</span>
          </div>
          <div className="rounded-[22px] border border-white/6 bg-white/[0.03] p-3 text-sm text-zinc-400">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Resultado
            </span>
            <span className="mt-1 block text-white">
              {visibleCount} cliente{visibleCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="rounded-[22px] border border-white/6 bg-white/[0.03] p-3 text-sm text-zinc-400">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Accion
            </span>
            <span className="mt-1 block text-white">Perfil, turno y cobro en un toque</span>
          </div>
        </div>

        <div className="mt-4">
          <AlienSignalPanel
            eyebrow="Lectura de radar"
            title="Busqueda en orbita"
            detail="Escaneas por nombre o telefono y saltas directo a perfil, cobro o agenda sin perder la coordenada del cliente."
            badges={[
              view === "recent" ? "modo recientes" : "base completa",
              `${visibleCount} visibles`,
              queryTerm ? "filtro activo" : "sin filtro",
            ]}
          />
        </div>

        <div className="relative mt-5">
          <SearchIcon />
          <input
            id="client-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Ej: Juan o 11 5555 1234"
            className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/70 py-3 pl-10 pr-24 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              Limpiar
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
            Buscar por nombre o telefono
          </span>
          {isSearching ? (
            <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-3 py-1 text-[#b6ff84]">
              Filtro activo
            </span>
          ) : null}
          {isLoading ? (
            <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-3 py-1 text-[#b6ff84]">
              Buscando...
            </span>
          ) : null}
        </div>
      </div>

      <div aria-live="polite" aria-busy={isLoading} className="space-y-3">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ClientCardSkeleton key={index} />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="panel-soft rounded-[28px] p-8 text-center">
            <p className="eyebrow text-[11px] font-semibold">Sin resultados</p>
            <h3 className="font-display mt-3 text-2xl font-semibold text-white">
              El radar no detecto esa senal.
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">
              Proba con otro nombre, un telefono o cambia la orbita a la base completa para ampliar el escaneo.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setQuery("")}
                className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold"
              >
                Limpiar busqueda
              </button>
              <button
                type="button"
                onClick={() => setView("all")}
                className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold"
              >
                Ver toda la base
              </button>
              <Link
                href="/clientes/nuevo"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 hover:text-white"
              >
                Crear cliente
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
