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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/clientes/${id}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Volver al perfil
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/clientes/${id}`}
            className="inline-flex min-h-10 items-center rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            Perfil
          </Link>
          <Link
            href="/hoy"
            className="inline-flex min-h-10 items-center rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 text-sm font-semibold text-[#b9ff96] transition hover:bg-[#8cff59]/15"
          >
            Hoy
          </Link>
        </div>
      </div>

      <ClientProfileHeader client={client} />

      {client.archivedAt ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
          Este cliente esta archivado. La visita se puede registrar igual.
        </div>
      ) : null}

      <PostCorteForm clientId={id} />
    </div>
  );
}
