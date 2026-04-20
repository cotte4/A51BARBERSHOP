import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ovnisRuletaPrizes, ovnisRuletaSpins } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { formatOvnis } from "@/lib/ovnis";
import RuletaSpinner from "./_RuletaSpinner";

export default async function RuletaPage() {
  const { client } = await requireMarcianoClient();

  const [spinRow] = await db
    .select({
      prizeId: ovnisRuletaSpins.prizeId,
      spunAt: ovnisRuletaSpins.spunAt,
      prizeLabel: ovnisRuletaPrizes.label,
      prizeType: ovnisRuletaPrizes.type,
      prizeOvnisAmount: ovnisRuletaPrizes.ovnisAmount,
    })
    .from(ovnisRuletaSpins)
    .leftJoin(ovnisRuletaPrizes, eq(ovnisRuletaSpins.prizeId, ovnisRuletaPrizes.id))
    .where(eq(ovnisRuletaSpins.clientId, client.id))
    .limit(1);

  const hasSpun = !!spinRow;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow text-xs">Ruleta Marciana</p>
        <p className="font-display mt-1 text-xl font-semibold text-white">
          La ruleta del universo
        </p>
      </div>

      <div className="panel-card rounded-[28px] p-6">
        {hasSpun && spinRow ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-5xl">
              {spinRow.prizeType === "ovnis"
                ? "✨"
                : spinRow.prizeType === "nada"
                ? "🌌"
                : "🎁"}
            </span>
            <div className="space-y-2">
              <p className="eyebrow text-xs">Tu destino marciano</p>
              <p className="font-display text-2xl font-bold text-white">
                {spinRow.prizeLabel ?? "Premio desconocido"}
              </p>
              {spinRow.prizeType === "ovnis" &&
                (spinRow.prizeOvnisAmount ?? 0) > 0 && (
                  <p className="text-lg font-semibold text-[#8cff59]">
                    +{formatOvnis(spinRow.prizeOvnisAmount ?? 0)}
                  </p>
                )}
            </div>
            <p className="text-xs text-zinc-600">
              Giraste el{" "}
              {spinRow.spunAt.toLocaleDateString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
            <div className="mt-2 rounded-[18px] border border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs text-zinc-500">
                La ruleta solo se gira una vez en la vida Marciana. Ya la tuya está escrita.
              </p>
            </div>
          </div>
        ) : (
          <RuletaSpinner />
        )}
      </div>
    </div>
  );
}
