import ClientCreateForm from "@/components/clientes/ClientCreateForm";
import Modal from "@/components/ui/Modal";
import { getClientActorContext } from "@/lib/client-access";

export default async function NuevoClienteModal() {
  const actor = await getClientActorContext();

  if (!actor) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Sesión requerida.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Iniciá sesión para crear un cliente.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Clientes</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nuevo cliente
        </h2>
      </div>

      <ClientCreateForm isAdmin={actor.isAdmin} />
    </Modal>
  );
}
