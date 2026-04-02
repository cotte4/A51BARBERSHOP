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
  const hayDeuda = totalPendiente > 0;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 pb-24">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">

        {/* Header */}
        <div>
          <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-zinc-400">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Liquidaciones</h1>
          <p className="mt-1 text-sm text-zinc-500">Lo urgente es saber cuánto está pendiente de pago hoy.</p>
        </div>

        {/* Saldo pendiente hero */}
        <section className={`overflow-hidden rounded-[28px] border ${hayDeuda ? "border-[#8cff59]/25 bg-zinc-900" : "border-zinc-800 bg-zinc-900"}`}>
          <div className={hayDeuda ? "bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.08),_transparent_50%)] p-5" : "p-5"}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Saldo pendiente
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                {hayDeuda ? (
                  <>
                    <p className="text-4xl font-bold tracking-tight text-[#8cff59]">
                      {formatARS(String(totalPendiente))}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {pendientes.length} liquidación{pendientes.length !== 1 ? "es" : ""} esperando pago.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold tracking-tight text-zinc-600">$0</p>
                    <p className="mt-1 text-sm text-zinc-500">Todo lo generado ya fue pagado.</p>
                  </>
                )}
              </div>

              <Link
                href="/liquidaciones/nueva"
                className="inline-flex min-h-[44px] items-center rounded-2xl bg-[#8cff59] px-5 text-sm font-semibold text-[#07130a] hover:bg-[#a8ff80]"
              >
                + Nueva liquidación
              </Link>
            </div>
          </div>
        </section>

        {/* Pendientes */}
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Pendientes</h2>
              <p className="text-sm text-zinc-500">Lo que necesita acción ahora.</p>
            </div>
            {pendientes.length > 0 ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                {pendientes.length} abiertas
              </span>
            ) : null}
          </div>

          {pendientes.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-sm text-zinc-500">
              No hay liquidaciones pendientes.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pendientes.map((liq) => {
                const barbero = barberosMap.get(liq.barberoId ?? "");
                const monto = Number(liq.montoAPagar ?? 0);
                return (
                  <Link
                    key={liq.id}
                    href={`/liquidaciones/${liq.id}`}
                    className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4 transition hover:border-[#8cff59]/20 hover:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{barbero?.nombre ?? "—"}</span>
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                            Pendiente
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatPeriodo(liq.periodoInicio, liq.periodoFin)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {liq.totalCortes ?? 0} cortes liquidados
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">A pagar</p>
                        <p className={`mt-1 text-xl font-bold ${monto > 0 ? "text-[#8cff59]" : "text-zinc-400"}`}>
                          {formatARS(liq.montoAPagar)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Historial */}
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Historial</h2>
              <p className="text-sm text-zinc-500">Liquidaciones ya pagadas.</p>
            </div>
            {historial.length > 0 ? (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                {historial.length} pagadas
              </span>
            ) : null}
          </div>

          {historial.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-sm text-zinc-500">
              Todavía no hay liquidaciones pagadas.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {historial.map((liq) => {
                const barbero = barberosMap.get(liq.barberoId ?? "");
                return (
                  <Link
                    key={liq.id}
                    href={`/liquidaciones/${liq.id}`}
                    className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4 transition hover:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{barbero?.nombre ?? "—"}</span>
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                            Pagado
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatPeriodo(liq.periodoInicio, liq.periodoFin)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-zinc-300">{formatARS(liq.montoAPagar)}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">{liq.totalCortes} cortes</p>
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
