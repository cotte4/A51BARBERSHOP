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
    <main className="space-y-6">
      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Link
              href="/configuracion/medios-de-pago"
              className="text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              &lt;- Medios de pago
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Editar medio de pago
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-400">
              Cambios en comision o estado impactan directamente el neto y la lectura de caja.
            </p>
          </div>
          <div className="rounded-[22px] bg-zinc-900 px-4 py-3 text-sm text-zinc-300 ring-1 ring-zinc-700">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Actual</p>
            <p className="mt-2">{medioPago.nombre}</p>
          </div>
        </div>
      </section>

      <div className="panel-card rounded-[28px] p-5">
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
    </main>
  );
}
