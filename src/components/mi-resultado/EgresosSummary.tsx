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
  }).format(value);
}

export default function EgresosSummary({
  gastosFijosMes,
  gastosRapidosMes,
  comisionesMediosMes,
  totalMes,
}: EgresosSummaryProps) {
  return (
    <section className="rounded-[28px] border border-red-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
        Egresos del mes
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3">
          <span className="text-sm text-red-900">Gastos fijos</span>
          <span className="text-base font-bold text-red-900">{formatARS(gastosFijosMes)}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3">
          <span className="text-sm text-red-900">Gastos rapidos</span>
          <span className="text-base font-bold text-red-900">{formatARS(gastosRapidosMes)}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3">
          <span className="text-sm text-red-900">Comisiones medios</span>
          <span className="text-base font-bold text-red-900">
            {formatARS(comisionesMediosMes)}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-gray-900 px-4 py-4 text-white">
        <p className="text-xs uppercase tracking-wide text-gray-300">Total egresos</p>
        <p className="mt-2 text-3xl font-bold text-red-300">{formatARS(totalMes)}</p>
      </div>
    </section>
  );
}
