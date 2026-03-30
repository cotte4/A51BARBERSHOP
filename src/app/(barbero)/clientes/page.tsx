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

  const [initialClients, retentionCandidates] = await Promise.all([
    searchVisibleClients(actor, ""),
    actor.isAdmin ? getRetentionCandidates() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Marcianos</h1>
          <p className="text-sm text-zinc-400">Directorio interno y memoria operativa del equipo.</p>
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

      <ClientSearch initialClients={initialClients} />
    </div>
  );
}
