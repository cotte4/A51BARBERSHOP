import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
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
      href: "/liquidaciones",
      eyebrow: "Gestion",
      title: "Liquidaciones",
      detail: "Pendientes, pagos y comprobantes",
      className: "neon-button",
    },
    {
      href: "/inventario",
      eyebrow: "Control",
      title: "Inventario",
      detail: "Stock, rotacion y alertas de reposicion",
      className: "ghost-button",
    },
    {
      href: "/turnos",
      eyebrow: "Agenda",
      title: "Turnos",
      detail: "Disponibilidad y agenda del equipo",
      className: "panel-soft text-zinc-100 hover:border-[#8cff59]/35 hover:text-white",
    },
  ];

  const accesosOperativos = [
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
    {
      href: "/repago",
      icon: "RE",
      title: "Repago",
      detail: "Seguir cuotas y saldo pendiente",
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
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandMark href="/dashboard" subtitle="Base de control" />
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
                <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Todo lo critico esta a mano.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300">
                  El dashboard ahora es la base de gestion: estado del negocio, alertas y accesos administrativos sin duplicar la operacion diaria.
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
          <div className="panel-card rounded-[28px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">
                  Mi dia
                </p>
                <h3 className="font-display mt-2 text-2xl font-semibold text-white">
                  {kpisDia.atencionesHoy} cortes hoy
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Mi ganancia estimada hoy:{" "}
                  <span className="font-semibold text-white">
                    {formatARS(miResultado.resultado.paraVosHoy)}
                  </span>
                </p>
              </div>
              <div className="panel-soft rounded-2xl px-3 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Caja neta
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {formatARS(kpisDia.cajaNeta)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="panel-soft rounded-2xl p-4">
                <p className="text-xs font-medium text-zinc-400">Tus cortes</p>
                <p className="font-display mt-2 text-3xl font-bold text-white">{kpisDia.atencionesPinky}</p>
              </div>
              <div className="panel-soft rounded-2xl p-4">
                <p className="text-xs font-medium text-zinc-400">Agentes</p>
                <p className="font-display mt-2 text-3xl font-bold text-white">{kpisDia.atencionesGabote}</p>
              </div>
              <div className="panel-soft rounded-2xl p-4">
                <p className="text-xs font-medium text-zinc-400">Mes en curso</p>
                <p className="font-display mt-2 text-3xl font-bold text-white">{kpisMes.atencionesTotales}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
                    Objetivo del dia
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">{bepLabel}</p>
                  {!bep.sinReferencia ? (
                    <p className="mt-1 text-xs text-zinc-300">
                      {bep.usandoPresupuesto ? "Calculado con presupuesto mensual." : "Calculado con gastos reales."}
                    </p>
                  ) : null}
                </div>
                {!bep.sinReferencia ? (
                  <div className="rounded-2xl bg-zinc-950/70 px-3 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      BEP
                    </p>
                    <p className="mt-1 text-lg font-bold text-white">{bep.cortesBep} cortes</p>
                  </div>
                ) : null}
              </div>

              {!bep.sinReferencia ? (
                <div className="mt-4">
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-900/70">
                    <div
                      className="h-full rounded-full bg-[#8cff59] transition-all"
                      style={{ width: `${bepProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-300">
                    <span>{kpisDia.atencionesHoy} hechos</span>
                    <span>{bep.faltanCortes > 0 ? `${bep.faltanCortes} por hacer` : "Objetivo cumplido"}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel-card rounded-[28px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">
                  Accesos rapidos
                </p>
                <h3 className="font-display mt-2 text-xl font-semibold text-white">Gestion del negocio</h3>
              </div>
              <Link
                href="/turnos"
                className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-[#8cff59] hover:underline"
              >
                Ver agenda
              </Link>
            </div>

            <div className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-[24px] border border-zinc-800">
              {accesosOperativos.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 bg-zinc-950/25 px-4 py-4 transition hover:bg-white/4"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8cff59] text-xs font-bold tracking-[0.2em] text-[#08130a]">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                  </div>
                  <span className="text-lg text-[#8cff59]">+</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="panel-card rounded-[28px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">
                  Alertas
                </p>
                <h3 className="font-display mt-2 text-xl font-semibold text-white">Lo que pide atencion</h3>
              </div>
              <Link
                href="/inventario"
                className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-[#8cff59] hover:underline"
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
                    className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 p-4 transition hover:border-amber-400/55 hover:bg-amber-500/14"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{producto.nombre}</p>
                        <p className="mt-1 text-sm text-zinc-300">
                          Stock actual {producto.stockActual ?? 0} de minimo {producto.stockMinimo ?? 5}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-950 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Bajo
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-5">
                <p className="font-semibold text-[#8cff59]">Inventario en orden</p>
                <p className="mt-1 text-sm text-zinc-300">
                  Hoy no hay productos con stock bajo.
                </p>
              </div>
            )}
          </div>

          <div className="panel-card rounded-[28px] p-5">
            <p className="eyebrow text-xs font-semibold">
              Finanzas y control
            </p>
            <h3 className="font-display mt-2 text-xl font-semibold text-white">
              Reportes fuera del camino
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Siguen disponibles, pero ya no dominan la pantalla principal.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="panel-soft rounded-[22px] p-4">
                <p className="text-xs font-medium text-zinc-400">Casa del mes</p>
                <p className="font-display mt-2 text-2xl font-bold text-white">
                  {formatARS(kpisMes.resultadoCasaMes)}
                </p>
              </div>
              <div className="panel-soft rounded-[22px] p-4">
                <p className="text-xs font-medium text-zinc-400">Mi resultado mes</p>
                <p className="font-display mt-2 text-2xl font-bold text-white">
                  {formatARS(miResultado.resultado.paraVosMes)}
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-[24px] border border-zinc-800">
              {finanzasSecundarias.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-white/4"
                >
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                  </div>
                  <span className="text-lg text-[#8cff59]">+</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
