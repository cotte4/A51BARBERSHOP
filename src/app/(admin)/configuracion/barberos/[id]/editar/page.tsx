import { db } from "@/db";
import { barberos } from "@/db/schema";
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

  const [barbero] = await db
    .select()
    .from(barberos)
    .where(eq(barberos.id, id))
    .limit(1);

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
          }}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
