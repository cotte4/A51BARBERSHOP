import BarberoForm from "@/components/configuracion/BarberoForm";
import { crearBarbero } from "../actions";
import Link from "next/link";

export default function NuevoBarberoPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/configuracion/barberos"
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Barberos
        </Link>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Nuevo barbero</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <BarberoForm action={crearBarbero} submitLabel="Crear barbero" />
      </div>
    </div>
  );
}
