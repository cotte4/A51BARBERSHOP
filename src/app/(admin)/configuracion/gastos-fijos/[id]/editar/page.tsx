import { db } from "@/db";
import { gastos, categoriasGasto } from "@/db/schema";
import { hasGastosRapidosSchema } from "@/lib/gastos-rapidos-server";
import { and, eq, isNull, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { editarGasto } from "../../actions";
import GastoForm from "@/components/configuracion/GastoForm";

interface EditarGastoPageProps {
  params: Promise<{ id: string }>;
}

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

export default async function EditarGastoPage({ params }: EditarGastoPageProps) {
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
    notFound();
  }

  const actionConId = editarGasto.bind(null, id);

  return (
    <main className="space-y-6">
      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Link
              href="/configuracion/gastos-fijos"
              className="text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              &lt;- Gastos fijos
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Editar gasto fijo
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-400">
              Ajusta monto, fecha o recurrencia sin perder el contexto del gasto original.
            </p>
          </div>
          <div className="rounded-[22px] bg-zinc-900 px-4 py-3 text-sm text-zinc-300 ring-1 ring-zinc-700">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Actual</p>
            <p className="mt-2">{gasto.descripcion}</p>
          </div>
        </div>
      </section>

      <div className="panel-card rounded-[28px] p-5">
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
    </main>
  );
}
