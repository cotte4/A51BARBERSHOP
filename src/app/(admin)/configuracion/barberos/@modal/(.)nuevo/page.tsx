import { db } from "@/db";
import { mediosPago, servicios } from "@/db/schema";
import { eq } from "drizzle-orm";
import BarberoForm from "@/components/configuracion/BarberoForm";
import Modal from "@/components/ui/Modal";
import { crearBarbero } from "../../actions";

export default async function NuevoBarberoModal() {
  const [serviciosActivos, mediosPagoActivos] = await Promise.all([
    db.select({ id: servicios.id, nombre: servicios.nombre }).from(servicios).where(eq(servicios.activo, true)),
    db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Barberos</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nuevo barbero
        </h2>
      </div>

      <BarberoForm
        action={crearBarbero}
        serviciosOptions={serviciosActivos}
        mediosPagoOptions={mediosPagoActivos}
        submitLabel="Crear barbero"
      />
    </Modal>
  );
}
