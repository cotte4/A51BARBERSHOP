type ResultadoPersonalProps = {
  paraVosHoy: number;
  paraVosMes: number;
  paraLaBarberMes: number;
};

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function resultTone(value: number) {
  return value >= 0
    ? {
        card: "border-emerald-200 bg-emerald-50",
        text: "text-emerald-900",
        amount: "text-emerald-700",
      }
    : {
        card: "border-red-200 bg-red-50",
        text: "text-red-900",
        amount: "text-red-700",
      };
}

export default function ResultadoPersonal({
  paraVosHoy,
  paraVosMes,
  paraLaBarberMes,
}: ResultadoPersonalProps) {
  const paraVosTone = resultTone(paraVosMes);
  const barberTone = resultTone(paraLaBarberMes);

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className={`rounded-[28px] border p-5 shadow-sm ${paraVosTone.card}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${paraVosTone.text}`}>
          Para vos
        </p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Hoy</p>
            <p className={`mt-2 text-3xl font-bold ${paraVosTone.amount}`}>{formatARS(paraVosHoy)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Mes</p>
            <p className={`mt-2 text-3xl font-bold ${paraVosTone.amount}`}>{formatARS(paraVosMes)}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-[28px] border p-5 shadow-sm ${barberTone.card}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${barberTone.text}`}>
          Para la barber
        </p>
        <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">Resultado casa mes</p>
        <p className={`mt-2 text-4xl font-bold ${barberTone.amount}`}>{formatARS(paraLaBarberMes)}</p>
      </div>
    </section>
  );
}
