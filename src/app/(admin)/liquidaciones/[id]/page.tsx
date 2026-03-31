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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/liquidaciones"
            className="print:hidden mb-2 block text-sm text-gray-400 hover:text-gray-600"
          >
            {"<- Liquidaciones"}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              Liquidacion - {barbero?.nombre ?? "-"}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                liq.pagado ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
              }`}
            >
              {liq.pagado ? "Pagado" : "Pendiente"}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {periodoLabel}
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="print:hidden flex flex-wrap gap-2">
          <PrintButton />
          <a
            href={`/api/pdf/liquidacion/${id}`}
            download
            className="min-h-[44px] inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Descargar PDF
          </a>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Resumen</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cortes realizados</span>
              <span className="font-medium text-gray-900">{liq.totalCortes ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total bruto cortes</span>
              <span className="font-medium text-gray-900">{formatARS(liq.totalBrutoCortes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Comision calculada</span>
              <span className="font-medium text-gray-900">{formatARS(liq.totalComisionCalculada)}</span>
            </div>
            {alquilerBanco > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Alquiler banco del periodo</span>
                <span className="text-red-600">-{formatARS(liq.alquilerBancoCobrado)}</span>
              </div>
            )}
            {sueldoMinimo > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sueldo minimo garantizado</span>
                <span className="font-medium text-gray-900">{formatARS(liq.sueldoMinimo)}</span>
              </div>
            )}
            {periodoNegativo && (
              <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                El periodo dio negativo. Se registra como resultado negativo del periodo, sin deuda ni arrastre.
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-gray-100 pt-2 text-sm">
              <span className="font-medium text-gray-700">Resultado del periodo</span>
              <span className={resultadoPeriodo < 0 ? "font-bold text-red-600" : "font-bold text-gray-900"}>
                {formatARS(resultadoPeriodo)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Monto a pagar</span>
              <span className="text-base font-bold text-gray-900">{formatARS(montoAPagar)}</span>
            </div>
          </div>
        </div>

        {liq.pagado ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Pago</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fecha de pago</span>
              <span className="font-medium text-gray-900">{formatFecha(liq.fechaPago)}</span>
            </div>
          </div>
        ) : (
          <div className="print:hidden rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Registrar pago</h2>
            <MarcarPagadaButton marcarAction={marcarConId} />
          </div>
        )}

        {liq.notas && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Notas</h2>
            <p className="whitespace-pre-line text-sm text-gray-600">{liq.notas}</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Detalles</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Barbero</span>
              <span className="font-medium text-gray-900">{barbero?.nombre ?? "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Modelo</span>
              <span className="font-medium capitalize text-gray-900">{barbero?.tipoModelo ?? "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Generada</span>
              <span className="font-medium text-gray-900">
                {formatFechaHora(liq.creadoEn)}
              </span>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
