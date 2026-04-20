import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, aliasedTable } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisBets, ovnisGames } from "@/db/schema";
import { auth } from "@/lib/auth";
import DisputaRow from "./_DisputaRow";

export default async function DisputasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "asesor") redirect("/caja");

  const challengers = aliasedTable(clients, "challengers");
  const opponents = aliasedTable(clients, "opponents");

  const disputas = await db
    .select({
      id: ovnisBets.id,
      amount: ovnisBets.amount,
      claimAttempts: ovnisBets.claimAttempts,
      challengerClaim: ovnisBets.challengerClaim,
      opponentClaim: ovnisBets.opponentClaim,
      challengerId: ovnisBets.challengerId,
      opponentId: ovnisBets.opponentId,
      challengerName: challengers.name,
      opponentName: opponents.name,
      gameName: ovnisGames.nombre,
    })
    .from(ovnisBets)
    .innerJoin(challengers, eq(ovnisBets.challengerId, challengers.id))
    .innerJoin(opponents, eq(ovnisBets.opponentId, opponents.id))
    .innerJoin(ovnisGames, eq(ovnisBets.gameId, ovnisGames.id))
    .where(eq(ovnisBets.status, "disputed"))
    .orderBy(ovnisBets.createdAt);

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
              Disputas
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 pb-24">
        {disputas.length === 0 ? (
          <div className="panel-card rounded-[28px] p-8 text-center">
            <p className="font-semibold text-white">Sin disputas</p>
            <p className="mt-1 text-sm text-zinc-400">No hay apuestas en disputa en este momento.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              {disputas.length} disputa{disputas.length !== 1 ? "s" : ""} activa
              {disputas.length !== 1 ? "s" : ""}
            </p>
            {disputas.map((d) => (
              <DisputaRow
                key={d.id}
                betId={d.id}
                challengerName={d.challengerName}
                challengerId={d.challengerId}
                opponentName={d.opponentName}
                opponentId={d.opponentId}
                gameName={d.gameName}
                amount={d.amount}
                claimAttempts={d.claimAttempts}
                challengerClaim={d.challengerClaim}
                opponentClaim={d.opponentClaim}
              />
            ))}
          </>
        )}
      </main>
    </div>
  );
}
