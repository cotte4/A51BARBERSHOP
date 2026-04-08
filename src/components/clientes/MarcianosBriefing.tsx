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
        setError("Error de conexion. Verifica tu red e intenta de nuevo.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#8cff59]/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8cff59]" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Briefing IA</p>
        </div>
        {briefing ? (
          <div className="flex items-center gap-3">
            {cached ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-500">
                cache
              </span>
            ) : null}
            <button
              onClick={() => {
                setBriefing(null);
                loadBriefing();
              }}
              disabled={isPending}
              className="text-xs text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
            >
              Regenerar
            </button>
          </div>
        ) : null}
      </div>

      <div className="px-5 py-4">
        {!briefing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-zinc-300">
                Resumen operativo antes de arrancar el corte.
              </p>
              <div className="grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                  Ultima visita, notas y tono del cliente.
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                  Preferencias, alertas y contexto rapido.
                </div>
              </div>
            </div>

            {error ? <p className="text-xs text-red-400">{error}</p> : null}

            <button
              onClick={loadBriefing}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#8cff59]/20 bg-[#8cff59]/10 px-4 text-sm font-semibold text-[#8cff59] transition hover:bg-[#8cff59]/20 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-[#8cff59] border-t-transparent" />
                  Generando...
                </>
              ) : (
                "Ver briefing"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                listo para barbero
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{briefing}</p>
          </div>
        )}
      </div>
    </section>
  );
}
