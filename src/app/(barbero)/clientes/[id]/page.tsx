import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ClientProfileAuditLog from "@/components/clientes/ClientProfileAuditLog";
import ClientAvatarUploader from "@/components/clientes/ClientAvatarUploader";
import ClientProfileHeader from "@/components/clientes/ClientProfileHeader";
import ClientTagsInput from "@/components/clientes/ClientTagsInput";
import MarcianosBriefing from "@/components/clientes/MarcianosBriefing";
import VisitHistory from "@/components/clientes/VisitHistory";
import {
  archiveClientAction,
  toggleMarcianoAction,
  updateClientAction,
} from "@/app/(barbero)/clientes/actions";
import { getClientActorContext } from "@/lib/client-access";
import { getClientProfileForActor } from "@/lib/client-queries";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";
import ClienteDetalleClient from "./_ClienteDetalleClient";
import StyleAnalysisCard from "./_StyleAnalysisCard";

type ClientPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Sin dato";

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export default async function ClienteDetallePage({ params }: ClientPageProps) {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  const { id } = await params;
  const client = await getClientProfileForActor(actor, id);
  if (!client) {
    notFound();
  }

  const updateAction = updateClientAction.bind(null, client.id);
  const toggleAction = toggleMarcianoAction.bind(null, client.id);
  const archiveAction = archiveClientAction.bind(null, client.id);

  const clientStateLabel = client.archivedAt
    ? "Archivado"
    : client.esMarciano
      ? "Marciano activo"
      : "Cliente activo";
  const clientStateToneClass = client.archivedAt
    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
    : client.esMarciano
      ? "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]"
      : "border-zinc-800 bg-zinc-950 text-zinc-300";
  const portalStatus = client.userId ? "Cuenta vinculada" : "Acceso pendiente";
  const portalToneClass = client.userId
    ? "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]"
    : "border-zinc-800 bg-zinc-950 text-zinc-300";
  const cortesUsados = client.marcianoUsage?.cortesUsados ?? 0;
  const cortesDisponibles =
    MARCIANO_BENEFICIOS.cortesPorMes === null
      ? null
      : Math.max(MARCIANO_BENEFICIOS.cortesPorMes - cortesUsados, 0);
  const consumicionesUsadas = client.marcianoUsage?.consumicionesUsadas ?? 0;
  const isAdminView = actor.isAdmin;

  const historialContent = (
    <div className="space-y-5">
      {client.styleAnalysis ? <StyleAnalysisCard analysis={client.styleAnalysis} /> : null}
      {client.esMarciano ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Libro de cortes
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Historial Marciano</h2>
            </div>
            <Link
              href={`/clientes/${client.id}/post-corte`}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              + Corte
            </Link>
          </div>
          <VisitHistory visits={client.visits} />
        </>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-zinc-800 bg-zinc-950 px-4 py-4">
          <p className="text-sm text-zinc-500">Activa Marciano para guardar memoria post-corte.</p>
          <Link
            href={`/clientes/${client.id}/post-corte`}
            className="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            + Corte
          </Link>
        </div>
      )}
    </div>
  );

  const notasContent = client.esMarciano ? (
    <MarcianosBriefing clientId={client.id} />
  ) : (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950 px-5 py-6 text-center">
      <p className="text-sm text-zinc-400">Este cliente no tiene perfil Marciano activo.</p>
    </div>
  );

  const perfilContent = (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.72fr)]">
      <div className="space-y-5">
        <ClientProfileHeader
          client={client}
          stateLabel={clientStateLabel}
          stateToneClass={clientStateToneClass}
          actions={
            <>
              <Link
                href="/hoy"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] transition hover:bg-[#a8ff80]"
              >
                Cobrar
              </Link>
              <Link
                href={`/clientes/${client.id}/post-corte`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#8cff59]/25 bg-[#8cff59]/10 px-4 text-sm font-semibold text-[#8cff59] transition hover:bg-[#8cff59]/15"
              >
                Post-corte
              </Link>
              <Link
                href="/turnos"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Agendar
              </Link>
            </>
          }
        />

        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                {isAdminView ? "Perfil compartido" : "Ficha express"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {isAdminView ? "Editar datos base" : "Lo justo para atender mejor"}
              </h2>
            </div>
          </div>

          <form action={updateAction} className="mt-5 space-y-4">
            {isAdminView ? (
              <>
                <ClientAvatarUploader initialValue={client.avatarUrl} clientId={client.id} />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-400">
                      Nombre
                    </label>
                    <input
                      id="name"
                      name="name"
                      defaultValue={client.name}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phoneRaw"
                      className="mb-1 block text-sm font-medium text-zinc-400"
                    >
                      Telefono
                    </label>
                    <input
                      id="phoneRaw"
                      name="phoneRaw"
                      defaultValue={client.phoneRaw ?? ""}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-400">
                      Email Marciano
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={client.email ?? ""}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="tags" className="mb-1 block text-sm font-medium text-zinc-400">
                      Tags
                    </label>
                    <input
                      id="tags"
                      name="tags"
                      defaultValue={client.tags.join(", ")}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="allergies"
                      className="mb-1 block text-sm font-medium text-zinc-400"
                    >
                      Alergias
                    </label>
                    <input
                      id="allergies"
                      name="allergies"
                      defaultValue={client.preferences?.allergies ?? ""}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="productPreferences"
                      className="mb-1 block text-sm font-medium text-zinc-400"
                    >
                      Preferencias de producto
                    </label>
                    <input
                      id="productPreferences"
                      name="productPreferences"
                      defaultValue={client.preferences?.productPreferences ?? ""}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="extraNotes"
                      className="mb-1 block text-sm font-medium text-zinc-400"
                    >
                      Extra preferencias
                    </label>
                    <input
                      id="extraNotes"
                      name="extraNotes"
                      defaultValue={client.preferences?.extraNotes ?? ""}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-400">
                      Nota general
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      defaultValue={client.notes ?? ""}
                      rows={4}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <input type="hidden" name="email" value={client.email ?? ""} />
                <input type="hidden" name="avatarUrl" value={client.avatarUrl ?? ""} />
                <input
                  type="hidden"
                  name="allergies"
                  value={client.preferences?.allergies ?? ""}
                />
                <input
                  type="hidden"
                  name="productPreferences"
                  value={client.preferences?.productPreferences ?? ""}
                />
                <input
                  type="hidden"
                  name="extraNotes"
                  value={client.preferences?.extraNotes ?? ""}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border border-zinc-800 bg-zinc-950 p-4 md:col-span-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="name" className="block text-sm font-medium text-zinc-400">
                        Nombre
                      </label>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                        visible en agenda y caja
                      </span>
                    </div>
                    <input
                      id="name"
                      name="name"
                      defaultValue={client.name}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div className="rounded-[22px] border border-zinc-800 bg-zinc-950 p-4">
                    <label
                      htmlFor="phoneRaw"
                      className="mb-2 block text-sm font-medium text-zinc-400"
                    >
                      Telefono
                    </label>
                    <input
                      id="phoneRaw"
                      name="phoneRaw"
                      defaultValue={client.phoneRaw ?? ""}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]"
                    />
                  </div>

                  <div className="rounded-[22px] border border-zinc-800 bg-zinc-950 p-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-400">Tags</label>
                    <ClientTagsInput initialTags={client.tags} />
                  </div>

                  <div className="overflow-hidden rounded-[22px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-4 shadow-[0_14px_28px_rgba(0,0,0,0.24)] md:col-span-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-zinc-300">
                          Nota general
                        </label>
                        <p className="mt-1 text-xs text-zinc-500">
                          Lo lee cualquier barbero antes de arrancar.
                        </p>
                      </div>
                      <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8cff59]">
                        briefing manual
                      </span>
                    </div>
                    <div className="rounded-[18px] border border-zinc-800 bg-zinc-900/80 p-3">
                      <div className="mb-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                        <span className="rounded-full border border-zinc-800 px-2.5 py-1">
                          preferencias
                        </span>
                        <span className="rounded-full border border-zinc-800 px-2.5 py-1">
                          alertas
                        </span>
                        <span className="rounded-full border border-zinc-800 px-2.5 py-1">tono</span>
                      </div>
                      <textarea
                        id="notes"
                        name="notes"
                        defaultValue={client.notes ?? ""}
                        rows={4}
                        placeholder="Ej: siempre pide perfil prolijo, le molesta que le toquen mucho la barba, prefiere charla corta..."
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {actor.isAdmin ? (
              <label className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="esMarciano"
                  defaultChecked={client.esMarciano}
                  className="size-4 rounded border-zinc-600"
                />
                Cliente Marciano
              </label>
            ) : null}

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] transition hover:bg-[#a8ff80]"
            >
              {isAdminView ? "Guardar perfil" : "Guardar ficha rapida"}
            </button>
          </form>
        </section>

        {actor.isAdmin ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400">
              Ver log técnico
            </summary>
            <div className="mt-3">
              <ClientProfileAuditLog events={client.auditEvents} />
            </div>
          </details>
        ) : null}
      </div>

      <aside className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-[#8cff59]/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
          <div className="border-b border-zinc-800 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Portal Marciano
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Acceso y beneficios</h2>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${portalToneClass}`}
              >
                {portalStatus}
              </span>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Email acceso
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {client.email ?? "No cargado"}
                </p>
              </div>
              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Cortes del mes
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {cortesUsados}/{MARCIANO_BENEFICIOS.cortesPorMes}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {cortesDisponibles === null
                    ? "Plan sin limite configurado."
                    : `${cortesDisponibles} disponibles para usar.`}
                </p>
              </div>
              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Consumiciones
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {consumicionesUsadas}
                  {MARCIANO_BENEFICIOS.consumicionesPorMes !== null
                    ? `/${MARCIANO_BENEFICIOS.consumicionesPorMes}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {MARCIANO_BENEFICIOS.consumicionesPorMes !== null
                    ? "Uso del beneficio del mes."
                    : "Tracking abierto."}
                </p>
              </div>
              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Alta Marciano
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {client.marcianoDesde ? formatDate(client.marcianoDesde) : "Sin fecha"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {client.esMarciano ? "Programa activo." : "Cliente sin activacion todavia."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {actor.isAdmin ? (
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Control de cuenta
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Acciones seguras</h2>

            <div className="mt-4 space-y-3">
              <form action={toggleAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                >
                  {client.esMarciano ? "Quitar Marciano" : "Activar Marciano"}
                </button>
              </form>
              <form action={archiveAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  {client.archivedAt ? "Desarchivar" : "Archivar"}
                </button>
              </form>
            </div>
          </section>
        ) : null}
      </aside>
    </section>
  );

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.12),_transparent_30%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="space-y-2">
          <Link
            href="/clientes"
            className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
          >
            &larr; Clientes
          </Link>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Ficha operativa
            </p>
            <p className="text-sm text-zinc-400">Comando central del cliente.</p>
          </div>
        </div>
      </section>

      <ClienteDetalleClient
        perfilContent={perfilContent}
        historialContent={historialContent}
        notasContent={notasContent}
      />
    </div>
  );
}
