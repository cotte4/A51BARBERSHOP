import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { servicios, serviciosAdicionales } from "@/db/schema";
import { eq } from "drizzle-orm";
import ServicioForm from "@/components/configuracion/ServicioForm";
import AdicionalManager from "@/components/configuracion/AdicionalManager";
import { editarServicio, crearAdicional, eliminarAdicional } from "../../actions";

interface EditarServicioPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarServicioPage({
  params,
}: EditarServicioPageProps) {
  const { id } = await params;

  const [servicio] = await db
    .select()
    .from(servicios)
    .where(eq(servicios.id, id))
    .limit(1);

  if (!servicio) {
    notFound();
  }

  const adicionales = await db
    .select()
    .from(serviciosAdicionales)
    .where(eq(serviciosAdicionales.servicioId, id));

  const editarServicioConId = editarServicio.bind(null, servicio.id);

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
        Editar servicio
      </h2>

      {/* Datos del servicio */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <ServicioForm
          action={editarServicioConId}
          initialData={{
            nombre: servicio.nombre,
            precioBase: servicio.precioBase,
          }}
          submitLabel="Guardar cambios"
          cancelHref="/configuracion/servicios"
          showMotivoField={true}
        />
      </div>

      {/* Adicionales */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Adicionales</h3>
          <Link
            href={`/configuracion/servicios/${id}/historial`}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Ver historial de precios →
          </Link>
        </div>
        <AdicionalManager
          servicioId={servicio.id}
          adicionales={adicionales.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            precioExtra: a.precioExtra,
          }))}
          crearAdicionalAction={crearAdicional}
          eliminarAdicionalAction={eliminarAdicional}
        />
      </div>
    </div>
  );
}
