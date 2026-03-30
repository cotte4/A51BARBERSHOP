"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { ClientSummary } from "@/lib/types";
import ClientCard from "@/components/clientes/ClientCard";

type ClientSearchProps = {
  initialClients: ClientSummary[];
};

export default function ClientSearch({ initialClients }: ClientSearchProps) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState(initialClients);
  const [isLoading, setIsLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
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
  }, [deferredQuery]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label htmlFor="client-search" className="mb-2 block text-sm font-medium text-gray-700">
          Buscar por nombre o teléfono
        </label>
        <input
          id="client-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder="Ej: Juan o 11 5555 1234"
          className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-gray-900"
        />
      </div>

      {isLoading ? <p className="text-sm text-gray-500">Buscando clientes…</p> : null}

      <div className="space-y-3">
        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            No encontré clientes con ese criterio.
          </div>
        ) : (
          clients.map((client) => <ClientCard key={client.id} client={client} />)
        )}
      </div>
    </section>
  );
}
