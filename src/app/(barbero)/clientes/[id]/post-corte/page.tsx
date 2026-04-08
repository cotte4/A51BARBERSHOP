import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ClientProfileHeader from "@/components/clientes/ClientProfileHeader";
import PostCorteForm from "@/components/clientes/PostCorteForm";
import { getClientActorContext } from "@/lib/client-access";
import { getClientProfileForActor } from "@/lib/client-queries";

type PostCortePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostCortePage({ params }: PostCortePageProps) {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  const { id } = await params;
  const client = await getClientProfileForActor(actor, id);
  if (!client) {
    notFound();
  }

  const clientStateLabel = client.archivedAt
    ? "Archivado"
    : client.esMarciano
      ? "Marciano activo"
      : "Cliente activo";
  const clientStateToneClass = client.archivedAt
    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
    : client.esMarciano
      ? "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]"
      : "border-zinc-800 bg-zinc-950 text-zinc-300";

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.12),_transparent_30%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="space-y-2">
          <Link
            href={`/clientes/${id}`}
            className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
          >
            &larr; Volver al perfil
          </Link>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Post-corte
            </p>
            <p className="text-sm text-zinc-400">Cierra la sesion y deja memoria util para el proximo corte.</p>
          </div>
        </div>
      </section>

      <ClientProfileHeader
        client={client}
        stateLabel={clientStateLabel}
        stateToneClass={clientStateToneClass}
        actions={
          <>
            <Link
              href={`/clientes/${id}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              Perfil
            </Link>
            <Link
              href="/hoy"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 text-sm font-semibold text-[#b9ff96] transition hover:bg-[#8cff59]/15"
            >
              Hoy
            </Link>
          </>
        }
      />

      {client.archivedAt ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
          Este cliente esta archivado. La visita se puede registrar igual.
        </div>
      ) : null}

      <PostCorteForm clientId={id} />
    </div>
  );
}
