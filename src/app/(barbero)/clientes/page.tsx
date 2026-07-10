import { redirect } from "next/navigation";
import ClientSearch from "@/components/clientes/ClientSearch";
import RetentionBanner from "@/components/clientes/RetentionBanner";
import RetentionPipelineBoard from "@/components/clientes/RetentionPipelineBoard";
import { getClientActorContext } from "@/lib/client-access";
import {
  getRetentionCandidates,
  getRetentionPipelineRows,
  searchVisibleClients,
} from "@/lib/client-queries";

export default async function ClientesPage() {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  const [initialClients, allClients, retentionCandidates, retentionPipelineRows] = await Promise.all([
    searchVisibleClients(actor, "", { limit: 12 }),
    searchVisibleClients(actor, "", { limit: 120 }),
    actor.isAdmin ? getRetentionCandidates() : Promise.resolve([]),
    actor.isAdmin ? getRetentionPipelineRows() : Promise.resolve([]),
  ]);

  const recentCount = initialClients.length;
  const totalCount = allClients.length;

  return (
    <div className="space-y-5 pb-6">
      {actor.isAdmin && retentionCandidates.length > 0 ? (
        <RetentionBanner candidates={retentionCandidates} />
      ) : null}

      {actor.isAdmin && retentionPipelineRows.length > 0 ? (
        <RetentionPipelineBoard rows={retentionPipelineRows} />
      ) : null}

      <ClientSearch
        initialClients={initialClients}
        allClients={allClients}
        totalClients={totalCount}
        recentCount={recentCount}
      />
    </div>
  );
}
