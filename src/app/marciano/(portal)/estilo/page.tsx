import { requireMarcianoClient } from "@/lib/marciano-portal";
import InterrogatorioFlow from "./_InterrogatorioFlow";
import StyleDNACard from "@/components/marciano/StyleDNACard";
import AvatarConfigCard from "./_AvatarConfigCard";
import type { StyleProfile, FaceShape } from "@/lib/types";

export default async function PerfilMarcianoPage({
  searchParams,
}: {
  searchParams: Promise<{ redo?: string }>;
}) {
  const { client } = await requireMarcianoClient();
  const params = await searchParams;
  const isRedo = params.redo === "1";

  const alreadyCompleted = Boolean(client.styleCompletedAt) && !isRedo;

  if (alreadyCompleted && client.styleProfile) {
    return (
      <div className="space-y-6">
        <StyleDNACard
          profile={client.styleProfile as StyleProfile}
          faceShape={client.faceShape as FaceShape | null}
          totalVisits={client.totalVisits}
          allowRedo
        />
        <AvatarConfigCard
          favoriteColor={client.favoriteColor}
          avatarUrl={client.avatarUrl}
          avatarStatus={client.avatarStatus ?? "idle"}
        />
      </div>
    );
  }

  return <InterrogatorioFlow clientName={client.name} />;
}
