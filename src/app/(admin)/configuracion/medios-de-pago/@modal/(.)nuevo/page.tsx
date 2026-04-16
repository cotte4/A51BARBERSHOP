import Modal from "@/components/ui/Modal";
import MedioPagoForm from "@/components/configuracion/MedioPagoForm";
import { crearMedioPago } from "../../actions";

export default function NuevoMedioPagoModal() {
  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Medios de pago</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nuevo medio de pago
        </h2>
      </div>

      <MedioPagoForm
        action={crearMedioPago}
        submitLabel="Crear medio de pago"
        cancelHref="/configuracion/medios-de-pago"
      />
    </Modal>
  );
}
