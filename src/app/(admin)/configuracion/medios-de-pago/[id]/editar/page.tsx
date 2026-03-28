import { db } from "@/db";
import { mediosPago } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { editarMedioPago } from "../../actions";
import MedioPagoForm from "@/components/configuracion/MedioPagoForm";

interface EditarMedioPagoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarMedioPagoPage({
  params,
}: EditarMedioPagoPageProps) {
  const { id } = await params;

  const [medioPago] = await db
    .select()
    .from(mediosPago)
    .where(eq(mediosPago.id, id))
    .limit(1);

  if (!medioPago) {
    notFound();
  }

  const actionConId = editarMedioPago.bind(null, id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/configuracion/medios-de-pago"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Medios de pago
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-gray-900">
          Editar medio de pago
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <MedioPagoForm
          action={actionConId}
          initialData={{
            nombre: medioPago.nombre,
            comisionPorcentaje: medioPago.comisionPorcentaje,
          }}
          submitLabel="Guardar cambios"
          cancelHref="/configuracion/medios-de-pago"
        />
      </div>
    </div>
  );
}
