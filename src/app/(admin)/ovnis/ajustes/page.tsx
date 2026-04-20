import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisTransactions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatOvnis } from "@/lib/ovnis";
import AjustePanel from "./_AjustePanel";

function formatFechaAr(date: Date) {
  return date.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AjustesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "asesor") redirect("/caja");

  const recentAdjusts = await db
    .select({
      id: ovnisTransactions.id,
      amount: ovnisTransactions.amount,
      description: ovnisTransactions.description,
      createdAt: ovnisTransactions.createdAt,
      clientName: clients.name,
    })
    .from(ovnisTransactions)
    .innerJoin(clients, eq(ovnisTransactions.clientId, clients.id))
    .where(eq(ovnisTransactions.type, "admin_adjust"))
    .orderBy(desc(ovnisTransactions.createdAt))
    .limit(10);

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link href="/ovnis" className="text-sm text-zinc-400 hover:text-[#8cff59]">
            ← OVNIS
          </Link>
          <div>
            <p className="eyebrow text-xs font-semibold">Economía de OVNIS</p>
            <h1 className="font-display mt-1 text-xl font-semibold text-white">
              Ajustes manuales
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">Ajustar balance</p>
          <AjustePanel />
        </section>

        {recentAdjusts.length > 0 && (
          <section className="panel-card rounded-[28px] p-5">
            <p className="eyebrow text-xs font-semibold">Últimos ajustes</p>
            <div className="mt-4 divide-y divide-zinc-800">
              {recentAdjusts.map((tx) => (
                <div key={tx.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{tx.clientName}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">{tx.description}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{formatFechaAr(tx.createdAt)}</p>
                  </div>
                  <span
                    className={`font-semibold ${
                      tx.amount > 0 ? "text-[#8cff59]" : "text-red-300"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {formatOvnis(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
