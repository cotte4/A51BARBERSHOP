type CancelacionRow = {
  motivo: string;
  cantidad: number;
};

type CancelacionesPanelProps = {
  cancelados: CancelacionRow[];
  totalTurnos: number;
};

function isNoShow(motivo: string): boolean {
  const lower = motivo.toLowerCase();
  return lower.includes("no se present") || lower.includes("no vino") || lower.includes("no show");
}

export default function CancelacionesPanel({ cancelados, totalTurnos }: CancelacionesPanelProps) {
  if (totalTurnos === 0 || cancelados.length === 0) return null;

  const totalCancelados = cancelados.reduce((sum, row) => sum + row.cantidad, 0);
  const tasaCancelacion = Math.round((totalCancelados / totalTurnos) * 100);
  const noShows = cancelados.filter((row) => isNoShow(row.motivo));
  const totalNoShows = noShows.reduce((sum, row) => sum + row.cantidad, 0);

  const top5 = [...cancelados]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  const resto = cancelados.length > 5
    ? cancelados.slice(5).reduce((sum, row) => sum + row.cantidad, 0)
    : 0;

  return (
    <section className="panel-card rounded-[32px] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-[11px] font-semibold">Cancelaciones del mes</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-white">
            Patrones de baja
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
            {totalCancelados} cancelados
          </span>
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
            {tasaCancelacion}% del total
          </span>
          {totalNoShows > 0 ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {totalNoShows} no-shows
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {top5.map((row) => {
          const pct = Math.round((row.cantidad / totalCancelados) * 100);
          const highlight = isNoShow(row.motivo);
          return (
            <div key={row.motivo} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate text-sm ${highlight ? "font-semibold text-amber-200" : "text-zinc-300"}`}>
                  {row.motivo}
                </p>
                <span className="shrink-0 text-xs font-semibold text-zinc-400">
                  {row.cantidad} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${highlight ? "bg-amber-400" : "bg-red-500/60"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {resto > 0 ? (
          <p className="text-xs text-zinc-500">+ {resto} en otros motivos</p>
        ) : null}
      </div>
    </section>
  );
}
