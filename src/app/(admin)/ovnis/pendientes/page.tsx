import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisRedemptionItems, ovnisRedemptions } from "@/db/schema";
import { auth } from "@/lib/auth";
import RedemptionRow from "./_RedemptionRow";

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

export default async function PendientesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "asesor") redirect("/caja");

  const pendientes = await db
    .select({
      id: ovnisRedemptions.id,
      costOvnis: ovnisRedemptions.costOvnis,
      redeemedAt: ovnisRedemptions.redeemedAt,
      clientName: clients.name,
      prizeLabel: ovnisRedemptionItems.label,
    })
    .from(ovnisRedemptions)
    .innerJoin(clients, eq(ovnisRedemptions.clientId, clients.id))
    .innerJoin(ovnisRedemptionItems, eq(ovnisRedemptions.itemId, ovnisRedemptionItems.id))
    .where(eq(ovnisRedemptions.status, "pending"))
    .orderBy(ovnisRedemptions.redeemedAt);

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
              Premios pendientes
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 pb-24">
        {pendientes.length === 0 ? (
          <div className="panel-card rounded-[28px] p-8 text-center">
            <p className="font-semibold text-white">Todo entregado</p>
            <p className="mt-1 text-sm text-zinc-400">No hay premios pendientes de entrega.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              {pendientes.length} premio{pendientes.length !== 1 ? "s" : ""} pendiente
              {pendientes.length !== 1 ? "s" : ""}
            </p>
            {pendientes.map((p) => (
              <RedemptionRow
                key={p.id}
                id={p.id}
                clientName={p.clientName}
                prizeLabel={p.prizeLabel}
                costOvnis={p.costOvnis}
                redeemedAt={formatFechaAr(p.redeemedAt)}
              />
            ))}
          </>
        )}
      </main>
    </div>
  );
}
