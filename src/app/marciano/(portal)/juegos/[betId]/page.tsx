import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisBets, ovnisGames } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { formatOvnis } from "@/lib/ovnis";
import ClaimResultPanel from "./_ClaimResultPanel";
import AcceptButton from "./_AcceptButton";
import RejectButton from "./_RejectButton";
import { cancelarApuestaAction } from "../actions";

const TERMINAL_STATUSES = [
  "challenger_won",
  "opponent_won",
  "refunded",
  "cancelled",
  "both_lost",
  "stale_burned",
  "rejected",
];

const TERMINAL_MESSAGES: Record<string, (challengerName: string, opponentName: string) => string> = {
  challenger_won: (c) => `${c} ganó la apuesta.`,
  opponent_won: (_, o) => `${o} ganó la apuesta.`,
  refunded: () => "La apuesta venció sin ser aceptada. OVNIS devueltos.",
  cancelled: () => "La apuesta fue cancelada.",
  both_lost: () => "No se pusieron de acuerdo tres veces. El universo los castigó a ambos.",
  stale_burned: () => "30 días sin actividad. Los OVNIS fueron quemados por el universo.",
  rejected: (c) => `El oponente rechazó la apuesta. Los OVNIS de ${c} fueron devueltos.`,
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-amber-500/35 bg-amber-500/10 text-amber-200",
    accepted: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]",
    disputed: "border-red-500/35 bg-red-500/10 text-red-300",
    challenger_won: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]",
    opponent_won: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]",
    refunded: "border-zinc-700 bg-zinc-800 text-zinc-400",
    cancelled: "border-zinc-700 bg-zinc-800 text-zinc-400",
    rejected: "border-red-500/35 bg-red-500/10 text-red-300",
    both_lost: "border-red-500/35 bg-red-500/10 text-red-300",
    stale_burned: "border-red-500/35 bg-red-500/10 text-red-300",
  };
  const labels: Record<string, string> = {
    pending: "Esperando",
    accepted: "En juego",
    disputed: "En disputa",
    challenger_won: "Resuelto",
    opponent_won: "Resuelto",
    refunded: "Devuelta",
    cancelled: "Cancelada",
    rejected: "Rechazada",
    both_lost: "Quemada",
    stale_burned: "Quemada",
  };
  const cls = map[status] ?? "border-zinc-700 bg-zinc-800 text-zinc-400";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default async function BetDetailPage({
  params,
}: {
  params: Promise<{ betId: string }>;
}) {
  const { client } = await requireMarcianoClient();
  const { betId } = await params;

  const challengers = aliasedTable(clients, "challengers");
  const opponents = aliasedTable(clients, "opponents");

  const [bet] = await db
    .select({
      id: ovnisBets.id,
      amount: ovnisBets.amount,
      status: ovnisBets.status,
      challengerId: ovnisBets.challengerId,
      opponentId: ovnisBets.opponentId,
      challengerClaim: ovnisBets.challengerClaim,
      opponentClaim: ovnisBets.opponentClaim,
      claimAttempts: ovnisBets.claimAttempts,
      createdAt: ovnisBets.createdAt,
      acceptanceExpiresAt: ovnisBets.acceptanceExpiresAt,
      challengerName: challengers.name,
      opponentName: opponents.name,
      gameName: ovnisGames.nombre,
      externalUrl: ovnisGames.externalUrl,
    })
    .from(ovnisBets)
    .innerJoin(challengers, eq(ovnisBets.challengerId, challengers.id))
    .innerJoin(opponents, eq(ovnisBets.opponentId, opponents.id))
    .innerJoin(ovnisGames, eq(ovnisBets.gameId, ovnisGames.id))
    .where(eq(ovnisBets.id, betId))
    .limit(1);

  if (!bet) notFound();

  const isChallenger = bet.challengerId === client.id;
  const isOpponent = bet.opponentId === client.id;

  if (!isChallenger && !isOpponent) notFound();

  const myClaim = isChallenger ? bet.challengerClaim : bet.opponentClaim;
  const isTerminal = TERMINAL_STATUSES.includes(bet.status);

  const terminalMsg = isTerminal
    ? (TERMINAL_MESSAGES[bet.status]?.(bet.challengerName, bet.opponentName) ?? "Apuesta finalizada.")
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-xs">Apuesta</p>
          <p className="font-display mt-1 text-xl font-semibold text-white">
            {bet.gameName}
          </p>
        </div>
        <Link href="/marciano/juegos" className="text-sm text-zinc-400 hover:text-[#8cff59]">
          ← Juegos
        </Link>
      </div>

      {/* Bet summary card */}
      <section className="panel-card rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">En juego</p>
            <p className="font-display mt-1 text-3xl font-bold text-[#8cff59]">
              {formatOvnis(bet.amount)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">cada jugador</p>
          </div>
          <StatusBadge status={bet.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`rounded-[18px] border px-3 py-2.5 ${
            isChallenger ? "border-[#8cff59]/20 bg-[#8cff59]/8" : "border-zinc-800 bg-zinc-900/40"
          }`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Retador
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{bet.challengerName}</p>
            {bet.challengerClaim && (
              <p className="mt-0.5 text-xs text-zinc-500">
                Claim: {bet.challengerClaim === "won" ? "Ganó" : bet.challengerClaim === "lost" ? "Perdió" : "Forfeit"}
              </p>
            )}
          </div>
          <div className={`rounded-[18px] border px-3 py-2.5 ${
            isOpponent ? "border-[#8cff59]/20 bg-[#8cff59]/8" : "border-zinc-800 bg-zinc-900/40"
          }`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Oponente
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{bet.opponentName}</p>
            {bet.opponentClaim && (
              <p className="mt-0.5 text-xs text-zinc-500">
                Claim: {bet.opponentClaim === "won" ? "Ganó" : bet.opponentClaim === "lost" ? "Perdió" : "Forfeit"}
              </p>
            )}
          </div>
        </div>

        {bet.externalUrl && (
          <a
            href={bet.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center rounded-[18px] border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-semibold text-zinc-300 hover:border-[#8cff59]/40 hover:text-[#8cff59]"
          >
            Jugar {bet.gameName} →
          </a>
        )}
      </section>

      {/* Actions */}
      {isTerminal && terminalMsg && (
        <div className="rounded-[22px] border border-zinc-700 bg-zinc-900/40 p-5 text-center">
          <p className="text-sm text-zinc-400">{terminalMsg}</p>
        </div>
      )}

      {!isTerminal && bet.status === "pending" && isChallenger && (
        <CancelButton betId={bet.id} />
      )}

      {!isTerminal && bet.status === "pending" && isOpponent && (
        <div className="flex flex-col gap-2">
          <AcceptButton betId={bet.id} />
          <RejectButton betId={bet.id} />
        </div>
      )}


      {!isTerminal && (bet.status === "accepted" || bet.status === "disputed") && (
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow mb-4 text-xs">Tu resultado</p>
          <ClaimResultPanel
            betId={bet.id}
            isChallenger={isChallenger}
            myClaim={myClaim}
            claimAttempts={bet.claimAttempts}
          />
        </section>
      )}
    </div>
  );
}

function CancelButton({ betId }: { betId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await cancelarApuestaAction(betId);
      }}
    >
      <button
        type="submit"
        className="ghost-button w-full rounded-[20px] py-4 text-sm font-semibold"
      >
        Cancelar apuesta
      </button>
    </form>
  );
}
