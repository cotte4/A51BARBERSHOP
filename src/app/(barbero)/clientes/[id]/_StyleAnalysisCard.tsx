import type { StyleAnalysis } from "@/lib/types";

type Props = { analysis: StyleAnalysis };

export default function StyleAnalysisCard({ analysis }: Props) {
  const fecha = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(analysis.generadoEn));

  return (
    <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-xs text-[#8cff59]">Perfil de estilo · IA</p>
        <p className="text-xs text-zinc-500">{fecha}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#8cff59]">
          {analysis.perfil}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-200">
          Actitud: {analysis.actitudCambio}
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Estilos probables</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {analysis.estilosProbables.map((e) => (
            <span
              key={e}
              className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">Notas para el barbero</p>
        <p className="mt-2 text-sm text-zinc-200">{analysis.notasBarbero}</p>
      </div>

      <p className="text-[11px] text-zinc-600">
        Confianza del modelo: {(analysis.confianza * 100).toFixed(0)}%
      </p>
    </section>
  );
}
