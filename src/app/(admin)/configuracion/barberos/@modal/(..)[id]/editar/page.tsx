import { db } from "@/db";
import { barberos, mediosPago, servicios } from "@/db/schema";
import { eq } from "drizzle-orm";
import BarberoForm from "@/components/configuracion/BarberoForm";
import Modal from "@/components/ui/Modal";
import { editarBarbero } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarBarberoModal({ params }: Props) {
  const { id } = await params;

  const [[barbero], serviciosActivos, mediosPagoActivos] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.id, id)).limit(1),
    db.select({ id: servicios.id, nombre: servicios.nombre }).from(servicios).where(eq(servicios.activo, true)),
    db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  if (!barbero) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Barbero no encontrado.</p>
        </div>
      </Modal>
    );
  }

  const editarConId = editarBarbero.bind(null, id);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Barberos</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Editar barbero
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">{barbero.nombre}</p>
      </div>

      <BarberoForm
        action={editarConId}
        initialData={{
          nombre: barbero.nombre,
          rol: barbero.rol,
          tipoModelo: barbero.tipoModelo ?? undefined,
          porcentajeComision: barbero.porcentajeComision,
          alquilerBancoMensual: barbero.alquilerBancoMensual,
          sueldoMinimoGarantizado: barbero.sueldoMinimoGarantizado,
          servicioDefectoId: barbero.servicioDefectoId,
          medioPagoDefectoId: barbero.medioPagoDefectoId,
          publicSlug: barbero.publicSlug,
          publicReservaActiva: barbero.publicReservaActiva,
          publicReservaPasswordConfigured: Boolean(barbero.publicReservaPasswordHash),
        }}
        serviciosOptions={serviciosActivos}
        mediosPagoOptions={mediosPagoActivos}
        submitLabel="Guardar cambios"
      />
    </Modal>
  );
}
