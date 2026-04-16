import { db } from "@/db";
import { categoriasGasto } from "@/db/schema";
import Modal from "@/components/ui/Modal";
import GastoForm from "@/components/configuracion/GastoForm";
import { crearGasto } from "../../actions";

export default async function NuevoGastoModal() {
  const categorias = await db.select().from(categoriasGasto).orderBy(categoriasGasto.nombre);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Gastos fijos</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nuevo gasto fijo
        </h2>
      </div>

      <GastoForm
        action={crearGasto}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        submitLabel="Crear gasto"
        cancelHref="/configuracion/gastos-fijos"
      />
    </Modal>
  );
}
