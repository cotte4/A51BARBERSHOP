import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ovnisBalance } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { formatOvnis } from "@/lib/ovnis";
import DonarPanel from "./_DonarPanel";

export default async function DonarPage() {
  const { client } = await requireMarcianoClient();

  const [balanceRow] = await db
    .select({ balance: ovnisBalance.balance })
    .from(ovnisBalance)
    .where(eq(ovnisBalance.clientId, client.id))
    .limit(1);

  const balance = balanceRow?.balance ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-xs">Donaciones</p>
          <p className="font-display mt-1 text-xl font-semibold text-white">
            Compartir OVNIS
          </p>
        </div>
        <Link href="/marciano/ovnis" className="text-sm text-zinc-400 hover:text-[#8cff59]">
          ← Wallet
        </Link>
      </div>

      <div className="rounded-[20px] border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <p className="text-xs text-zinc-500">Tu saldo disponible</p>
        <p className="mt-0.5 font-semibold text-[#8cff59]">{formatOvnis(balance)}</p>
      </div>

      {balance === 0 ? (
        <div className="rounded-[22px] border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500">
            No tenés OVNIS para donar. Ganá más en tu próxima visita.
          </p>
        </div>
      ) : (
        <div className="panel-card rounded-[28px] p-5">
          <DonarPanel myBalance={balance} />
        </div>
      )}
    </div>
  );
}
