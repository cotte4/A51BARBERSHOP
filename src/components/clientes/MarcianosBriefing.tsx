"use client";

import { useState, useTransition } from "react";

type MarcianosBriefingProps = {
  clientId: string;
};

export default function MarcianosBriefing({ clientId }: MarcianosBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadBriefing() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/briefing`, { method: "POST" });
        const data = (await res.json()) as { briefing?: string; cached?: boolean; error?: string };

        if (!res.ok || data.error) {
          setError(data.error ?? "No se pudo generar el briefing.");
          return;
        }

        setBriefing(data.briefing ?? null);
        setCached(data.cached ?? false);
      } catch {
        setError("Error de conexión. Verificá tu red e intentá de nuevo.");
      }
    });
  }

  if (!briefing) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Briefing IA</h2>
        <p className="mt-2 text-sm text-gray-500">
          Resumen del cliente antes del corte, generado por IA.
        </p>

        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}

        <button
          onClick={loadBriefing}
          disabled={isPending}
          className="mt-4 h-11 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Generando…" : "Ver briefing"}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Briefing IA</h2>
        <div className="flex items-center gap-2">
          {cached ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
              desde caché
            </span>
          ) : null}
          <button
            onClick={() => {
              setBriefing(null);
              loadBriefing();
            }}
            disabled={isPending}
            className="text-xs text-gray-500 underline disabled:opacity-50"
          >
            Regenerar
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{briefing}</p>
    </section>
  );
}
