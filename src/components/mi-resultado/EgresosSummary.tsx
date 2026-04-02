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

export default function EgresosSummary({
  gastosFijosMes,
  gastosRapidosMes,
  comisionesMediosMes,
  totalMes,
}: EgresosSummaryProps) {
  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Egresos del mes</p>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-[18px] border border-zinc-800 bg-zinc-950 px-4 py-3">
          <span className="text-sm text-zinc-400">Gastos fijos</span>
          <span className="text-base font-bold text-red-400">{formatARS(gastosFijosMes)}</span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-zinc-800 bg-zinc-950 px-4 py-3">
          <span className="text-sm text-zinc-400">Gastos rápidos</span>
          <span className="text-base font-bold text-red-400">{formatARS(gastosRapidosMes)}</span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-zinc-800 bg-zinc-950 px-4 py-3">
          <span className="text-sm text-zinc-400">Comisiones medios</span>
          <span className="text-base font-bold text-red-400">{formatARS(comisionesMediosMes)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-red-500/20 bg-red-500/10 px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-red-400/70">Total egresos</p>
        <p className="mt-1.5 text-3xl font-bold text-red-400">{formatARS(totalMes)}</p>
      </div>
    </section>
  );
}
