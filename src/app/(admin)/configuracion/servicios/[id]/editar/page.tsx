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

function formatARS(value: string | null | undefined) {
  if (!value) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
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
  const extrasCount = adicionales.length;

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[32px] p-6">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="space-y-4">
            <Link
              href="/configuracion/servicios"
              className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              {"<-"} Servicios
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Edicion operativa
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                {servicio.nombre}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Acá ajustás el precio base, la duración y los adicionales sin perder la lectura
                de impacto en caja. Si tocás el precio, el historial queda asentado.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Precio base" value={formatARS(servicio.precioBase)} strong />
            <SummaryCard label="Duracion" value={`${servicio.duracionMinutos} min`} />
            <SummaryCard label="Estado" value={servicio.activo ? "Activo" : "Inactivo"} />
            <SummaryCard
              label="Adicionales"
              value={extrasCount > 0 ? `${extrasCount} cargados` : "Sin extras"}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="panel-card rounded-[32px] p-5 sm:p-6">
          <ServicioForm
            action={editarServicioConId}
            initialData={{
              nombre: servicio.nombre,
              precioBase: servicio.precioBase,
              duracionMinutos: servicio.duracionMinutos,
            }}
            submitLabel="Guardar cambios"
            cancelHref="/configuracion/servicios"
            showMotivoField={true}
          />
        </section>

        <section className="panel-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Adicionales e impacto
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Ajustes complementarios</h2>
            </div>
            <Link
              href={`/configuracion/servicios/${id}/historial`}
              className="inline-flex min-h-[44px] items-center rounded-2xl bg-zinc-800 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
            >
              Ver historial
            </Link>
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Los adicionales no complican la base: suman valor y quedan separados para que el
            barbero entienda rápido qué se agrega y cuánto impacta.
          </p>

          <div className="mt-5 rounded-[24px] bg-zinc-950/80 p-4 ring-1 ring-zinc-800">
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
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] p-4 ring-1 ${
        strong ? "bg-[#8cff59]/10 ring-[#8cff59]/20" : "bg-white/5 ring-white/10"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${strong ? "text-[#8cff59]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
