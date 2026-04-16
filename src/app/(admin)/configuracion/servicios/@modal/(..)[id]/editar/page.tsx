import { db } from "@/db";
import { servicios } from "@/db/schema";
import { eq } from "drizzle-orm";
import Modal from "@/components/ui/Modal";
import ServicioForm from "@/components/configuracion/ServicioForm";
import { editarServicio } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarServicioModal({ params }: Props) {
  const { id } = await params;

  const [servicio] = await db
    .select()
    .from(servicios)
    .where(eq(servicios.id, id))
    .limit(1);

  if (!servicio) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Servicio no encontrado.</p>
        </div>
      </Modal>
    );
  }

  const editarConId = editarServicio.bind(null, id);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Servicios</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Editar servicio
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">{servicio.nombre}</p>
      </div>

      <ServicioForm
        action={editarConId}
        initialData={{
          nombre: servicio.nombre,
          precioBase: servicio.precioBase,
          duracionMinutos: servicio.duracionMinutos,
        }}
        submitLabel="Guardar cambios"
        cancelHref="/configuracion/servicios"
        showMotivoField={true}
      />
    </Modal>
  );
}
