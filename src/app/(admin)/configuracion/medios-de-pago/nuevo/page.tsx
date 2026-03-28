import Link from "next/link";
import { crearMedioPago } from "../actions";
import MedioPagoForm from "@/components/configuracion/MedioPagoForm";

export default function NuevoMedioPagoPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/configuracion/medios-de-pago"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Medios de pago
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-gray-900">
          Nuevo medio de pago
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <MedioPagoForm
          action={crearMedioPago}
          submitLabel="Crear medio de pago"
          cancelHref="/configuracion/medios-de-pago"
        />
      </div>
    </div>
  );
}
