import { db } from "@/db";
import { categoriasGasto } from "@/db/schema";
import Link from "next/link";
import { crearGasto } from "../actions";
import GastoForm from "@/components/configuracion/GastoForm";

export default async function NuevoGastoPage() {
  const categorias = await db
    .select()
    .from(categoriasGasto)
    .orderBy(categoriasGasto.nombre);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/configuracion/gastos-fijos"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Gastos fijos
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-gray-900">
          Nuevo gasto
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <GastoForm
          action={crearGasto}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
          submitLabel="Crear gasto"
          cancelHref="/configuracion/gastos-fijos"
        />
      </div>
    </div>
  );
}
