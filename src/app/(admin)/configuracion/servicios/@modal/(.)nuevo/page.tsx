import Modal from "@/components/ui/Modal";
import ServicioForm from "@/components/configuracion/ServicioForm";
import { crearServicio } from "../../actions";

export default function NuevoServicioModal() {
  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Servicios</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nuevo servicio
        </h2>
      </div>

      <ServicioForm
        action={crearServicio}
        submitLabel="Crear servicio"
        cancelHref="/configuracion/servicios"
      />
    </Modal>
  );
}
