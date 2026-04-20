import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisBalance } from "@/db/schema";
import { auth } from "@/lib/auth";
import { totalOvnisInCirculation } from "@/lib/ovnis-server";
import { formatOvnis } from "@/lib/ovnis";
import { eq } from "drizzle-orm";

function KpiCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="panel-soft rounded-[22px] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className={`font-display mt-2 text-2xl font-bold ${colorClass}`}>
        {formatOvnis(value)}
      </p>
    </div>
  );
}

export default async function OvnisDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "asesor") redirect("/caja");

  const [stats, top5Rows] = await Promise.all([
    totalOvnisInCirculation(),
    db
      .select({
        balance: ovnisBalance.balance,
        clientName: clients.name,
        clientId: clients.id,
      })
      .from(ovnisBalance)
      .innerJoin(clients, eq(ovnisBalance.clientId, clients.id))
      .orderBy(desc(ovnisBalance.balance))
      .limit(5),
  ]);

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-xs font-semibold">Economía de OVNIS</p>
            <h1 className="font-display mt-1 text-xl font-semibold text-white">
              Dashboard OVNIS
            </h1>
          </div>
          <Link href="/configuracion/ovnis" className="text-sm text-zinc-400 hover:text-[#8cff59]">
            Configurar →
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        {stats.driftAlert && (
          <div className="rounded-[22px] border border-red-500/35 bg-red-500/10 p-5 text-red-300">
            <p className="text-lg font-bold">⚠ ALERTA DE DERIVA</p>
            <p className="mt-1 text-sm">
              Los OVNIS en sistema no cuadran. Revisar transacciones huérfanas.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span>Net en sistema: {stats.netInSystem}</span>
              <span>Contabilizado: {stats.inBalance + stats.inPendingBalance + stats.inPendingRedemptions}</span>
            </div>
          </div>
        )}

        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">Circulación</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Disponible" value={stats.inBalance} colorClass="text-[#8cff59]" />
            <KpiCard label="Bloqueado en apuestas" value={stats.inPendingBalance} colorClass="text-amber-300" />
            <KpiCard label="Créditos sin escanear" value={stats.inPendingCredits} colorClass="text-zinc-300" />
            <KpiCard label="Premios pendientes entrega" value={stats.inPendingRedemptions} colorClass="text-amber-300" />
            <KpiCard label="Total en sistema" value={stats.netInSystem} colorClass="text-white" />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="panel-soft rounded-[18px] px-4 py-3">
              <p className="text-xs text-zinc-500">Emitido histórico</p>
              <p className="mt-1 font-semibold text-[#8cff59]">{formatOvnis(stats.emittedTotal)}</p>
            </div>
            <div className="panel-soft rounded-[18px] px-4 py-3">
              <p className="text-xs text-zinc-500">Quemado histórico</p>
              <p className="mt-1 font-semibold text-red-300">{formatOvnis(stats.burnedTotal)}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/ovnis/pendientes"
            className="panel-card rounded-[22px] p-4 hover:-translate-y-0.5"
          >
            <p className="eyebrow text-xs font-semibold">Pendientes</p>
            <p className="mt-2 font-semibold text-white">Premios a entregar →</p>
          </Link>
          <Link
            href="/ovnis/disputas"
            className="panel-card rounded-[22px] p-4 hover:-translate-y-0.5"
          >
            <p className="eyebrow text-xs font-semibold">Disputas</p>
            <p className="mt-2 font-semibold text-white">Apuestas en disputa →</p>
          </Link>
          <Link
            href="/ovnis/ajustes"
            className="panel-card rounded-[22px] p-4 hover:-translate-y-0.5"
          >
            <p className="eyebrow text-xs font-semibold">Ajustes</p>
            <p className="mt-2 font-semibold text-white">Ajuste manual →</p>
          </Link>
        </section>

        {top5Rows.length > 0 && (
          <section className="panel-card rounded-[28px] p-5">
            <p className="eyebrow text-xs font-semibold">Top balances</p>
            <div className="mt-4 divide-y divide-zinc-800">
              {top5Rows.map((row, i) => (
                <div key={row.clientId} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm font-bold text-zinc-500">
                      {i + 1}
                    </span>
                    <span className="font-medium text-white">{row.clientName}</span>
                  </div>
                  <span className="font-semibold text-[#8cff59]">{formatOvnis(row.balance)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
