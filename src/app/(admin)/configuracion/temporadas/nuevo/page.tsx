import Link from "next/link";
import { crearTemporada } from "../actions";
import TemporadaForm from "@/components/configuracion/TemporadaForm";

export default function NuevaTemporadaPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/configuracion/temporadas"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Temporadas
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-gray-900">
          Nueva temporada
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <TemporadaForm
          action={crearTemporada}
          submitLabel="Crear temporada"
          cancelHref="/configuracion/temporadas"
        />
      </div>
    </div>
  );
}
