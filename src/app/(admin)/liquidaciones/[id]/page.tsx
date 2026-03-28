import { db } from "@/db";
import { liquidaciones, barberos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { marcarPagada } from "../actions";
import MarcarPagadaButton from "./_MarcarPagadaButton";

function formatARS(val: string | number | null | undefined): string {
  if (!val) return "$0";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(Number(val));
}

function formatFecha(val: string | null | undefined): string {
  if (!val) return "—";
  return new Date(val + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
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
  const sueldoMin = Number(liq.sueldoMinimo ?? 0);
  const seAplicoMinimo = sueldoMin > 0 && comision < sueldoMin;

  // Bind el id al server action
  const marcarConId = marcarPagada.bind(null, id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/liquidaciones" className="text-gray-400 hover:text-gray-600 text-sm mb-2 block">← Liquidaciones</Link>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              {barbero?.nombre ?? "—"}
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${liq.pagado ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
              {liq.pagado ? "Pagado" : "Pendiente"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatFecha(liq.periodoInicio)} — {formatFecha(liq.periodoFin)}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Resumen de pago */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumen</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cortes realizados</span>
              <span className="text-gray-900 font-medium">{liq.totalCortes ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total bruto cortes</span>
              <span className="text-gray-900 font-medium">{formatARS(liq.totalBrutoCortes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Comisión calculada</span>
              <span className="text-gray-900 font-medium">{formatARS(liq.totalComisionCalculada)}</span>
            </div>
            {sueldoMin > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sueldo mínimo garantizado</span>
                <span className="text-gray-900 font-medium">{formatARS(liq.sueldoMinimo)}</span>
              </div>
            )}
            {liq.alquilerBancoCobrado && Number(liq.alquilerBancoCobrado) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Alquiler banco cobrado</span>
                <span className="text-gray-900 font-medium">{formatARS(liq.alquilerBancoCobrado)}</span>
              </div>
            )}
            {seAplicoMinimo && (
              <div className="mt-1 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                Se aplicó sueldo mínimo garantizado (comisión fue menor)
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 mt-1 flex justify-between text-sm">
              <span className="text-gray-700 font-semibold">Monto a pagar</span>
              <span className="text-gray-900 font-bold text-base">{formatARS(liq.montoAPagar)}</span>
            </div>
          </div>
        </div>

        {/* Estado de pago */}
        {liq.pagado ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Pago</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fecha de pago</span>
              <span className="text-gray-900 font-medium">{formatFecha(liq.fechaPago)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Registrar pago</h2>
            <MarcarPagadaButton marcarAction={marcarConId} />
          </div>
        )}

        {/* Notas */}
        {liq.notas && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Notas</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{liq.notas}</p>
          </div>
        )}

        {/* Metadatos */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Detalles</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Barbero</span>
              <span className="text-gray-900 font-medium">{barbero?.nombre ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Modelo</span>
              <span className="text-gray-900 font-medium capitalize">{barbero?.tipoModelo ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Generada</span>
              <span className="text-gray-900 font-medium">
                {liq.creadoEn
                  ? new Date(liq.creadoEn).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
