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
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ResultadoPersonal({
  paraVosHoy,
  paraVosMes,
  paraLaBarberMes,
}: ResultadoPersonalProps) {
  const paraVosNegativo = paraVosMes < 0;
  const barberNegativo = paraLaBarberMes < 0;

  return (
    <section className="grid gap-4 md:grid-cols-2">

      {/* PARA VOS — hero */}
      <div className={`overflow-hidden rounded-[32px] border shadow-[0_0_60px_rgba(140,255,89,0.1)] ${
        paraVosNegativo
          ? "border-red-500/25 bg-zinc-900"
          : "border-[#8cff59]/30 bg-zinc-900"
      }`}>
        <div className={`h-full ${paraVosNegativo ? "" : "bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.13),_transparent_55%)]"} p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Para vos</p>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-600">Hoy</p>
              <p className={`mt-1 text-2xl font-bold ${paraVosNegativo ? "text-red-400" : "text-[#8cff59]"}`}>
                {formatARS(paraVosHoy)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-zinc-600">Este mes</p>
              <p className={`mt-1 text-2xl font-bold ${paraVosNegativo ? "text-red-400" : "text-[#8cff59]"}`}>
                {formatARS(paraVosMes)}
              </p>
            </div>
          </div>

          <div className={`mt-5 rounded-[20px] border px-4 py-3 ${
            paraVosNegativo
              ? "border-red-500/20 bg-red-500/10"
              : "border-[#8cff59]/20 bg-[#8cff59]/8"
          }`}>
            <p className={`text-xs uppercase tracking-wide ${paraVosNegativo ? "text-red-400/70" : "text-zinc-500"}`}>
              Resultado neto del mes
            </p>
            <p className={`mt-1 text-4xl font-bold tracking-tight ${paraVosNegativo ? "text-red-400" : "text-[#8cff59]"}`}>
              {formatARS(paraVosMes)}
            </p>
          </div>
        </div>
      </div>

      {/* Para la barber */}
      <div className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Para la barber</p>
        <p className="mt-1 text-xs text-zinc-600">Resultado casa este mes</p>
        <p className={`mt-4 text-4xl font-bold tracking-tight ${barberNegativo ? "text-red-400" : "text-[#8cff59]"}`}>
          {formatARS(paraLaBarberMes)}
        </p>
      </div>
    </section>
  );
}
