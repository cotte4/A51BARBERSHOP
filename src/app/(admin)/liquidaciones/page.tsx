import Link from "next/link";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { barberos, liquidaciones } from "@/db/schema";
import { formatFecha } from "@/lib/fecha";
import { formatARS } from "@/lib/format";

function formatPeriodo(inicio: string | null, fin: string | null) {
  if (inicio && fin && inicio === fin) {
    return formatFecha(inicio);
  }
  return `${formatFecha(inicio)} al ${formatFecha(fin)}`;
}

export default async function LiquidacionesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const lista = await db.select().from(liquidaciones).orderBy(desc(liquidaciones.creadoEn));
  const barberosMap = new Map((await db.select().from(barberos)).map((b) => [b.id, b]));

  const pendientes = lista.filter((item) => !item.pagado);
  const historial = lista.filter((item) => item.pagado);
  const totalPendiente = pendientes.reduce((sum, item) => sum + Number(item.montoAPagar ?? 0), 0);
  const filas = (items: typeof lista, pagadas: boolean) => (
    <ul className="mt-3 divide-y divide-zinc-800/70">
      {items.map((liq) => (
        <li key={liq.id}>
          <Link
            href={`/liquidaciones/${liq.id}`}
            className="flex items-baseline justify-between gap-4 rounded-xl py-3 hover:bg-white/4"
          >
            <span className="min-w-0">
              <span className="block font-medium text-white">
                {barberosMap.get(liq.barberoId ?? "")?.nombre ?? "Sin barbero"}
              </span>
              <span className="block text-sm text-zinc-400">
                {formatPeriodo(liq.periodoInicio, liq.periodoFin)} ·{" "}
                {liq.totalCortes === 1 ? "1 corte" : `${liq.totalCortes ?? 0} cortes`}
                {pagadas ? ` · pagada el ${formatFecha(liq.fechaPago)}` : ""}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-white">
              {formatARS(liq.montoAPagar)} <span aria-hidden="true" className="text-zinc-500">›</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen app-shell px-4 py-6 pb-24">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <section className="panel-card rounded-[28px] p-6">
          <p className="eyebrow text-xs font-semibold">Liquidaciones</p>
          <p className="mt-4 text-sm text-zinc-300">Falta pagarle al equipo</p>
          <p className="font-display mt-1 text-5xl font-bold tabular-nums tracking-tight text-white">
            {formatARS(String(totalPendiente))}
          </p>
          <Link
            href="/liquidaciones/nueva"
            className="neon-button mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-[20px] px-5 text-base font-semibold"
          >
            Nueva liquidación
          </Link>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Para pagar</h2>
          {pendientes.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No hay nada pendiente.</p>
          ) : (
            filas(pendientes, false)
          )}
        </section>

        {historial.length > 0 ? (
          <section className="panel-card rounded-[28px] p-5">
            <h2 className="font-display text-xl font-semibold text-white">Ya pagadas</h2>
            {filas(historial, true)}
          </section>
        ) : null}
      </div>
    </div>
  );
}
