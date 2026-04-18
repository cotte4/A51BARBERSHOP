import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import MarcianoIDCard from "@/components/marciano/MarcianoIDCard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      avatarUrl: clients.avatarUrl,
      esMarciano: clients.esMarciano,
      createdAt: clients.createdAt,
      totalVisits: clients.totalVisits,
      styleProfile: clients.styleProfile,
    })
    .from(clients)
    .where(eq(clients.publicCardSlug, slug))
    .limit(1);

  if (!client) notFound();

  const serialNumber = `MCN-${client.createdAt.toISOString().slice(0, 7)}-${client.id.slice(0, 4)}`;
  const alienTitle = client.styleProfile?.dominantStyle ?? "El Intergaláctico";

  return (
    <div className="app-shell min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        {!client.esMarciano && (
          <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 px-4 py-3 text-center text-xs text-zinc-400">
            Membresía inactiva
          </div>
        )}
        <MarcianoIDCard
          avatarUrl={client.avatarUrl}
          clientName={client.name}
          alienTitle={alienTitle}
          memberSince={client.createdAt}
          totalVisits={client.totalVisits}
          serialNumber={serialNumber}
        />
        <p className="text-center text-[10px] uppercase tracking-widest text-zinc-600">
          Area 51 Barber Shop · Mar del Plata
        </p>
      </div>
    </div>
  );
}
