import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import LogoutButton from "@/components/LogoutButton";
import { registrarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";
import { auth } from "@/lib/auth";
import { calcularBep } from "@/lib/bep";
import { getDatosBep, getKpisDia, getKpisMes } from "@/lib/dashboard-queries";
import { getMiResultadoData } from "@/lib/mi-resultado-queries";
import { db } from "@/db";
import { productos } from "@/db/schema";

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatFechaHoy(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function getBepProgress(actual: number, objetivo: number): number {
  if (objetivo <= 0) return 0;
  return Math.min(100, Math.round((actual / objetivo) * 100));
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  const [kpisDia, kpisMes, datosBep, miResultado, todosProductos] = await Promise.all([
    getKpisDia(),
    getKpisMes(mesActual, anioActual),
    getDatosBep(),
    getMiResultadoData(),
    db.select().from(productos).where(eq(productos.activo, true)),
  ]);

  const bep = calcularBep(datosBep);
  const bepProgress = getBepProgress(kpisDia.atencionesHoy, bep.cortesBep);
  const productosStockBajo = todosProductos.filter(
    (producto) => (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 5)
  );

  const accionesPrincipales = [
    {
      href: "/caja/nueva",
      eyebrow: "Accion principal",
      title: "Cobrar corte",
      detail: "Registrar una atencion en segundos",
      className: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400",
    },
    {
      href: "/turnos",
      eyebrow: "Agenda",
      title: "Ver agenda",
      detail: "Pendientes, confirmados y completados",
      className: "bg-sky-500 text-sky-950 hover:bg-sky-400",
    },
    {
      href: "/gastos-rapidos",
      eyebrow: "Caja",
      title: "Gasto rapido",
      detail: "Anotar una salida sin friccion",
      className: "bg-amber-300 text-amber-950 hover:bg-amber-200",
    },
  ];

  const accesosOperativos = [
    {
      href: "/caja",
      icon: "CA",
      title: "Caja del dia",
      detail: "Ver atenciones, editar cobros y cerrar la jornada",
    },
    {
      href: "/inventario",
      icon: "IN",
      title: "Inventario",
      detail: `${productosStockBajo.length} producto${productosStockBajo.length === 1 ? "" : "s"} en alerta`,
    },
    {
      href: "/liquidaciones",
      icon: "LI",
      title: "Liquidaciones",
      detail: "Pagos, pendientes y comprobantes",
    },
    {
      href: "/mi-resultado",
      icon: "MC",
      title: "Mi cuenta",
      detail: "Revisar mi resultado y saldos sin verlo en la portada",
    },
  ];

  const finanzasSecundarias = [
    {
      href: "/dashboard/pl",
      title: "P&L mensual",
      detail: "Resultado detallado del negocio",
    },
    {
      href: "/dashboard/flujo",
      title: "Flujo mensual",
      detail: "Ingresos y egresos por dia",
    },
    {
      href: "/dashboard/temporadas",
      title: "Temporadas",
      detail: "Proyectado vs real",
    },
  ];

  const bepLabel = bep.sinReferencia
    ? "Todavia no hay referencia para el objetivo diario."
    : bep.superado
    ? `Objetivo cubierto con ${kpisDia.atencionesHoy} de ${bep.cortesBep} cortes.`
    : `${kpisDia.atencionesHoy} de ${bep.cortesBep} cortes para cubrir el dia.`;

  return (
    <div className="min-h-screen bg-stone-100 pb-28">
      <header className="border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              A51 Barber
            </p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">Panel operativo</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <section className="overflow-hidden rounded-[28px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.18)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.35),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.24),_transparent_30%)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm capitalize text-stone-300">
                  {formatFechaHoy(kpisDia.fechaHoy)}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  Lo importante esta a mano.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300">
                  Cobra, mira tu agenda y registra movimientos sin entrar a reportes largos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {kpisDia.cierreRealizado ? (
                  <span className="rounded-full bg-emerald-500/16 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Caja cerrada
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-400/16 px-3 py-1 text-xs font-semibold text-amber-200">
                    Caja abierta
                  </span>
                )}
                <Link
                  href="/configuracion"
                  className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-stone-200 transition hover:border-white/30 hover:bg-white/6"
                >
                  Configuracion
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {accionesPrincipales.map((accion) => (
                <Link
                  key={accion.href}
                  href={accion.href}
                  className={`rounded-[24px] p-5 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 ${accion.className}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">
                    {accion.eyebrow}
                  </p>
                  <p className="mt-3 text-2xl font-bold">{accion.title}</p>
                  <p className="mt-2 text-sm leading-5 opacity-80">{accion.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  Mi dia
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-stone-900">
                  {kpisDia.atencionesHoy} cortes hoy
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Mi ganancia estimada hoy:{" "}
                  <span className="font-semibold text-stone-900">
                    {formatARS(miResultado.resultado.paraVosHoy)}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl bg-stone-100 px-3 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Caja neta
                </p>
                <p className="mt-1 text-lg font-bold text-stone-900">
                  {formatARS(kpisDia.cajaNeta)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="text-xs font-medium text-stone-500">Tus cortes</p>
                <p className="mt-2 text-3xl font-bold text-stone-950">{kpisDia.atencionesPinky}</p>
              </div>
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="text-xs font-medium text-stone-500">Equipo</p>
                <p className="mt-2 text-3xl font-bold text-stone-950">{kpisDia.atencionesGabote}</p>
              </div>
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="text-xs font-medium text-stone-500">Mes en curso</p>
                <p className="mt-2 text-3xl font-bold text-stone-950">{kpisMes.atencionesTotales}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                    Objetivo del dia
                  </p>
                  <p className="mt-2 text-sm font-medium text-emerald-950">{bepLabel}</p>
                  {!bep.sinReferencia ? (
                    <p className="mt-1 text-xs text-emerald-800/80">
                      {bep.usandoPresupuesto ? "Calculado con presupuesto mensual." : "Calculado con gastos reales."}
                    </p>
                  ) : null}
                </div>
                {!bep.sinReferencia ? (
                  <div className="rounded-2xl bg-white px-3 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      BEP
                    </p>
                    <p className="mt-1 text-lg font-bold text-stone-900">{bep.cortesBep} cortes</p>
                  </div>
                ) : null}
              </div>

              {!bep.sinReferencia ? (
                <div className="mt-4">
                  <div className="h-3 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${bepProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-emerald-900/80">
                    <span>{kpisDia.atencionesHoy} hechos</span>
                    <span>{bep.faltanCortes > 0 ? `${bep.faltanCortes} por hacer` : "Objetivo cumplido"}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  Accesos rapidos
                </p>
                <h3 className="mt-2 text-xl font-semibold text-stone-900">Operacion diaria</h3>
              </div>
              <Link
                href="/turnos"
                className="text-sm font-medium text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline"
              >
                Ver agenda
              </Link>
            </div>

            <div className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-[24px] border border-stone-100">
              {accesosOperativos.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 bg-white px-4 py-4 transition hover:bg-stone-50"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-xs font-bold tracking-[0.2em] text-white">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-900">{item.title}</p>
                    <p className="mt-1 text-sm text-stone-500">{item.detail}</p>
                  </div>
                  <span className="text-lg text-stone-300">+</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  Alertas
                </p>
                <h3 className="mt-2 text-xl font-semibold text-stone-900">Lo que pide atencion</h3>
              </div>
              <Link
                href="/inventario"
                className="text-sm font-medium text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline"
              >
                Ir a inventario
              </Link>
            </div>

            {productosStockBajo.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {productosStockBajo.slice(0, 4).map((producto) => (
                  <Link
                    key={producto.id}
                    href={`/inventario/${producto.id}`}
                    className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300 hover:bg-amber-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-900">{producto.nombre}</p>
                        <p className="mt-1 text-sm text-stone-600">
                          Stock actual {producto.stockActual ?? 0} de minimo {producto.stockMinimo ?? 5}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                        Bajo
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5">
                <p className="font-semibold text-emerald-900">Inventario en orden</p>
                <p className="mt-1 text-sm text-emerald-800/80">
                  Hoy no hay productos con stock bajo.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Finanzas y control
            </p>
            <h3 className="mt-2 text-xl font-semibold text-stone-900">
              Reportes fuera del camino
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Siguen disponibles, pero ya no dominan la pantalla principal.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-stone-100 p-4">
                <p className="text-xs font-medium text-stone-500">Casa del mes</p>
                <p className="mt-2 text-2xl font-bold text-stone-950">
                  {formatARS(kpisMes.resultadoCasaMes)}
                </p>
              </div>
              <div className="rounded-[22px] bg-stone-100 p-4">
                <p className="text-xs font-medium text-stone-500">Mi resultado mes</p>
                <p className="mt-2 text-2xl font-bold text-stone-950">
                  {formatARS(miResultado.resultado.paraVosMes)}
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-[24px] border border-stone-100">
              {finanzasSecundarias.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-stone-50"
                >
                  <div>
                    <p className="font-semibold text-stone-900">{item.title}</p>
                    <p className="mt-1 text-sm text-stone-500">{item.detail}</p>
                  </div>
                  <span className="text-lg text-stone-300">+</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-4 z-20 px-4">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-full border border-stone-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
          <Link
            href="/dashboard"
            className="flex-1 rounded-full bg-stone-900 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Inicio
          </Link>
          <Link
            href="/mi-resultado"
            className="flex-1 px-4 py-3 text-center text-sm font-semibold text-stone-600 transition hover:text-stone-900"
          >
            Finanzas
          </Link>
          <Link
            href="/configuracion"
            className="flex-1 px-4 py-3 text-center text-sm font-semibold text-stone-600 transition hover:text-stone-900"
          >
            Ajustes
          </Link>
        </div>
      </nav>

      <GastoRapidoFAB
        action={registrarGastoRapidoAction}
        returnTo="/dashboard"
        historyHref="/gastos-rapidos"
      />
    </div>
  );
}
