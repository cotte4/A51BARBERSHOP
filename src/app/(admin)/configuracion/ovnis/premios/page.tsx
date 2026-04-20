import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { ovnisRedemptionItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatOvnis } from "@/lib/ovnis";
import NuevoPremioForm from "./_NuevoPremioForm";
import TogglePremioButton from "./_TogglePremioButton";

const TYPE_LABELS: Record<string, string> = {
  consumicion: "Consumición",
  descuento_pct: "Descuento %",
  descuento_fijo: "Descuento fijo",
  producto: "Producto",
};

export default async function PremiosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "asesor") redirect("/caja");

  const items = await db.select().from(ovnisRedemptionItems).orderBy(ovnisRedemptionItems.label);

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
              Premios canjeables
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <section className="panel-card rounded-[28px] p-5">
          <p className="text-sm text-zinc-400">
            {items.length} premio{items.length !== 1 ? "s" : ""} en total
          </p>

          <div className="mt-4 divide-y divide-zinc-800">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {TYPE_LABELS[item.type] ?? item.type} ·{" "}
                    <span className="font-semibold text-[#8cff59]">
                      {formatOvnis(item.costOvnis)}
                    </span>{" "}
                    · Stock:{" "}
                    {item.stock === null ? (
                      <span className="text-zinc-300">ilimitado</span>
                    ) : (
                      <span className="text-zinc-300">{item.stock}</span>
                    )}
                  </p>
                </div>
                <TogglePremioButton id={item.id} activo={item.activo} />
              </div>
            ))}
            {items.length === 0 && (
              <p className="py-4 text-sm text-zinc-500">No hay premios configurados todavía.</p>
            )}
          </div>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">Nuevo premio</p>
          <NuevoPremioForm />
        </section>
      </main>
    </div>
  );
}
