import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { ovnisRuletaPrizes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatOvnis } from "@/lib/ovnis";
import RuletaWeightEditor from "./_RuletaWeightEditor";
import ToggleRuletaButton from "./_ToggleRuletaButton";
import NuevoRuletaPrizeForm from "./_NuevoRuletaPrizeForm";

const TYPE_LABELS: Record<string, string> = {
  ovnis: "OVNIS",
  redemption_item: "Premio canjeable",
  nada: "Nada",
};

export default async function RuletaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "asesor") redirect("/caja");

  const prizes = await db
    .select()
    .from(ovnisRuletaPrizes)
    .orderBy(ovnisRuletaPrizes.label);

  const totalWeight = prizes.filter((p) => p.activo).reduce((s, p) => s + p.weight, 0);

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link href="/configuracion/ovnis" className="text-sm text-zinc-400 hover:text-[#8cff59]">
            ← OVNIS
          </Link>
          <div>
            <p className="eyebrow text-xs font-semibold">Economía de OVNIS</p>
            <h1 className="font-display mt-1 text-xl font-semibold text-white">
              Premios de ruleta
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <section className="panel-card rounded-[28px] p-5">
          <p className="text-sm text-zinc-400">
            Peso total activo:{" "}
            <span className="font-semibold text-white">{totalWeight}</span>
          </p>

          <div className="mt-4 divide-y divide-zinc-800">
            {prizes.map((prize) => {
              const pct =
                totalWeight > 0 && prize.activo
                  ? ((prize.weight / totalWeight) * 100).toFixed(1)
                  : "—";

              return (
                <div key={prize.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{prize.label}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {TYPE_LABELS[prize.type] ?? prize.type}
                      {prize.type === "ovnis" && prize.ovnisAmount > 0 && (
                        <>
                          {" "}·{" "}
                          <span className="font-semibold text-[#8cff59]">
                            {formatOvnis(prize.ovnisAmount)}
                          </span>
                        </>
                      )}
                      {prize.activo && (
                        <>
                          {" "}·{" "}
                          <span className="text-zinc-300">{pct}% prob.</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RuletaWeightEditor id={prize.id} currentWeight={prize.weight} />
                    <ToggleRuletaButton id={prize.id} activo={prize.activo} />
                  </div>
                </div>
              );
            })}
            {prizes.length === 0 && (
              <p className="py-4 text-sm text-zinc-500">No hay premios de ruleta configurados.</p>
            )}
          </div>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">Nuevo premio de ruleta</p>
          <NuevoRuletaPrizeForm />
        </section>
      </main>
    </div>
  );
}
