import { db } from "@/db";
import { barberos, mediosPago, servicios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import BarberoForm from "@/components/configuracion/BarberoForm";
import { editarBarbero } from "../../actions";
import Link from "next/link";

interface EditarBarberoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarBarberoPage({ params }: EditarBarberoPageProps) {
  const { id } = await params;

  const [[barbero], serviciosActivos, mediosPagoActivos] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.id, id)).limit(1),
    db.select({ id: servicios.id, nombre: servicios.nombre }).from(servicios).where(eq(servicios.activo, true)),
    db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  if (!barbero) {
    notFound();
  }

  // Bind el id al server action
  const editarConId = editarBarbero.bind(null, id);

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
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Editar: {barbero.nombre}
      </h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <BarberoForm
          action={editarConId}
          initialData={{
            nombre: barbero.nombre,
            rol: barbero.rol,
            tipoModelo: barbero.tipoModelo ?? undefined,
            porcentajeComision: barbero.porcentajeComision,
            alquilerBancoMensual: barbero.alquilerBancoMensual,
            sueldoMinimoGarantizado: barbero.sueldoMinimoGarantizado,
            servicioDefectoId: barbero.servicioDefectoId,
            medioPagoDefectoId: barbero.medioPagoDefectoId,
          }}
          serviciosOptions={serviciosActivos}
          mediosPagoOptions={mediosPagoActivos}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
