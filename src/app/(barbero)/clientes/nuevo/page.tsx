import { redirect } from "next/navigation";
import ClientCreateForm from "@/components/clientes/ClientCreateForm";
import { getClientActorContext } from "@/lib/client-access";

export default async function NuevoClientePage() {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo cliente</h1>
        <p className="text-sm text-gray-500">
          Alta rápida con datos compartidos y contexto útil para próximos cortes.
        </p>
      </div>
      <ClientCreateForm isAdmin={actor.isAdmin} />
    </div>
  );
}
