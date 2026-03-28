import Link from "next/link";
import ServicioForm from "@/components/configuracion/ServicioForm";
import { crearServicio } from "../actions";

export default function NuevoServicioPage() {
  return (
    <div className="max-w-lg">
      {/* Breadcrumb */}
      <Link
        href="/configuracion/servicios"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
      >
        ← Servicios
      </Link>

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Nuevo servicio
      </h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <ServicioForm
          action={crearServicio}
          submitLabel="Crear servicio"
          cancelHref="/configuracion/servicios"
        />
      </div>
    </div>
  );
}
