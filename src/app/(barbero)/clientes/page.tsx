import Link from "next/link";
import { redirect } from "next/navigation";
import ClientSearch from "@/components/clientes/ClientSearch";
import RetentionBanner from "@/components/clientes/RetentionBanner";
import { getClientActorContext } from "@/lib/client-access";
import { getRetentionCandidates, searchVisibleClients } from "@/lib/client-queries";

export default async function ClientesPage() {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  const [initialClients, allClients, retentionCandidates] = await Promise.all([
    searchVisibleClients(actor, "", { limit: 12 }),
    searchVisibleClients(actor, "", { limit: 120 }),
    actor.isAdmin ? getRetentionCandidates() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-zinc-400">Recientes primero, buscador a mano y memoria visual del corte.</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="neon-button rounded-xl px-4 py-3 text-sm font-semibold"
        >
          Nuevo cliente
        </Link>
      </section>

      {actor.isAdmin && retentionCandidates.length > 0 ? (
        <RetentionBanner candidates={retentionCandidates} />
      ) : null}

      <ClientSearch initialClients={initialClients} allClients={allClients} />
    </div>
  );
}
