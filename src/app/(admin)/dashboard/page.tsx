import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getKpisDia, getKpisMes } from "@/lib/dashboard-queries";
import { getDatosBep } from "@/lib/dashboard-queries";
import { calcularBep } from "@/lib/bep";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import { registrarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

function formatFechaHoy(fechaStr: string): string {
  return new Date(fechaStr + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") redirect("/caja");

  const hoyDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const mesActual = hoyDate.getMonth() + 1;
  const anioActual = hoyDate.getFullYear();

  const [kpisDia, kpisMes, datosBep, todosProductos] = await Promise.all([
    getKpisDia(),
    getKpisMes(mesActual, anioActual),
    getDatosBep(),
    db.select().from(productos).where(eq(productos.activo, true)),
  ]);

  const bep = calcularBep(datosBep);
  const productosStockBajo = todosProductos.filter(
    (p) => (p.stockActual ?? 0) <= (p.stockMinimo ?? 5)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">A51 Barber</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ————————————————————————————————————————
            KPIs del día
        ———————————————————————————————————————— */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Hoy — {formatFechaHoy(kpisDia.fechaHoy)}
            </h2>
            {kpisDia.cierreRealizado && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Cierre realizado
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Atenciones */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Atenciones hoy</p>
              <p className="text-2xl font-bold text-gray-900">{kpisDia.atencionesHoy}</p>
              <p className="text-xs text-gray-400 mt-1">
                Gabote {kpisDia.atencionesGabote} · Pinky {kpisDia.atencionesPinky}
              </p>
            </div>

            {/* Caja neta */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Caja neta</p>
              <p className="text-2xl font-bold text-gray-900">{formatARS(kpisDia.cajaNeta)}</p>
              <p className="text-xs text-gray-400 mt-1">Neto de medios de pago</p>
            </div>

            {/* Aporte económico casa */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Aporte casa</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatARS(kpisDia.aporteEconomicoCasa)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Incl. alquiler banco prorrateado</p>
            </div>

            {/* BEP widget */}
            <div
              className={`rounded-xl border p-4 ${
                bep.sinReferencia
                  ? "bg-gray-50 border-gray-200"
                  : bep.superado
                  ? "bg-green-50 border-green-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">BEP diario</p>
              {bep.sinReferencia ? (
                <>
                  <p className="text-sm font-semibold text-gray-500">Sin referencia</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Configurá gastos o presupuesto
                  </p>
                </>
              ) : bep.superado ? (
                <>
                  <p className="text-sm font-bold text-green-700">BEP superado</p>
                  <p className="text-xs text-green-600 mt-1">
                    {kpisDia.atencionesHoy} / {bep.cortesBep} cortes
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {bep.usandoPresupuesto ? "Usando presupuesto" : "Gastos reales"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-amber-700">
                    Faltan {bep.faltanCortes} cortes
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {kpisDia.atencionesHoy} / {bep.cortesBep} para BEP
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {bep.usandoPresupuesto ? "Usando presupuesto" : "Gastos reales"}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ————————————————————————————————————————
            KPIs del mes
        ———————————————————————————————————————— */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Mes actual
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Atenciones del mes</p>
              <p className="text-2xl font-bold text-gray-900">{kpisMes.atencionesTotales}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Saldo Memas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatARS(kpisMes.saldoMemasPendiente)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Pendiente</p>
            </div>

            <div
              className={`rounded-xl border p-4 col-span-1 ${
                kpisMes.resultadoCasaMes >= 0
                  ? "bg-white border-gray-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">Resultado casa</p>
              <p
                className={`text-2xl font-bold ${
                  kpisMes.resultadoCasaMes >= 0 ? "text-gray-900" : "text-red-700"
                }`}
              >
                {formatARS(kpisMes.resultadoCasaMes)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Acumulado del mes</p>
            </div>

            <div
              className={`rounded-xl border p-4 col-span-1 ${
                kpisMes.resultadoPinkyMes >= 0
                  ? "bg-white border-gray-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">Resultado Pinky</p>
              <p
                className={`text-2xl font-bold ${
                  kpisMes.resultadoPinkyMes >= 0 ? "text-gray-900" : "text-red-700"
                }`}
              >
                {formatARS(kpisMes.resultadoPinkyMes)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Personal acumulado</p>
            </div>
          </div>
        </section>

        {/* ————————————————————————————————————————
            Links financieros
        ———————————————————————————————————————— */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Análisis financiero
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <Link
              href="/mi-resultado"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="text-gray-900 font-medium">Mi Resultado</span>
                <p className="text-xs text-gray-400">Vista personal diaria y mensual</p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/dashboard/pl"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="text-gray-900 font-medium">P&amp;L mensual</span>
                <p className="text-xs text-gray-400">Resultado casa y Pinky detallado</p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/dashboard/flujo"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="text-gray-900 font-medium">Flujo mensual</span>
                <p className="text-xs text-gray-400">Ingresos y egresos por día</p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/dashboard/temporadas"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="text-gray-900 font-medium">Temporadas</span>
                <p className="text-xs text-gray-400">Proyectado vs real</p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </section>

        {/* ————————————————————————————————————————
            Accesos rápidos
        ———————————————————————————————————————— */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Accesos rápidos
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <Link
              href="/caja"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Caja del día</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/inventario"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Inventario</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/liquidaciones"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Liquidaciones</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/repago"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Repago Memas</span>
              <span className="text-gray-400">→</span>
            </Link>
              <Link
                href="/gastos-rapidos"
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900 font-medium">Gastos rapidos</span>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/configuracion"
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
              <span className="text-gray-900 font-medium">Configuración</span>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </section>

        {/* ————————————————————————————————————————
            Alertas de stock (al final)
        ———————————————————————————————————————— */}
        {productosStockBajo.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
              Stock bajo ({productosStockBajo.length} producto
              {productosStockBajo.length !== 1 ? "s" : ""})
            </h2>
            <div className="flex flex-col gap-3">
              {productosStockBajo.map((p) => (
                <div
                  key={p.id}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{p.nombre}</span>
                        <span className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">
                          Stock bajo
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Stock actual:{" "}
                        <span className="font-medium text-gray-900">{p.stockActual ?? 0}</span>
                        <span className="mx-1 text-gray-400">/</span>
                        Mínimo:{" "}
                        <span className="font-medium text-gray-900">{p.stockMinimo ?? 5}</span>
                      </p>
                    </div>
                    <Link
                      href={`/inventario/${p.id}`}
                      className="flex-shrink-0 text-sm text-amber-700 hover:text-amber-900 underline"
                    >
                      Ver →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-700 font-medium">Inventario en orden</p>
          </div>
        )}
      </main>

      <GastoRapidoFAB
        action={registrarGastoRapidoAction}
        returnTo="/dashboard"
        historyHref="/gastos-rapidos"
      />
    </div>
  );
}
