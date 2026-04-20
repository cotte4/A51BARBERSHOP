import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ovnisBalance, ovnisRedemptionItems } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { formatOvnis } from "@/lib/ovnis";
import CanjearButton from "./_CanjearButton";

const TYPE_LABELS: Record<string, string> = {
  consumicion: "Consumición",
  descuento_pct: "Descuento %",
  descuento_fijo: "Descuento fijo",
  producto: "Producto",
};

export default async function CanjearPage() {
  const { client } = await requireMarcianoClient();

  const [items, balanceRow] = await Promise.all([
    db
      .select()
      .from(ovnisRedemptionItems)
      .where(eq(ovnisRedemptionItems.activo, true))
      .orderBy(ovnisRedemptionItems.costOvnis),
    db
      .select({ balance: ovnisBalance.balance })
      .from(ovnisBalance)
      .where(eq(ovnisBalance.clientId, client.id))
      .limit(1),
  ]);

  const balance = balanceRow[0]?.balance ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-xs">Canjes</p>
          <p className="font-display mt-1 text-xl font-semibold text-white">Premios del universo</p>
        </div>
        <Link href="/marciano/ovnis" className="text-sm text-zinc-400 hover:text-[#8cff59]">
          ← Wallet
        </Link>
      </div>

      <div className="rounded-[20px] border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <p className="text-xs text-zinc-500">Tu saldo</p>
        <p className="mt-0.5 font-semibold text-[#8cff59]">{formatOvnis(balance)}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500">
            El universo no tiene premios configurados todavía.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const canCanjear = balance >= item.costOvnis;
            const sinStock = item.stock !== null && item.stock <= 0;
            const faltanOvnis = item.costOvnis - balance;

            return (
              <div key={item.id} className="panel-card rounded-[22px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {TYPE_LABELS[item.type] ?? item.type}
                      {item.stock !== null && (
                        <> · {item.stock} en stock</>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-[#8cff59]">
                      {item.costOvnis.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-zinc-500">OVNIS</p>
                  </div>
                </div>

                <div className="mt-3">
                  {sinStock ? (
                    <div className="rounded-[14px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-center text-sm text-zinc-500">
                      Sin stock
                    </div>
                  ) : canCanjear ? (
                    <CanjearButton
                      itemId={item.id}
                      costOvnis={item.costOvnis}
                      label={item.label}
                    />
                  ) : (
                    <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-center text-xs text-zinc-500">
                      Te faltan {formatOvnis(faltanOvnis)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
