import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import BarberoForm from "@/components/configuracion/BarberoForm";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";
import { db } from "@/db";
import { barberos, mediosPago, servicios } from "@/db/schema";
import { editarBarbero, toggleActivoBarbero } from "../../actions";

interface EditarBarberoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarBarberoPage({ params }: EditarBarberoPageProps) {
  const { id } = await params;

  const [[barbero], serviciosActivos, mediosPagoActivos] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.id, id)).limit(1),
    db
      .select({ id: servicios.id, nombre: servicios.nombre })
      .from(servicios)
      .where(eq(servicios.activo, true)),
    db
      .select({ id: mediosPago.id, nombre: mediosPago.nombre })
      .from(mediosPago)
      .where(eq(mediosPago.activo, true)),
  ]);

  if (!barbero) {
    notFound();
  }

  const editarConId = editarBarbero.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/configuracion/barberos" className="text-sm text-gray-400 hover:text-gray-600">
          ← Barberos
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Editar: {barbero.nombre}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Los cambios sensibles de este perfil se resuelven desde esta pantalla.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Acción sensible
          </p>
          <div className="mt-2">
            <ToggleActivoButton
              id={barbero.id}
              activo={barbero.activo ?? true}
              toggleAction={toggleActivoBarbero}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
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
