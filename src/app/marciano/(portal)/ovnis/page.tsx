import Link from "next/link";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { ovnisBalance, ovnisPendingCredits, ovnisTransactions } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { formatOvnis, type OvnisTransactionType } from "@/lib/ovnis";

const TX_LABELS: Record<OvnisTransactionType, string> = {
  welcome: "Bienvenida",
  atencion: "Atención",
  ruleta: "Ruleta",
  redemption: "Canje",
  redemption_refund: "Devolución de canje",
  donation_sent: "Donación enviada",
  donation_received: "Donación recibida",
  bet_lock: "Apuesta bloqueada",
  bet_unlock: "Apuesta desbloqueada",
  bet_win: "Victoria en apuesta",
  bet_refund: "Apuesta devuelta",
  bet_burn: "Apuesta quemada",
  admin_adjust: "Ajuste",
};

function formatFechaAr(date: Date) {
  return date.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function OvnisWalletPage() {
  const { client } = await requireMarcianoClient();

  const [balanceRow, pendingCredits, txHistory] = await Promise.all([
    db
      .select({ balance: ovnisBalance.balance, pendingBalance: ovnisBalance.pendingBalance })
      .from(ovnisBalance)
      .where(eq(ovnisBalance.clientId, client.id))
      .limit(1),
    db
      .select({ id: ovnisPendingCredits.id, amount: ovnisPendingCredits.amount })
      .from(ovnisPendingCredits)
      .where(
        and(
          eq(ovnisPendingCredits.clientId, client.id),
          isNull(ovnisPendingCredits.redeemedAt),
          gt(ovnisPendingCredits.expiresAt, new Date())
        )
      ),
    db
      .select({
        id: ovnisTransactions.id,
        amount: ovnisTransactions.amount,
        type: ovnisTransactions.type,
        description: ovnisTransactions.description,
        createdAt: ovnisTransactions.createdAt,
      })
      .from(ovnisTransactions)
      .where(eq(ovnisTransactions.clientId, client.id))
      .orderBy(desc(ovnisTransactions.createdAt))
      .limit(20),
  ]);

  const balance = balanceRow[0]?.balance ?? 0;
  const pendingBalance = balanceRow[0]?.pendingBalance ?? 0;
  const pendingOvnisPorEscanear = pendingCredits.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Balance hero */}
      <section className="panel-card rounded-[28px] p-6">
        <p className="eyebrow text-xs">Tu universo</p>
        <p className="font-display mt-3 text-5xl font-bold text-[#8cff59]">
          {balance.toLocaleString("es-AR")}
        </p>
        <p className="mt-1 text-sm font-medium text-zinc-400">OVNIS disponibles</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/marciano/ovnis/canjear"
            className="neon-button flex items-center justify-center rounded-[20px] px-4 py-3 text-sm font-semibold"
          >
            Canjear
          </Link>
          <Link
            href="/marciano/ovnis/donar"
            className="ghost-button flex items-center justify-center rounded-[20px] px-4 py-3 text-sm font-semibold"
          >
            Donar
          </Link>
        </div>
      </section>

      {/* Pending balance in bets */}
      {pendingBalance > 0 && (
        <div className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            En apuesta
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            <span className="font-semibold text-amber-200">{formatOvnis(pendingBalance)}</span>{" "}
            bloqueados en apuesta activa
          </p>
          <Link
            href="/marciano/juegos"
            className="mt-2 block text-xs text-amber-300 hover:underline"
          >
            Ver apuestas →
          </Link>
        </div>
      )}

      {/* Pending credits to scan */}
      {pendingCredits.length > 0 && (
        <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-200">
            Por escanear
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            El universo te está esperando —{" "}
            <span className="font-semibold text-white">{formatOvnis(pendingOvnisPorEscanear)}</span>{" "}
            sin escanear
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {pendingCredits.length === 1
              ? "Pedile el QR al barbero para acreditarlos"
              : `${pendingCredits.length} QRs pendientes — escaneálos antes de que venzan`}
          </p>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/marciano/ruleta"
          className="panel-card flex flex-col items-center justify-center gap-2 rounded-[22px] p-4 text-center hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span className="text-2xl">🌀</span>
          <p className="text-sm font-semibold text-white">Ruleta</p>
          <p className="text-xs text-zinc-500">Un giro en la vida</p>
        </Link>
        <Link
          href="/marciano/juegos"
          className="panel-card flex flex-col items-center justify-center gap-2 rounded-[22px] p-4 text-center hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span className="text-2xl">🛸</span>
          <p className="text-sm font-semibold text-white">Juegos</p>
          <p className="text-xs text-zinc-500">Apostá con Marcianos</p>
        </Link>
      </div>

      {/* Transaction history */}
      {txHistory.length > 0 && (
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs">Historial</p>
          <div className="mt-3 divide-y divide-zinc-800/60">
            {txHistory.map((tx) => {
              const isPositive = tx.amount > 0;
              const label =
                TX_LABELS[tx.type as OvnisTransactionType] ?? tx.type;
              return (
                <div key={tx.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{tx.description}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {formatFechaAr(tx.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      isPositive ? "text-[#8cff59]" : "text-zinc-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {tx.amount.toLocaleString("es-AR")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {txHistory.length === 0 && (
        <div className="rounded-[22px] border border-dashed border-zinc-800 p-6 text-center">
          <p className="text-sm text-zinc-500">
            El universo no registra movimientos todavía.
          </p>
        </div>
      )}
    </div>
  );
}
