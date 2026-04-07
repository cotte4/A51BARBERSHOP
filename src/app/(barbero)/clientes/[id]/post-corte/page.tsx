import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ClientProfileHeader from "@/components/clientes/ClientProfileHeader";
import PostCorteForm from "@/components/clientes/PostCorteForm";
import { getClientActorContext } from "@/lib/client-access";
import { getClientProfileForActor } from "@/lib/client-queries";

type PostCortePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostCortePage({ params }: PostCortePageProps) {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  const { id } = await params;
  const client = await getClientProfileForActor(actor, id);
  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/clientes/${id}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Volver al perfil
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/clientes/${id}`}
            className="inline-flex min-h-10 items-center rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            Perfil
          </Link>
          <Link
            href="/hoy"
            className="inline-flex min-h-10 items-center rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 text-sm font-semibold text-[#b9ff96] transition hover:bg-[#8cff59]/15"
          >
            Hoy
          </Link>
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-[32px] border border-[#8cff59]/15 bg-[radial-gradient(circle_at_top_right,rgba(140,255,89,0.15),transparent_34%),linear-gradient(180deg,rgba(20,24,16,0.96),rgba(9,11,15,0.98))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8cff59]">
              Post-corte
            </p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Registrar visita
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
                  Deja la visita cerrada en una sola pasada. Notas, etiquetas, propina y fotos
                  quedan listos para el siguiente corte.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Cliente</p>
                <p className="mt-1 text-base font-semibold text-white">{client.name}</p>
                <p className="text-zinc-400">{client.phoneRaw || "Sin telefono"}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Visitas</p>
                <p className="mt-2 text-2xl font-bold text-white">{client.totalVisits}</p>
                <p className="mt-1 text-xs text-zinc-400">Historial total del cliente</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Estado</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {client.esMarciano ? "Marciano" : "Normal"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {client.esMarciano ? "Tiene acceso al portal" : "Sin acceso especial"}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Barbero</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {client.lastVisitBarberoNombre || "Sin registro"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">Ultimo barbero asociado</p>
              </div>
            </div>

            {client.archivedAt ? (
              <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
                Este cliente esta archivado. La visita se puede registrar igual, pero conviene
                revisar antes de guardar cambios de perfil.
              </div>
            ) : null}
          </div>

          <ClientProfileHeader client={client} />
        </div>

        <aside className="space-y-4">
          <section className="panel-card rounded-[28px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Checklist
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Que queda guardado al tocar el CTA
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
              <li>Notas breves del corte para leer rapido en la proxima visita.</li>
              <li>Tags de la sesion para encontrar patrones sin abrir el perfil entero.</li>
              <li>Propina y fotos para tener contexto visual del resultado final.</li>
            </ul>
          </section>

          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold text-white">Modo rapido</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
              <p>
                Si no hay fotos, la visita igual se guarda. Si subis archivos y algo falla, podes
                reintentar o guardar sin imagenes desde el aviso.
              </p>
              <p>
                El objetivo es que el cierre sea corto, pero sin perder lo importante para el
                siguiente turno.
              </p>
            </div>
          </section>
        </aside>
      </section>

      <PostCorteForm
        clientId={id}
        clientName={client.name}
        clientIsMarciano={client.esMarciano}
      />
    </div>
  );
}
