import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { barberos, liquidaciones } from "@/db/schema";
import { formatFecha, formatFechaHora } from "@/lib/fecha";
import { marcarPagada } from "../actions";
import MarcarPagadaButton from "./_MarcarPagadaButton";
import PrintButton from "./_PrintButton";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function MetricCard({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="panel-soft rounded-[24px] p-4">
      <p className="eyebrow text-[10px]">{label}</p>
      <p className={`mt-3 font-display text-2xl font-semibold tracking-tight ${valueClassName}`}>{value}</p>
    </div>
  );
}

interface LiquidacionPageProps {
  params: Promise<{ id: string }>;
}

export default async function LiquidacionDetallePage({ params }: LiquidacionPageProps) {
  const { id } = await params;

  const [liq] = await db
    .select()
    .from(liquidaciones)
    .where(eq(liquidaciones.id, id))
    .limit(1);

  if (!liq) notFound();

  const [barbero] = await db
    .select()
    .from(barberos)
    .where(eq(barberos.id, liq.barberoId ?? ""))
    .limit(1);

  const comision = Number(liq.totalComisionCalculada ?? 0);
  const sueldoMinimo = Number(liq.sueldoMinimo ?? 0);
  const alquilerBanco = Number(liq.alquilerBancoCobrado ?? 0);
  const montoAPagar = Number(liq.montoAPagar ?? 0);
  const periodoNegativo = montoAPagar < 0;

  const periodoLabel =
    liq.periodoInicio && liq.periodoFin && liq.periodoInicio === liq.periodoFin
      ? formatFecha(liq.periodoInicio)
      : `${formatFecha(liq.periodoInicio)} al ${formatFecha(liq.periodoFin)}`;

  const marcarConId = marcarPagada.bind(null, id);

  return (
    <div className="min-h-screen app-shell px-4 py-6 pb-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/liquidaciones" className="eyebrow text-xs text-zinc-500 hover:text-zinc-300">
            ← Ver historial
          </Link>

          <div className="print:hidden flex flex-wrap gap-2">
            <PrintButton />
            <a
              href={`/api/pdf/liquidacion/${id}`}
              download
              className="ghost-button inline-flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-semibold"
            >
              Descargar PDF
            </a>
          </div>
        </div>

        <section className="panel-card overflow-hidden rounded-[32px]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.14),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(140,255,89,0.06),_transparent_28%)] p-6 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-xs">Liquidacion</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {barbero?.nombre ?? "Sin barbero"}
                </h1>
                <p className="mt-2 text-sm text-zinc-300">{periodoLabel}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      liq.pagado
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {liq.pagado ? "Pagada" : "Pendiente"}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                    {liq.totalCortes ?? 0} cortes
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                    Generada {formatFecha(liq.creadoEn)}
                  </span>
                </div>
              </div>

              <div className="w-full max-w-sm rounded-[28px] border border-[#8cff59]/20 bg-black/20 p-5">
                <p className="eyebrow text-[10px]">Monto a pagar</p>
                <p className={`mt-3 font-display text-5xl font-semibold tracking-tight ${periodoNegativo ? "text-amber-300" : "text-[#8cff59]"}`}>
                  {formatARS(montoAPagar)}
                </p>
                <p className="mt-3 text-sm text-zinc-400">
                  {liq.totalCortes ?? 0} cortes liquidados en {periodoLabel}.
                </p>
                {periodoNegativo ? (
                  <p className="mt-4 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-200">
                    El periodo dio negativo. Se registra igual, pero conviene revisar el ajuste
                    antes de pagar.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Bruto de cortes"
                value={formatARS(liq.totalBrutoCortes)}
                valueClassName="text-zinc-100"
              />
              <MetricCard
                label="Comision calculada"
                value={formatARS(comision)}
                valueClassName="text-[#8cff59]"
              />
              <MetricCard
                label="Saldo final"
                value={formatARS(montoAPagar)}
                valueClassName={periodoNegativo ? "text-amber-300" : "text-[#8cff59]"}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="panel-card rounded-[28px] p-5">
            <p className="eyebrow text-[10px]">Desglose</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
              Lo que compone esta liquidacion
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <Row label="Cortes realizados" value={String(liq.totalCortes ?? 0)} plain />
              <Row label="Total bruto cortes" value={formatARS(liq.totalBrutoCortes)} positive />
              <Row label="Comision calculada" value={formatARS(comision)} positive />
              {alquilerBanco > 0 ? (
                <Row label="Alquiler banco del periodo" value={`-${formatARS(alquilerBanco)}`} negative />
              ) : null}
              {sueldoMinimo > 0 ? (
                <Row label="Sueldo minimo garantizado" value={formatARS(sueldoMinimo)} positive />
              ) : null}
              <div className="mt-1 border-t border-zinc-800 pt-3">
                <Row
                  label="Resultado del periodo"
                  value={formatARS(montoAPagar)}
                  highlight={!periodoNegativo}
                  negative={periodoNegativo}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="panel-card rounded-[28px] p-5">
              <p className="eyebrow text-[10px]">Estado</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Pago y confirmacion
              </h2>

              {liq.pagado ? (
                <div className="mt-5 rounded-[22px] border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-semibold text-emerald-300">Ya esta cerrada</p>
                  <p className="mt-1 text-sm text-zinc-200">
                    Fecha de pago: <span className="font-semibold text-white">{formatFecha(liq.fechaPago)}</span>
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-300">Pendiente de pago</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-200">
                    Revisá el monto final antes de confirmar. Una vez pagada, la liquidacion pasa al
                    historial y queda marcada con fecha.
                  </p>
                  <div className="mt-4">
                    <MarcarPagadaButton marcarAction={marcarConId} />
                  </div>
                </div>
              )}
            </section>

            <section className="panel-card rounded-[28px] p-5">
              <p className="eyebrow text-[10px]">Contexto</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Metadatos utiles
              </h2>
              <div className="mt-5 flex flex-col gap-3">
                <Row label="Barbero" value={barbero?.nombre ?? "Sin dato"} plain />
                <Row label="Modelo" value={barbero?.tipoModelo ?? "Sin dato"} plain />
                <Row label="Generada" value={formatFechaHora(liq.creadoEn)} plain />
              </div>
            </section>

            {liq.notas ? (
              <section className="panel-card rounded-[28px] p-5">
                <p className="eyebrow text-[10px]">Notas</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">{liq.notas}</p>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
  highlight,
  plain,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
  plain?: boolean;
}) {
  const valueClass = highlight
    ? "font-bold text-[#8cff59] text-base"
    : negative
      ? "font-semibold text-amber-300"
      : positive
        ? "font-medium text-[#8cff59]"
        : "font-medium text-white";

  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${plain ? "rounded-[18px] border border-zinc-800 bg-zinc-950 px-4 py-3" : ""}`}>
      <span className="text-zinc-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
