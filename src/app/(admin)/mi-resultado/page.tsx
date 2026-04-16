import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import IngresosSummary from "@/components/mi-resultado/IngresosSummary";
import EgresosSummary from "@/components/mi-resultado/EgresosSummary";
import ResultadoPersonal from "@/components/mi-resultado/ResultadoPersonal";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import GastosHistorialModal from "@/components/gastos-rapidos/GastosHistorialModal";
import { getMiResultadoData, getGastosRapidosDelMes } from "@/lib/mi-resultado-queries";
import { formatARS } from "@/lib/format";
import { registrarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";

function formatMonthLabel(fecha: string, mes: number, anio: number) {
  const current = new Date(`${fecha}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(current) || `${String(mes).padStart(2, "0")}/${anio}`;
}

export default async function MiResultadoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const [data, { gastos, total }] = await Promise.all([
    getMiResultadoData(),
    getGastosRapidosDelMes(),
  ]);

  const monthLabel = formatMonthLabel(data.fechaHoy, data.mes, data.anio);
  const netoMes = data.resultado.paraVosMes;
  const netoHoy = data.resultado.paraVosHoy;
  const gastosRapidosMes = data.gastosRapidos.totalMes;
  const balanceTitle = netoMes < 0 ? "Resultado en rojo" : "Resultado sano";

  return (
    <div className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="overflow-hidden rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.1),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200">
                &larr; Dashboard
              </Link>
              <div className="space-y-3">
                <p className="eyebrow text-xs font-semibold">Panel financiero</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Mi resultado
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                  La lectura personal de hoy y del mes en un solo panel. Ingresos, egresos,
                  resultado neto y el historial de gastos rapidos quedan juntos para que no haya
                  que saltar entre pantallas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Pill label="Mes" value={monthLabel} />
                <Pill label="Hoy" value={formatARS(netoHoy)} accent />
                <Pill label="Mes neto" value={formatARS(netoMes)} />
                <Pill label="Gastos rapidos" value={formatARS(gastosRapidosMes)} />
              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px]">
              <HeroStat label="Resultado hoy" value={formatARS(netoHoy)} helper="Lo que queda para vos en el dia." />
              <HeroStat label="Resultado mes" value={formatARS(netoMes)} helper={balanceTitle} />
              <HeroStat label="Egresos mes" value={formatARS(data.egresos.totalMes)} helper="Suma de fijos, rapidos y comisiones." />
              <HeroStat label="Ingresos mes" value={formatARS(data.ingresos.totalMes)} helper="Corte, aporte casa y productos." tone="accent" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
            <GastoRapidoFAB
              action={registrarGastoRapidoAction}
              returnTo="/mi-resultado"
              historyHref="/gastos-rapidos"
              fixed={false}
              showHistoryLink={false}
              buttonLabel="Registrar gasto rapido"
              buttonClassName="neon-button inline-flex min-h-[52px] items-center justify-center rounded-[20px] px-5 text-sm font-semibold"
            />
            <GastosHistorialModal gastos={gastos} total={total} />
            <Link
              href="/gastos-rapidos"
              className="inline-flex min-h-[52px] items-center justify-center rounded-[20px] border border-zinc-700 bg-zinc-950 px-5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              Ver gastos del mes
            </Link>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-2">
              <IngresosSummary {...data.ingresos} />
              <EgresosSummary {...data.egresos} />
            </div>
            <ResultadoPersonal {...data.resultado} />
          </div>

          <aside className="space-y-4">
            <section className="panel-card rounded-[28px] p-5">
              <p className="eyebrow text-xs font-semibold">Lectura rapida</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Donde mirar primero</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                <p>1. Mirar el resultado del mes para saber si el negocio deja aire o no.</p>
                <p>2. Revisar egresos y gastos rapidos para detectar fugas repetidas.</p>
                <p>3. Abrir el historial solo cuando necesites bajar al detalle de un gasto.</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                Historial
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">Gastos rapidos del mes</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-200">
                El modal te deja ver los movimientos sin perder contexto de la lectura general.
              </p>
              <div className="mt-4 rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Resumen</p>
                <p className="mt-2 text-2xl font-semibold text-white">{gastos.length} movimientos</p>
                <p className="mt-1 text-sm text-zinc-400">Total egresos rapidos {formatARS(total)}</p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${accent ? "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#b9ff96]" : "border-zinc-800 bg-zinc-950 text-zinc-300"}`}>
      <span className="text-zinc-500">{label}:</span> {value}
    </div>
  );
}

function HeroStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "accent" | "neutral";
}) {
  return (
    <div className={`rounded-[24px] border p-4 ${tone === "accent" ? "border-[#8cff59]/20 bg-[#8cff59]/10" : "border-zinc-800 bg-zinc-950/70"}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "accent" ? "text-[#b9ff96]" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}
