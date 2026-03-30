import Link from "next/link";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { barberos, liquidaciones } from "@/db/schema";

function formatARS(value: string | null | undefined): string {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function formatPeriodo(inicio: string | null, fin: string | null) {
  const format = (value: string | null, withYear?: boolean) => {
    if (!value) return "—";
    return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: withYear ? "numeric" : undefined,
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  return `${format(inicio)} - ${format(fin, true)}`;
}

export default async function LiquidacionesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const lista = await db.select().from(liquidaciones).orderBy(desc(liquidaciones.creadoEn));
  const barberosMap = new Map((await db.select().from(barberos)).map((barbero) => [barbero.id, barbero]));

  const pendientes = lista.filter((item) => !item.pagado);
  const historial = lista.filter((item) => item.pagado);
  const totalPendiente = pendientes.reduce(
    (sum, item) => sum + Number(item.montoAPagar ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <Link href="/dashboard" className="mb-2 block text-sm text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Liquidaciones</h1>
              <p className="mt-1 text-sm text-gray-500">
                Lo urgente es saber cuánto está pendiente de pago hoy.
              </p>
            </div>
            <Link
              href="/liquidaciones/nueva"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              + Generar liquidación
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Saldo pendiente
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-emerald-950">{formatARS(String(totalPendiente))}</p>
              <p className="mt-1 text-sm text-emerald-800/80">
                {pendientes.length} liquidación(es) esperando pago.
              </p>
            </div>
            <Link
              href="/liquidaciones/nueva"
              className="inline-flex min-h-[48px] items-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Crear nueva
            </Link>
          </div>
        </section>

        <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Pendientes</h2>
              <p className="text-sm text-gray-500">Lo que necesita acción ahora.</p>
            </div>
            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
              {pendientes.length} abiertas
            </span>
          </div>

          {pendientes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No hay liquidaciones pendientes. Todo lo generado ya fue pagado.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendientes.map((liq) => {
                const barbero = barberosMap.get(liq.barberoId ?? "");
                return (
                  <Link
                    key={liq.id}
                    href={`/liquidaciones/${liq.id}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{barbero?.nombre ?? "—"}</span>
                          <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700">
                            Pendiente
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatPeriodo(liq.periodoInicio, liq.periodoFin)}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {liq.totalCortes ?? 0} cortes liquidados
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                          A pagar
                        </p>
                        <p className="mt-1 text-xl font-bold text-emerald-700">
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

        <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Historial</h2>
              <p className="text-sm text-gray-500">Liquidaciones ya pagadas.</p>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              {historial.length} pagadas
            </span>
          </div>

          {historial.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              Todavía no hay liquidaciones pagadas para mostrar.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {historial.map((liq) => {
                const barbero = barberosMap.get(liq.barberoId ?? "");
                return (
                  <Link
                    key={liq.id}
                    href={`/liquidaciones/${liq.id}`}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{barbero?.nombre ?? "—"}</span>
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                            Pagado
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatPeriodo(liq.periodoInicio, liq.periodoFin)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatARS(liq.montoAPagar)}</p>
                        <p className="mt-1 text-xs text-gray-400">{liq.totalCortes} cortes</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
