import Link from "next/link";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { barberos, liquidaciones } from "@/db/schema";
import { formatFecha } from "@/lib/fecha";

function formatARS(value: string | null | undefined): string {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function formatPeriodo(inicio: string | null, fin: string | null) {
  if (inicio && fin && inicio === fin) {
    return formatFecha(inicio);
  }
  return `${formatFecha(inicio)} - ${formatFecha(fin)}`;
}

function StatCard({
  label,
  value,
  hint,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div className="panel-soft rounded-[24px] p-4">
      <p className="eyebrow text-[10px]">{label}</p>
      <p className={`mt-3 font-display text-3xl font-semibold tracking-tight ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{hint}</p>
    </div>
  );
}

export default async function LiquidacionesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const lista = await db.select().from(liquidaciones).orderBy(desc(liquidaciones.creadoEn));
  const barberosMap = new Map((await db.select().from(barberos)).map((b) => [b.id, b]));

  const pendientes = lista.filter((item) => !item.pagado);
  const historial = lista.filter((item) => item.pagado);
  const totalPendiente = pendientes.reduce((sum, item) => sum + Number(item.montoAPagar ?? 0), 0);
  const totalPagado = historial.reduce((sum, item) => sum + Number(item.montoAPagar ?? 0), 0);
  const hayDeuda = totalPendiente > 0;

  return (
    <div className="min-h-screen app-shell px-4 py-6 pb-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <Link href="/dashboard" className="eyebrow text-xs text-zinc-500 hover:text-zinc-300">
          ← Dashboard
        </Link>

        <section className="panel-card overflow-hidden rounded-[32px]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.14),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(140,255,89,0.06),_transparent_30%)] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow text-xs">Liquidaciones</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Control de pagos
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-zinc-300">
                  Priorizamos lo pendiente, dejamos claro lo ya pagado y hacemos que cada
                  liquidacion se abra con contexto suficiente para decidir rapido.
                </p>
              </div>

              <Link
                href="/liquidaciones/nueva"
                className="neon-button inline-flex min-h-[44px] items-center rounded-2xl px-5 text-sm font-semibold"
              >
                + Nueva liquidacion
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <StatCard
                label="Saldo pendiente"
                value={formatARS(String(totalPendiente))}
                hint={hayDeuda ? "Listo para revisar y pagar." : "No hay deuda abierta hoy."}
                valueClassName={hayDeuda ? "text-[#8cff59]" : "text-zinc-400"}
              />
              <StatCard
                label="Pendientes"
                value={String(pendientes.length)}
                hint="Liquidaciones que todavia requieren accion."
                valueClassName={pendientes.length > 0 ? "text-white" : "text-zinc-400"}
              />
              <StatCard
                label="Pagadas"
                value={String(historial.length)}
                hint={`${formatARS(String(totalPagado))} ya cerrados en el historial.`}
                valueClassName="text-emerald-300"
              />
            </div>

          </div>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-[10px]">Pendientes de pago</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Lo que pide accion ahora
              </h2>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {pendientes.length} abiertas
            </span>
          </div>

          {pendientes.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-zinc-700 bg-black/20 p-6 text-sm text-zinc-400">
              No hay liquidaciones pendientes. Todo lo generado ya paso a historial.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendientes.map((liq) => {
                const barbero = barberosMap.get(liq.barberoId ?? "");
                const monto = Number(liq.montoAPagar ?? 0);
                return (
                  <Link
                    key={liq.id}
                    href={`/liquidaciones/${liq.id}`}
                    className="group block rounded-[24px] border border-zinc-800 bg-zinc-950 p-4 transition hover:border-[#8cff59]/30 hover:bg-zinc-900"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-white">
                            {barbero?.nombre ?? "Sin barbero"}
                          </span>
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                            Pendiente
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {formatPeriodo(liq.periodoInicio, liq.periodoFin)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                            {liq.totalCortes ?? 0} cortes
                          </span>
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                            Generada {formatFecha(liq.creadoEn)}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="eyebrow text-[10px]">A pagar</p>
                        <p className={`mt-1 font-display text-3xl font-semibold tracking-tight ${monto > 0 ? "text-[#8cff59]" : "text-zinc-400"}`}>
                          {formatARS(liq.montoAPagar)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-300">
                          Ver liquidacion
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-[10px]">Historial</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Liquidaciones cerradas
              </h2>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {historial.length} pagadas
            </span>
          </div>

          {historial.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-zinc-700 bg-black/20 p-6 text-sm text-zinc-400">
              Todavia no hay liquidaciones pagadas.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {historial.map((liq) => {
                const barbero = barberosMap.get(liq.barberoId ?? "");
                return (
                  <Link
                    key={liq.id}
                    href={`/liquidaciones/${liq.id}`}
                    className="group block rounded-[24px] border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-white">
                            {barbero?.nombre ?? "Sin barbero"}
                          </span>
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                            Pagada
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {formatPeriodo(liq.periodoInicio, liq.periodoFin)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                            {liq.totalCortes ?? 0} cortes
                          </span>
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                            Pagada {formatFecha(liq.fechaPago)}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="font-display text-2xl font-semibold tracking-tight text-zinc-100">
                          {formatARS(liq.montoAPagar)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-300">
                          Revisar archivo
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
