import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { desc } from "drizzle-orm";
import { registrarCuota } from "./actions";
import Link from "next/link";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function RepagoPage() {
  const [repago] = await db.select().from(repagoMemas).limit(1);
  const cuotas = await db
    .select()
    .from(repagoMemasCuotas)
    .orderBy(desc(repagoMemasCuotas.fechaPago));

  const totalPagado = cuotas.reduce((s, c) => s + Number(c.montoPagado ?? 0), 0);
  const cuotasRestantes = repago
    ? Math.ceil(Number(repago.saldoPendiente ?? 0) / Number(repago.cuotaMensual ?? 1))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Repago Memas</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {!repago ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
            No hay deuda configurada.
          </div>
        ) : repago.pagadoCompleto ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-6">
            <p className="text-green-800 font-semibold text-lg">✓ Deuda saldada</p>
            <p className="text-green-600 text-sm mt-1">
              Se pagaron {formatARS(repago.valorLlaveTotal)} en {repago.cuotasPagadas} cuotas.
            </p>
          </div>
        ) : (
          <>
            {/* Estado actual */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Estado de la deuda
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Deuda original</p>
                  <p className="text-xl font-bold text-gray-900">{formatARS(repago.valorLlaveTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Saldo pendiente</p>
                  <p className="text-xl font-bold text-red-600">{formatARS(repago.saldoPendiente)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total pagado</p>
                  <p className="text-lg font-semibold text-gray-700">{formatARS(totalPagado)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cuotas pagadas</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {repago.cuotasPagadas} <span className="text-gray-400 text-sm">({cuotasRestantes} restantes)</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Próxima cuota</p>
                  <p className="text-lg font-bold text-gray-900">{formatARS(repago.cuotaMensual)}</p>
                </div>
                <form action={registrarCuota}>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                  >
                    Registrar pago de cuota
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Historial de pagos */}
        {cuotas.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Historial de pagos
            </h2>
            <div className="flex flex-col gap-2">
              {cuotas.map((cuota) => (
                <div
                  key={cuota.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Cuota #{cuota.numeroCuota}
                    </p>
                    <p className="text-xs text-gray-400">{formatFecha(cuota.fechaPago)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatARS(cuota.montoPagado)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
