import { db } from "@/db";
import { gastos, categoriasGasto } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { editarGasto } from "../../actions";
import GastoForm from "@/components/configuracion/GastoForm";

interface EditarGastoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarGastoPage({
  params,
}: EditarGastoPageProps) {
  const { id } = await params;

  const [[gasto], categorias] = await Promise.all([
    db.select().from(gastos).where(eq(gastos.id, id)).limit(1),
    db.select().from(categoriasGasto).orderBy(categoriasGasto.nombre),
  ]);

  if (!gasto) {
    notFound();
  }

  const actionConId = editarGasto.bind(null, id);

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
          Editar gasto
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <GastoForm
          action={actionConId}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
          initialData={{
            descripcion: gasto.descripcion,
            monto: gasto.monto,
            fecha: gasto.fecha,
            categoriaId: gasto.categoriaId,
            esRecurrente: gasto.esRecurrente,
            frecuencia: gasto.frecuencia,
            notas: gasto.notas,
          }}
          submitLabel="Guardar cambios"
          cancelHref="/configuracion/gastos-fijos"
        />
      </div>
    </div>
  );
}
