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

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#8cff59]/20 bg-zinc-900">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8cff59]" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Briefing IA</p>
        </div>
        {briefing ? (
          <div className="flex items-center gap-3">
            {cached ? (
              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
                caché
              </span>
            ) : null}
            <button
              onClick={() => { setBriefing(null); loadBriefing(); }}
              disabled={isPending}
              className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
            >
              Regenerar
            </button>
          </div>
        ) : null}
      </div>

      <div className="px-5 py-4">
        {!briefing ? (
          <>
            <p className="text-sm text-zinc-500">
              Resumen del cliente antes del corte, generado por IA.
            </p>
            {error ? (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            ) : null}
            <button
              onClick={loadBriefing}
              disabled={isPending}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#8cff59]/10 border border-[#8cff59]/20 px-4 text-sm font-semibold text-[#8cff59] hover:bg-[#8cff59]/20 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-[#8cff59] border-t-transparent" />
                  Generando…
                </>
              ) : "Ver briefing"}
            </button>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{briefing}</p>
        )}
      </div>
    </section>
  );
}
