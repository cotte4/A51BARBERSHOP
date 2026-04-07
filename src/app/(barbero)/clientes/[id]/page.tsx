import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ClientProfileAuditLog from "@/components/clientes/ClientProfileAuditLog";
import ClientAvatarUploader from "@/components/clientes/ClientAvatarUploader";
import ClientProfileHeader from "@/components/clientes/ClientProfileHeader";
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

function statTone(kind: "neutral" | "accent" | "warning" = "neutral") {
  if (kind === "accent") {
    return "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]";
  }

  if (kind === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-zinc-800 bg-zinc-950 text-zinc-300";
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
  const clientStateTone = client.archivedAt
    ? "warning"
    : client.esMarciano
      ? "accent"
      : "neutral";

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.15),_transparent_35%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/clientes"
              className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
            >
              &larr; Clientes
            </Link>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Ficha operativa
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {client.name}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                Una sola vista para leer contexto, editar datos compartidos y ejecutar las
                acciones que mas usa el barbero sin perder foco.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statTone(clientStateTone)}`}>
                {clientStateLabel}
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
                {client.totalVisits} visitas
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
                {client.phoneRaw || "Sin telefono"}
              </span>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="space-y-5">
          <ClientProfileHeader client={client} />

          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Perfil compartido
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Editar datos base</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Lo que guardes aca impacta caja, turnos y lectura de cliente.
                </p>
              </div>
            </div>

            <form action={updateAction} className="mt-5 space-y-4">
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
                Guardar perfil
              </button>
            </form>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Actividad
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Historial visible</h2>
            </div>
            <Link
              href={`/clientes/${client.id}/post-corte`}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              Registrar post-corte
            </Link>
          </div>
          <VisitHistory visits={client.visits} />

          {actor.isAdmin ? <ClientProfileAuditLog events={client.auditEvents} /> : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Lectura rapida
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Lo que importa ahora</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Estado</p>
                <p className="mt-2 text-sm font-semibold text-white">{clientStateLabel}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {client.archivedAt ? "El perfil esta pausado para uso operativo." : "Disponible para caja, agenda y seguimiento."}
                </p>
              </div>

              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Telefono</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {client.phoneRaw || "Sin telefono"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Canal principal para coordinar citas.</p>
              </div>

              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Visitas</p>
                <p className="mt-2 text-sm font-semibold text-white">{client.totalVisits}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ultimo barbero: {client.lastVisitBarberoNombre || "Sin registro"}
                </p>
              </div>

              <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Marciano</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {client.esMarciano ? "Activo" : "No activo"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {client.marcianoDesde ? `Desde ${formatDate(client.marcianoDesde)}` : "Sin alta en el programa."}
                </p>
              </div>
            </div>
          </section>

          {actor.isAdmin ? (
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Control de cuenta
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Acciones seguras</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Estas acciones cambian el estado operativo del cliente. Usalas solo cuando haga falta.
              </p>

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

          {client.esMarciano ? <MarcianosBriefing clientId={client.id} /> : null}

          <section className="rounded-[28px] border border-[#8cff59]/20 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Portal Marciano
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Acceso y beneficios</h2>
            <div className="mt-4 space-y-2 text-sm text-zinc-400">
              <p>
                Email de acceso:{" "}
                <span className="font-medium text-white">{client.email ?? "No cargado"}</span>
              </p>
              <p>
                Cuenta vinculada:{" "}
                <span className="font-medium text-white">
                  {client.userId ? "Lista para ingresar" : "Pendiente de registro"}
                </span>
              </p>
              <p>
                Cortes usados este mes:{" "}
                <span className="font-medium text-white">
                  {client.marcianoUsage?.cortesUsados ?? 0}/{MARCIANO_BENEFICIOS.cortesPorMes}
                </span>
              </p>
              <p>
                Consumiciones usadas este mes:{" "}
                <span className="font-medium text-white">
                  {client.marcianoUsage?.consumicionesUsadas ?? 0}
                  {MARCIANO_BENEFICIOS.consumicionesPorMes !== null
                    ? `/${MARCIANO_BENEFICIOS.consumicionesPorMes}`
                    : " (tracking)"}
                </span>
              </p>
              <p className="text-xs text-zinc-500">
                El portal usa el email del cliente Marciano para crear y vincular su cuenta.
              </p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
