import { db } from "@/db";
import { categoriasGasto } from "@/db/schema";
import Link from "next/link";
import { crearGasto } from "../actions";
import GastoForm from "@/components/configuracion/GastoForm";

export default async function NuevoGastoPage() {
  const categorias = await db.select().from(categoriasGasto).orderBy(categoriasGasto.nombre);

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
              Nuevo gasto fijo
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-400">
              Cargalo con categoria, fecha y recurrencia para que la lectura mensual no quede
              repartida en varios lugares.
            </p>
          </div>
          <div className="rounded-[22px] bg-zinc-900 px-4 py-3 text-sm text-zinc-300 ring-1 ring-zinc-700">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Lectura rapida</p>
            <p className="mt-2">Los recurrentes impactan en cierres y proyecciones.</p>
          </div>
        </div>
      </section>

      <div className="panel-card rounded-[28px] p-5">
        <GastoForm
          action={crearGasto}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
          submitLabel="Crear gasto"
          cancelHref="/configuracion/gastos-fijos"
        />
      </div>
    </main>
  );
}
