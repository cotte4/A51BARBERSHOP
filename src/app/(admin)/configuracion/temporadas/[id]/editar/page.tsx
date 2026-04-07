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
    <div className="space-y-6">
      <section className="panel-card rounded-[32px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/configuracion/temporadas"
              className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              {"<-"} Temporadas
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Edicion de periodo
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                {temporada.nombre ?? "Sin nombre"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Ajusta la ventana proyectada sin perder el contexto de negocio. Si cambia la
                fecha o la expectativa, el dashboard debería leerlo al instante.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-950/80 px-4 py-3 ring-1 ring-zinc-800">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Estado actual</p>
            <p className="mt-2 text-sm text-zinc-300">
              {temporada.fechaInicio} {temporada.fechaFin ? `-> ${temporada.fechaFin}` : "-> en curso"}
            </p>
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[32px] p-5 sm:p-6">
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
      </section>
    </div>
  );
}
