import { db } from "@/db";
import { gastos, categoriasGasto } from "@/db/schema";
import { hasGastosRapidosSchema } from "@/lib/gastos-rapidos-server";
import { and, eq, isNull, or } from "drizzle-orm";
import Modal from "@/components/ui/Modal";
import GastoForm from "@/components/configuracion/GastoForm";
import { editarGasto } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

const gastoLegacySelect = {
  id: gastos.id,
  categoriaId: gastos.categoriaId,
  descripcion: gastos.descripcion,
  monto: gastos.monto,
  fecha: gastos.fecha,
  esRecurrente: gastos.esRecurrente,
  frecuencia: gastos.frecuencia,
  notas: gastos.notas,
};

export default async function EditarGastoModal({ params }: Props) {
  const { id } = await params;
  const hasQuickExpenseColumns = await hasGastosRapidosSchema();

  const [[gasto], categorias] = await Promise.all([
    hasQuickExpenseColumns
      ? db
          .select()
          .from(gastos)
          .where(and(eq(gastos.id, id), or(eq(gastos.tipo, "fijo"), isNull(gastos.tipo))))
          .limit(1)
      : db.select(gastoLegacySelect).from(gastos).where(eq(gastos.id, id)).limit(1),
    db.select().from(categoriasGasto).orderBy(categoriasGasto.nombre),
  ]);

  if (!gasto) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Gasto no encontrado.</p>
        </div>
      </Modal>
    );
  }

  const actionConId = editarGasto.bind(null, id);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Gastos fijos</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Editar gasto fijo
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">{gasto.descripcion}</p>
      </div>

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
    </Modal>
  );
}
