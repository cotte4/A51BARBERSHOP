import { db } from "@/db";
import { mediosPago } from "@/db/schema";
import { eq } from "drizzle-orm";
import Modal from "@/components/ui/Modal";
import MedioPagoForm from "@/components/configuracion/MedioPagoForm";
import { editarMedioPago } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarMedioPagoModal({ params }: Props) {
  const { id } = await params;

  const [medioPago] = await db
    .select()
    .from(mediosPago)
    .where(eq(mediosPago.id, id))
    .limit(1);

  if (!medioPago) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Medio de pago no encontrado.</p>
        </div>
      </Modal>
    );
  }

  const actionConId = editarMedioPago.bind(null, id);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Medios de pago</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Editar medio de pago
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">{medioPago.nombre}</p>
      </div>

      <MedioPagoForm
        action={actionConId}
        initialData={{
          nombre: medioPago.nombre,
          comisionPorcentaje: medioPago.comisionPorcentaje,
        }}
        submitLabel="Guardar cambios"
        cancelHref="/configuracion/medios-de-pago"
      />
    </Modal>
  );
}
