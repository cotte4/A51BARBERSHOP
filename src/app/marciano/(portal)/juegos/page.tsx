import Link from "next/link";
import { and, eq, inArray, or } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisBets, ovnisGames, ovnisBalance } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { formatOvnis } from "@/lib/ovnis";
import CrearApuestaPanel from "./_CrearApuestaPanel";

const STATUS_LABELS: Record<string, string> = {
  pending: "Esperando aceptación",
  accepted: "En juego",
  disputed: "En disputa",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  accepted: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]",
  disputed: "border-red-500/35 bg-red-500/10 text-red-300",
};

export default async function JuegosPage() {
  const { client } = await requireMarcianoClient();

  const challengers = aliasedTable(clients, "challengers");
  const opponents = aliasedTable(clients, "opponents");

  const [games, activeBets, balanceRow] = await Promise.all([
    db
      .select({
        id: ovnisGames.id,
        nombre: ovnisGames.nombre,
        externalUrl: ovnisGames.externalUrl,
      })
      .from(ovnisGames)
      .where(eq(ovnisGames.activo, true)),
    db
      .select({
        id: ovnisBets.id,
        amount: ovnisBets.amount,
        status: ovnisBets.status,
        challengerId: ovnisBets.challengerId,
        opponentId: ovnisBets.opponentId,
        challengerName: challengers.name,
        opponentName: opponents.name,
        gameName: ovnisGames.nombre,
        externalUrl: ovnisGames.externalUrl,
        createdAt: ovnisBets.createdAt,
        acceptanceExpiresAt: ovnisBets.acceptanceExpiresAt,
      })
      .from(ovnisBets)
      .innerJoin(challengers, eq(ovnisBets.challengerId, challengers.id))
      .innerJoin(opponents, eq(ovnisBets.opponentId, opponents.id))
      .innerJoin(ovnisGames, eq(ovnisBets.gameId, ovnisGames.id))
      .where(
        and(
          or(
            eq(ovnisBets.challengerId, client.id),
            eq(ovnisBets.opponentId, client.id)
          ),
          inArray(ovnisBets.status, ["pending", "accepted", "disputed"])
        )
      )
      .orderBy(ovnisBets.createdAt),
    db
      .select({ balance: ovnisBalance.balance })
      .from(ovnisBalance)
      .where(eq(ovnisBalance.clientId, client.id))
      .limit(1),
  ]);

  const balance = balanceRow[0]?.balance ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow text-xs">Juegos Marcianos</p>
        <p className="font-display mt-1 text-xl font-semibold text-white">Apuestas</p>
      </div>

      {/* Active bets */}
      {activeBets.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-zinc-400">
            {activeBets.length} apuesta{activeBets.length !== 1 ? "s" : ""} activa
            {activeBets.length !== 1 ? "s" : ""}
          </p>
          {activeBets.map((bet) => {
            const isChallenger = bet.challengerId === client.id;
            const otherName = isChallenger ? bet.opponentName : bet.challengerName;
            const colorClass = STATUS_COLORS[bet.status] ?? "border-zinc-700 bg-zinc-900 text-zinc-300";

            return (
              <Link
                key={bet.id}
                href={`/marciano/juegos/${bet.id}`}
                className={`rounded-[22px] border p-4 hover:-translate-y-0.5 active:scale-[0.98] ${colorClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                      {STATUS_LABELS[bet.status] ?? bet.status}
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      vs {otherName} · {bet.gameName}
                    </p>
                    <p className="mt-0.5 text-sm">
                      <span className="font-semibold text-[#8cff59]">
                        {formatOvnis(bet.amount)}
                      </span>{" "}
                      en juego
                    </p>
                  </div>
                  <span className="text-sm opacity-60">→</span>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {/* Nueva apuesta */}
      <section className="panel-card rounded-[28px] p-5">
        <p className="eyebrow text-xs">Nueva apuesta</p>
        {games.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No hay juegos disponibles en este momento.
          </p>
        ) : balance < 11 ? (
          <div className="mt-3 rounded-[18px] border border-zinc-800 bg-zinc-900/40 p-4 text-center">
            <p className="text-sm text-zinc-500">
              Necesitás al menos 11 OVNIS para apostar.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Tu saldo: {formatOvnis(balance)}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <CrearApuestaPanel games={games} myBalance={balance} />
          </div>
        )}
      </section>
    </div>
  );
}
