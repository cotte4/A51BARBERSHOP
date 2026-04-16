import { formatARS } from "@/lib/format";

type ResultadoPersonalProps = {
  paraVosHoy: number;
  paraVosMes: number;
  paraLaBarberMes: number;
};

export default function ResultadoPersonal({
  paraVosHoy,
  paraVosMes,
  paraLaBarberMes,
}: ResultadoPersonalProps) {
  const paraVosNegativo = paraVosMes < 0;
  const barberNegativo = paraLaBarberMes < 0;
  const paraVosTone = paraVosNegativo
    ? "border-red-500/25 bg-red-500/10"
    : "border-[#8cff59]/25 bg-[#8cff59]/10";
  const barberTone = barberNegativo
    ? "border-red-500/20 bg-red-500/10"
    : "border-zinc-800 bg-zinc-950/70";

  return (
    <section className="panel-card overflow-hidden rounded-[32px] border border-zinc-800/90 bg-zinc-900/95">
      <div className="border-b border-white/5 px-6 py-5">
        <p className="eyebrow text-xs font-semibold">Resultado personal</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
          Lo que queda para vos y para la barber
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Una sola lectura para distinguir tu neto, la parte casa y el pulso de hoy.
        </p>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className={`rounded-[28px] border p-5 shadow-[0_0_60px_rgba(140,255,89,0.08)] ${paraVosTone}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Para vos</p>
              <p className="mt-1 text-sm text-zinc-400">Neto personal del mes</p>
            </div>
            <div className="rounded-full border border-white/10 bg-zinc-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Hoy {formatARS(paraVosHoy)}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-white/5 bg-zinc-950/45 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Hoy</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${paraVosNegativo ? "text-red-300" : "text-[#b9ff96]"}`}>
                {formatARS(paraVosHoy)}
              </p>
            </div>
            <div className="rounded-[20px] border border-white/5 bg-zinc-950/45 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Mes</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${paraVosNegativo ? "text-red-300" : "text-[#b9ff96]"}`}>
                {formatARS(paraVosMes)}
              </p>
            </div>
          </div>

          <div
            className={`mt-5 rounded-[24px] border px-4 py-4 ${
              paraVosNegativo ? "border-red-500/20 bg-red-500/10" : "border-[#8cff59]/20 bg-[#8cff59]/10"
            }`}
          >
            <p className={`text-xs uppercase tracking-[0.18em] ${paraVosNegativo ? "text-red-200/70" : "text-[#b9ff96]/80"}`}>
              Resultado neto del mes
            </p>
            <p className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums ${paraVosNegativo ? "text-red-300" : "text-[#b9ff96]"}`}>
              {formatARS(paraVosMes)}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Este es el numero que te dice si el mes te dejo aire o te empezo a apretar.
            </p>
          </div>
        </article>

        <article className={`rounded-[28px] border p-5 ${barberTone}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Para la barber</p>
          <p className="mt-1 text-sm text-zinc-400">Resultado casa del mes</p>
          <p className={`mt-5 text-4xl font-semibold tracking-tight tabular-nums ${barberNegativo ? "text-red-300" : "text-[#b9ff96]"}`}>
            {formatARS(paraLaBarberMes)}
          </p>
          <div className="mt-5 rounded-[24px] border border-white/5 bg-zinc-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Lectura</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Lo que queda en la caja del negocio para sostener estructura, reinvertir o cubrir picos.
            </p>
          </div>
        </article>
      </div>

      <div className="border-t border-white/5 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <span>Hoy {formatARS(paraVosHoy)}</span>
          <span className="text-zinc-700">/</span>
          <span>Mes {formatARS(paraVosMes)}</span>
          <span className="text-zinc-700">/</span>
          <span>Casa {formatARS(paraLaBarberMes)}</span>
        </div>
      </div>
    </section>
  );
}
