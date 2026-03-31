"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ClientSummary } from "@/lib/types";
import ClientCard from "@/components/clientes/ClientCard";

type ClientSearchProps = {
  initialClients: ClientSummary[];
  allClients: ClientSummary[];
};

export default function ClientSearch({ initialClients, allClients }: ClientSearchProps) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"recent" | "all">("recent");
  const [clients, setClients] = useState(initialClients);
  const [isLoading, setIsLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const baseClients = useMemo(
    () => (view === "recent" ? initialClients : allClients),
    [allClients, initialClients, view]
  );

  useEffect(() => {
    if (deferredQuery.trim() === "") {
      setClients(baseClients);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/clients/search?q=${encodeURIComponent(deferredQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { clients: ClientSummary[] };
        setClients(data.clients);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [baseClients, deferredQuery]);

  return (
    <section className="space-y-4">
      <div className="panel-card rounded-[26px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <label htmlFor="client-search" className="block text-sm font-medium text-zinc-300">
              Buscar por nombre o telefono
            </label>
            <p className="mt-1 text-sm text-zinc-500">Primero ves los recientes, pero puedes abrir toda la base cuando quieras.</p>
          </div>
          <Link href="/clientes/nuevo" className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold">
            + Nuevo cliente
          </Link>
        </div>

        <input
          id="client-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder="Ej: Juan o 11 5555 1234"
          className="mt-4 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 text-sm text-zinc-100 outline-none transition focus:border-[#8cff59]"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("recent")}
            className={`inline-flex min-h-[42px] items-center rounded-full px-4 text-sm font-semibold ${
              view === "recent" ? "bg-[#8cff59] text-[#07130a]" : "bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            Recientes
          </button>
          <button
            type="button"
            onClick={() => setView("all")}
            className={`inline-flex min-h-[42px] items-center rounded-full px-4 text-sm font-semibold ${
              view === "all" ? "bg-[#8cff59] text-[#07130a]" : "bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            Ver todos
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-zinc-400">Buscando clientes...</p> : null}

      <div className="space-y-3">
        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/30 p-8 text-center text-sm text-zinc-400">
            No encontre clientes con ese criterio.
          </div>
        ) : (
          clients.map((client) => <ClientCard key={client.id} client={client} />)
        )}
      </div>
    </section>
  );
}
