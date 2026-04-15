import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
import { auth } from "@/lib/auth";
import { calcularBep } from "@/lib/bep";
import { getDatosBep, getKpisDia, getKpisMes } from "@/lib/dashboard-queries";
import { db } from "@/db";
import { productos } from "@/db/schema";

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  const [kpisDia, kpisMes, datosBep, todosProductos] = await Promise.all([
    getKpisDia(),
    getKpisMes(mesActual, anioActual),
    getDatosBep(),
    db.select().from(productos).where(eq(productos.activo, true)),
  ]);

  const bep = calcularBep(datosBep);
  const bepProgress = getBepProgress(kpisDia.atencionesHoy, bep.cortesBep);
  const productosStockBajo = todosProductos.filter(
    (p) => (p.stockActual ?? 0) <= (p.stockMinimo ?? 5)
  );

  const accionesPrincipales = [
    {
      href: "/dashboard/pl",
      eyebrow: "Finanzas",
      title: "P&L mensual",
      detail: "Resultado detallado del negocio",
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
      href: "/dashboard/flujo",
      eyebrow: "Movimientos",
      title: "Flujo mensual",
      detail: "Ingresos y egresos por dia",
      className: "panel-soft text-zinc-100 hover:border-[#8cff59]/35 hover:text-white",
    },
  ];

  const accesosOperativos = [
    {
      href: "/gastos-rapidos",
      icon: "💸",
      title: "Historial de gastos",
      detail: "Gastos rapidos del mes",
    },
    {
      href: "/configuracion/medios-de-pago",
      icon: "💳",
      title: "Medios de pago",
      detail: "Comisiones y canales de cobro",
    },
    {
      href: "/repago",
      icon: "🔄",
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <BrandMark href="/dashboard" subtitle="Base de control" />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <section className="overflow-hidden rounded-[30px] border border-zinc-800/80 bg-[linear-gradient(120deg,rgba(8,10,10,0.98),rgba(14,16,15,0.95)_48%,rgba(8,10,10,0.98))] shadow-[0_24px_80px_rgba(28,25,23,0.18)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.18),_transparent_33%),radial-gradient(circle_at_bottom_left,_rgba(34,211,238,0.12),_transparent_30%)] p-5 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="eyebrow text-xs font-semibold">Dashboard</p>
                <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Panel ejecutivo del dia
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Lo critico arriba, lo tactico en el medio y lo historico abajo. Si hay que decidir
                  rapido, esta es la pantalla.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-zinc-200">
                    {formatFechaHoy(kpisDia.fechaHoy)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      kpisDia.cierreRealizado
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {kpisDia.cierreRealizado ? "Caja cerrada" : "Caja abierta"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-zinc-200">
                    {kpisDia.atencionesHoy} cortes hoy
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      productosStockBajo.length > 0
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                        : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                    }`}
                  >
                    {productosStockBajo.length > 0
                      ? `${productosStockBajo.length} alertas de stock`
                      : "Stock en orden"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
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

              <div className="grid gap-3">
                <div className="panel-soft rounded-[24px] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                        Estado de caja
                      </p>
                      <p className="font-display mt-2 text-3xl font-semibold text-white">
                        {kpisDia.cierreRealizado ? "Cerrada" : "Abierta"}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
                      {kpisDia.cajaNeta > 0 ? "Con movimiento" : "Sin caja"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Neto de hoy: <span className="font-semibold text-white">{formatARS(kpisDia.cajaNeta)}</span>
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                        BEP
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">{bepLabel}</p>
                    </div>
                    {!bep.sinReferencia ? (
                      <div className="rounded-2xl bg-zinc-950/70 px-3 py-2 text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                          Corte objetivo
                        </p>
                        <p className="mt-1 text-lg font-bold text-white">{bep.cortesBep}</p>
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

                <div className="panel-soft rounded-[24px] p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Pinky
                      </p>
                      <p className="font-display mt-2 text-2xl font-semibold text-white">
                        {kpisDia.atencionesPinky}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Gabote
                      </p>
                      <p className="font-display mt-2 text-2xl font-semibold text-white">
                        {kpisDia.atencionesGabote}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Mes
                      </p>
                      <p className="font-display mt-2 text-2xl font-semibold text-white">
                        {kpisMes.atencionesTotales}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-xs font-semibold">Alertas de stock</p>
              <h2 className="font-display mt-2 text-xl font-semibold text-white">
                Lo que pide atencion
              </h2>
            </div>
            <Link
              href="/inventario"
              className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-[#8cff59] hover:underline"
            >
              Ir a inventario
            </Link>
          </div>

          {productosStockBajo.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
                  Bajo stock
                </p>
                <p className="font-display mt-2 text-3xl font-semibold text-white">
                  {productosStockBajo.length}
                </p>
              </div>
              {productosStockBajo.slice(0, 3).map((producto) => (
                <Link
                  key={producto.id}
                  href={`/inventario/${producto.id}`}
                  className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 p-4 transition hover:border-amber-400/55 hover:bg-amber-500/14"
                >
                  <p className="font-semibold text-white">{producto.nombre}</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {producto.stockActual ?? 0} de {producto.stockMinimo ?? 5} minimo
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                    {(producto.stockActual ?? 0) <= 0 ? "Urgente" : "Bajo"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-4">
              <p className="font-semibold text-[#8cff59]">Inventario en orden</p>
              <p className="mt-1 text-sm text-zinc-300">No hay productos con stock bajo.</p>
            </div>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="panel-card rounded-[28px] p-5">
            <p className="eyebrow text-xs font-semibold">Finanzas y control</p>
            <h2 className="font-display mt-2 text-xl font-semibold text-white">
              Reportes que ayudan a decidir
            </h2>

            <div className="mt-4">
              <div className="panel-soft rounded-[22px] p-4">
                <p className="text-xs font-medium text-zinc-400">Casa del mes</p>
                <p className="font-display mt-2 text-2xl font-bold text-white">
                  {formatARS(kpisMes.resultadoCasaMes)}
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
                  <span className="text-lg text-[#8cff59]">→</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="panel-card rounded-[28px] p-5">
            <p className="eyebrow text-xs font-semibold">Accesos rapidos</p>
            <h2 className="font-display mt-2 text-xl font-semibold text-white">
              Gestion del negocio
            </h2>

            <div className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-[24px] border border-zinc-800">
              {accesosOperativos.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 bg-zinc-950/25 px-4 py-4 transition hover:bg-white/4"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/10 text-xl">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                  </div>
                  <span className="text-lg text-[#8cff59]">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
