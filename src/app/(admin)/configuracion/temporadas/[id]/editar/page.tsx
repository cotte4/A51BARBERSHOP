import { db } from "@/db";
import { temporadas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { actualizarTemporada } from "../../actions";
import TemporadaForm from "@/components/configuracion/TemporadaForm";

interface EditarTemporadaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarTemporadaPage({
  params,
}: EditarTemporadaPageProps) {
  const { id } = await params;

  const [temporada] = await db
    .select()
    .from(temporadas)
    .where(eq(temporadas.id, id))
    .limit(1);

  if (!temporada) {
    notFound();
  }

  const actionConId = actualizarTemporada.bind(null, id);

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
          Editar temporada
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <TemporadaForm
          action={actionConId}
          initialData={{
            nombre: temporada.nombre,
            fechaInicio: temporada.fechaInicio,
            fechaFin: temporada.fechaFin,
            cortesDiaProyectados: temporada.cortesDiaProyectados,
            precioBaseProyectado: temporada.precioBaseProyectado,
          }}
          submitLabel="Guardar cambios"
          cancelHref="/configuracion/temporadas"
        />
      </div>
    </div>
  );
}
