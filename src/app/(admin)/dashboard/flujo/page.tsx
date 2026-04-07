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
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-[#8cff59] text-sm mb-2 block"
          >
            ← Dashboard
          </Link>
          <h1 className="font-display text-xl font-bold text-white">Flujo mensual</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Selector de mes */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/flujo?mes=${mesPrev}&anio=${anioPrev}`}
            className="min-h-[44px] flex items-center px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ← Anterior
          </Link>
          <span className="text-sm font-semibold text-white capitalize">
            {nombreMes(mes, anio)}
          </span>
          <Link
            href={`/dashboard/flujo?mes=${mesNext}&anio=${anioNext}`}
            className="min-h-[44px] flex items-center px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Siguiente →
          </Link>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="panel-card rounded-[28px] p-4">
            <p className="text-xs text-zinc-400 mb-1">Total ingresos</p>
            <p className="text-lg font-bold text-white">{formatARS(totalIngresos)}</p>
          </div>
          <div className="panel-card rounded-[28px] p-4">
            <p className="text-xs text-zinc-400 mb-1">Total egresos</p>
            <p className="text-lg font-bold text-red-300">{formatARS(totalEgresos)}</p>
          </div>
          <div
            className={`rounded-[28px] border p-4 ${
              saldoFinal >= 0
                ? "panel-card"
                : "bg-red-500/15 border-red-500/30"
            }`}
          >
            <p className="text-xs text-zinc-400 mb-1">Saldo final</p>
            <p
              className={`text-lg font-bold ${
                saldoFinal >= 0 ? "text-white" : "text-red-300"
              }`}
            >
              {formatARS(saldoFinal)}
            </p>
          </div>
        </div>

        {/* Tabla de flujo */}
        {!hayDatos ? (
          <div className="panel-card rounded-[28px] p-8 text-center">
            <p className="text-zinc-400 text-sm">No hay datos para este mes.</p>
          </div>
        ) : (
          <div className="panel-card rounded-[28px] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 gap-0 bg-zinc-950/50 border-b border-zinc-800">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Fecha
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                Ingresos
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                Egresos
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                Saldo día
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                Acumulado
              </div>
            </div>

            {/* Filas — todos los días del mes */}
            {flujo.map((dia) => {
              const egresosSuperanIngresos = dia.egresos > dia.ingresos && dia.ingresos > 0;
              return (
                <div
                  key={dia.fecha}
                  className={`grid grid-cols-5 gap-0 border-b border-zinc-800 last:border-0 ${
                    egresosSuperanIngresos ? "bg-red-500/10" : ""
                  }`}
                >
                  <div className="px-3 py-2.5 text-sm text-zinc-300 font-medium">
                    {formatDia(dia.fecha)}
                  </div>
                  <div className="px-3 py-2.5 text-sm text-right text-white tabular-nums">
                    {dia.ingresos > 0 ? formatARS(dia.ingresos) : "—"}
                  </div>
                  <div className="px-3 py-2.5 text-sm text-right tabular-nums">
                    {dia.egresos > 0 ? (
                      <span className="text-red-300">{formatARS(dia.egresos)}</span>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div
                    className={`px-3 py-2.5 text-sm text-right font-medium tabular-nums ${
                      dia.saldoDia >= 0 ? "text-white" : "text-red-300"
                    }`}
                  >
                    {formatARS(dia.saldoDia)}
                  </div>
                  <div
                    className={`px-3 py-2.5 text-sm text-right font-semibold tabular-nums ${
                      dia.saldoAcumulado >= 0 ? "text-white" : "text-red-300"
                    }`}
                  >
                    {formatARS(dia.saldoAcumulado)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-zinc-400 text-center">
          Ingresos = cierres de caja. Egresos = gastos registrados. Días sin actividad muestran $0.
        </p>
      </main>
    </div>
  );
}
