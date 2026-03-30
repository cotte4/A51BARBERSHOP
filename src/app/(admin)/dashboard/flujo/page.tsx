import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getFlujoMensual } from "@/lib/dashboard-queries";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

function nombreMes(mes: number, anio: number): string {
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function formatDia(fechaStr: string): string {
  return new Date(fechaStr + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function FlujoPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") redirect("/caja");

  const sp = await searchParams;
  const hoyDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const mesActual = hoyDate.getMonth() + 1;
  const anioActual = hoyDate.getFullYear();

  const mes = sp.mes ? parseInt(String(sp.mes), 10) : mesActual;
  const anio = sp.anio ? parseInt(String(sp.anio), 10) : anioActual;

  const flujo = await getFlujoMensual(mes, anio);

  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anioPrev = mes === 1 ? anio - 1 : anio;
  const mesNext = mes === 12 ? 1 : mes + 1;
  const anioNext = mes === 12 ? anio + 1 : anio;

  // Totales
  const totalIngresos = flujo.reduce((s, d) => s + d.ingresos, 0);
  const totalEgresos = flujo.reduce((s, d) => s + d.egresos, 0);
  const saldoFinal = flujo.length > 0 ? flujo[flujo.length - 1].saldoAcumulado : 0;

  const hayDatos = flujo.some((d) => d.ingresos > 0 || d.egresos > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 text-sm mb-2 block"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Flujo mensual</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Selector de mes */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/flujo?mes=${mesPrev}&anio=${anioPrev}`}
            className="min-h-[44px] flex items-center px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Anterior
          </Link>
          <span className="text-sm font-semibold text-gray-900 capitalize">
            {nombreMes(mes, anio)}
          </span>
          <Link
            href={`/dashboard/flujo?mes=${mesNext}&anio=${anioNext}`}
            className="min-h-[44px] flex items-center px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Siguiente →
          </Link>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total ingresos</p>
            <p className="text-lg font-bold text-gray-900">{formatARS(totalIngresos)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total egresos</p>
            <p className="text-lg font-bold text-red-700">{formatARS(totalEgresos)}</p>
          </div>
          <div
            className={`rounded-xl border p-4 ${
              saldoFinal >= 0 ? "bg-white border-gray-200" : "bg-red-50 border-red-200"
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">Saldo final</p>
            <p
              className={`text-lg font-bold ${
                saldoFinal >= 0 ? "text-gray-900" : "text-red-700"
              }`}
            >
              {formatARS(saldoFinal)}
            </p>
          </div>
        </div>

        {/* Tabla de flujo */}
        {!hayDatos ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">No hay datos para este mes.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 gap-0 bg-gray-50 border-b border-gray-200">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Fecha
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Ingresos
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Egresos
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Saldo día
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Acumulado
              </div>
            </div>

            {/* Filas — todos los días del mes */}
            {flujo.map((dia) => {
              const egresosSuperanIngresos = dia.egresos > dia.ingresos && dia.ingresos > 0;
              return (
                <div
                  key={dia.fecha}
                  className={`grid grid-cols-5 gap-0 border-b border-gray-100 last:border-0 ${
                    egresosSuperanIngresos ? "bg-red-50" : ""
                  }`}
                >
                  <div className="px-3 py-2.5 text-sm text-gray-700 font-medium">
                    {formatDia(dia.fecha)}
                  </div>
                  <div className="px-3 py-2.5 text-sm text-right text-gray-900 tabular-nums">
                    {dia.ingresos > 0 ? formatARS(dia.ingresos) : "—"}
                  </div>
                  <div className="px-3 py-2.5 text-sm text-right tabular-nums">
                    {dia.egresos > 0 ? (
                      <span className="text-red-700">{formatARS(dia.egresos)}</span>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div
                    className={`px-3 py-2.5 text-sm text-right font-medium tabular-nums ${
                      dia.saldoDia >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {formatARS(dia.saldoDia)}
                  </div>
                  <div
                    className={`px-3 py-2.5 text-sm text-right font-semibold tabular-nums ${
                      dia.saldoAcumulado >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {formatARS(dia.saldoAcumulado)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Ingresos = cierres de caja. Egresos = gastos registrados. Días sin actividad muestran $0.
        </p>
      </main>
    </div>
  );
}
