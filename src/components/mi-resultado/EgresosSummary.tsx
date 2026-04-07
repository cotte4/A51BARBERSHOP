type EgresosSummaryProps = {
  gastosFijosMes: number;
  gastosRapidosMes: number;
  comisionesMediosMes: number;
  totalMes: number;
};

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type BreakdownItem = {
  label: string;
  value: number;
  note: string;
  toneClass: string;
};

export default function EgresosSummary({
  gastosFijosMes,
  gastosRapidosMes,
  comisionesMediosMes,
  totalMes,
}: EgresosSummaryProps) {
  const items: BreakdownItem[] = [
    {
      label: "Gastos fijos",
      value: gastosFijosMes,
      note: "Servicios, alquiler y estructura",
      toneClass: "border-zinc-800 bg-zinc-950/70 text-white",
    },
    {
      label: "Gastos rapidos",
      value: gastosRapidosMes,
      note: "Pequenios gastos del dia a dia",
      toneClass: "border-red-500/20 bg-red-500/10 text-red-100",
    },
    {
      label: "Comisiones medios",
      value: comisionesMediosMes,
      note: "Costos de cobro y pasarelas",
      toneClass: "border-zinc-800 bg-zinc-950/70 text-white",
    },
  ];

  const safeTotal = totalMes > 0 ? totalMes : 1;

  return (
    <section className="panel-card overflow-hidden rounded-[28px] border border-zinc-800/90 bg-zinc-900/95">
      <div className="border-b border-white/5 px-5 py-5">
        <p className="eyebrow text-xs font-semibold">Egresos del mes</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">Lo que sale antes de tu resultado</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Una sola vista para entender que parte se va en estructura, comisiones y gastos rapidos.
        </p>
      </div>

      <div className="px-5 pt-5">
        <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-red-200/70">Total egresos</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-red-200">{formatARS(totalMes)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Lectura</p>
              <p className="mt-1 text-sm text-zinc-200">
                {totalMes > 0 ? "Todo esto baja el neto del mes." : "Sin egresos cargados para este mes."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-900/80">
            <div
              className="bg-zinc-400/80"
              style={{ width: `${(gastosFijosMes / safeTotal) * 100}%` }}
              aria-hidden="true"
            />
            <div
              className="bg-red-400/80"
              style={{ width: `${(gastosRapidosMes / safeTotal) * 100}%` }}
              aria-hidden="true"
            />
            <div
              className="bg-zinc-200/70"
              style={{ width: `${(comisionesMediosMes / safeTotal) * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-5">
        <div className="space-y-3 rounded-[24px] border border-zinc-800 bg-zinc-950/55 p-3">
          {items.map((item) => (
            <div key={item.label} className={`rounded-[20px] border px-4 py-3 ${item.toneClass}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-current">{item.label}</p>
                  <p className="mt-1 text-xs text-zinc-400">{item.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                    {totalMes > 0 ? `${Math.round((item.value / safeTotal) * 100)}%` : "0%"}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-current">{formatARS(item.value)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
