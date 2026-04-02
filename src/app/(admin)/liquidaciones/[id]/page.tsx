import { db } from "@/db";
import { barberos, liquidaciones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { marcarPagada } from "../actions";
import MarcarPagadaButton from "./_MarcarPagadaButton";
import PrintButton from "./_PrintButton";
import { formatFecha, formatFechaHora } from "@/lib/fecha";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val));
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
  const resultadoPeriodo = Number(liq.montoAPagar ?? 0);
  const montoAPagar = Number(liq.montoAPagar ?? 0);

  const periodoLabel =
    liq.periodoInicio && liq.periodoFin && liq.periodoInicio === liq.periodoFin
      ? formatFecha(liq.periodoInicio)
      : `${formatFecha(liq.periodoInicio)} al ${formatFecha(liq.periodoFin)}`;

  const periodoNegativo = resultadoPeriodo < 0;
  const marcarConId = marcarPagada.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 pb-24">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">

        {/* Back + header */}
        <div>
          <Link
            href="/liquidaciones"
            className="print:hidden inline-flex min-h-[36px] items-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
          >
            ← Ver historial
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-white">
                {barbero?.nombre ?? "—"}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">{periodoLabel}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              liq.pagado
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/20 bg-amber-500/10 text-amber-400"
            }`}>
              {liq.pagado ? "Pagado" : "Pendiente"}
            </span>
          </div>
        </div>

        {/* PARA VOS — hero card */}
        <section className="overflow-hidden rounded-[32px] border border-[#8cff59]/30 bg-zinc-900 shadow-[0_0_60px_rgba(140,255,89,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.12),_transparent_50%)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Para vos</p>
            <p className={`mt-2 text-5xl font-bold tracking-tight ${periodoNegativo ? "text-red-400" : "text-[#8cff59]"}`}>
              {formatARS(montoAPagar)}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {liq.totalCortes ?? 0} cortes · {periodoLabel}
            </p>
            {periodoNegativo && (
              <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                El período dio negativo. Se registra sin deuda ni arrastre.
              </p>
            )}
          </div>
        </section>

        {/* Desglose */}
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Desglose</p>
          <div className="mt-4 flex flex-col gap-3">
            <Row
              label="Cortes realizados"
              value={String(liq.totalCortes ?? 0)}
              plain
            />
            <Row
              label="Total bruto cortes"
              value={formatARS(liq.totalBrutoCortes)}
              positive
            />
            <Row
              label="Comisión calculada"
              value={formatARS(comision)}
              positive
            />
            {alquilerBanco > 0 && (
              <Row
                label="Alquiler banco del período"
                value={`-${formatARS(alquilerBanco)}`}
                negative
              />
            )}
            {sueldoMinimo > 0 && (
              <Row
                label="Sueldo mínimo garantizado"
                value={formatARS(sueldoMinimo)}
                positive
              />
            )}
            <div className="mt-1 border-t border-zinc-800 pt-3">
              <Row
                label="Resultado del período"
                value={formatARS(resultadoPeriodo)}
                highlight={!periodoNegativo}
                negative={periodoNegativo}
              />
            </div>
          </div>
        </section>

        {/* Pago */}
        {liq.pagado ? (
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Pago</p>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-zinc-500">Fecha de pago</span>
              <span className="font-medium text-white">{formatFecha(liq.fechaPago)}</span>
            </div>
          </section>
        ) : (
          <section className="print:hidden rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Registrar pago</p>
            <div className="mt-3">
              <MarcarPagadaButton marcarAction={marcarConId} />
            </div>
          </section>
        )}

        {/* Notas */}
        {liq.notas && (
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Notas</p>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-400">{liq.notas}</p>
          </section>
        )}

        {/* Detalles técnicos */}
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Detalles</p>
          <div className="mt-3 flex flex-col gap-2">
            <Row label="Barbero" value={barbero?.nombre ?? "—"} plain />
            <Row label="Modelo" value={barbero?.tipoModelo ?? "—"} plain />
            <Row label="Generada" value={formatFechaHora(liq.creadoEn)} plain />
          </div>
        </section>

        {/* Acciones imprimir/PDF */}
        <div className="print:hidden flex flex-wrap gap-2">
          <PrintButton />
          <a
            href={`/api/pdf/liquidacion/${id}`}
            download
            className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Descargar PDF
          </a>
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
    ? "font-semibold text-red-400"
    : positive
    ? "font-medium text-[#8cff59]"
    : "font-medium text-white";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
