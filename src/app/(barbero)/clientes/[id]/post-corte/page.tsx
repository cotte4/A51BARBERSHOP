import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    <div className="space-y-4">
      <Link href={`/clientes/${id}`} className="text-sm text-gray-500 underline">
        ← {client.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registro post-corte</h1>
        <p className="text-sm text-gray-500">
          {client.name}
          {client.esMarciano ? (
            <span className="ml-2 rounded-full bg-lime-100 px-2 py-0.5 text-xs font-semibold text-lime-800">
              Marciano
            </span>
          ) : null}
        </p>
      </div>

      <PostCorteForm clientId={id} />
    </div>
  );
}
