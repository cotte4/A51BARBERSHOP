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

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/clientes" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Clientes
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick actions */}
          <Link
            href="/hoy"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a]"
          >
            Cobrar
          </Link>
          <Link
            href="/turnos#agenda"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Agendar
          </Link>

          {/* Admin actions */}
          {actor.isAdmin ? (
            <>
              <form action={toggleAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-[40px] items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  {client.esMarciano ? "Quitar Marciano" : "Activar Marciano"}
                </button>
              </form>
              <form action={archiveAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-[40px] items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  {client.archivedAt ? "Desarchivar" : "Archivar"}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>

      <ClientProfileHeader client={client} />

      <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          {/* Edit form */}
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold text-white">Perfil compartido</h2>
            <form action={updateAction} className="mt-4 space-y-4">
              <ClientAvatarUploader initialValue={client.avatarUrl} clientId={client.id} />
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-400">
                  Nombre
                </label>
                <input
                  id="name"
                  name="name"
                  defaultValue={client.name}
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
                />
              </div>
              <div>
                <label htmlFor="phoneRaw" className="mb-1 block text-sm font-medium text-zinc-400">
                  Teléfono
                </label>
                <input
                  id="phoneRaw"
                  name="phoneRaw"
                  defaultValue={client.phoneRaw ?? ""}
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
                />
              </div>
              <div>
                <label htmlFor="tags" className="mb-1 block text-sm font-medium text-zinc-400">
                  Tags
                </label>
                <input
                  id="tags"
                  name="tags"
                  defaultValue={client.tags.join(", ")}
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
                />
              </div>
              <div>
                <label htmlFor="allergies" className="mb-1 block text-sm font-medium text-zinc-400">
                  Alergias
                </label>
                <input
                  id="allergies"
                  name="allergies"
                  defaultValue={client.preferences?.allergies ?? ""}
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
                />
              </div>
              <div>
                <label htmlFor="productPreferences" className="mb-1 block text-sm font-medium text-zinc-400">
                  Preferencias de producto
                </label>
                <input
                  id="productPreferences"
                  name="productPreferences"
                  defaultValue={client.preferences?.productPreferences ?? ""}
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
                />
              </div>
              <div>
                <label htmlFor="extraNotes" className="mb-1 block text-sm font-medium text-zinc-400">
                  Extra preferencias
                </label>
                <input
                  id="extraNotes"
                  name="extraNotes"
                  defaultValue={client.preferences?.extraNotes ?? ""}
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
                />
              </div>
              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-400">
                  Nota general
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={client.notes ?? ""}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-[#8cff59]"
                />
              </div>
              {actor.isAdmin ? (
                <label className="flex items-center gap-3 rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
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
                className="h-12 w-full rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#a8ff80]"
              >
                Guardar perfil
              </button>
            </form>
          </section>

          {/* Visit history */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Historial</h2>
            <Link
              href={`/clientes/${client.id}/post-corte`}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              + Post-corte
            </Link>
          </div>
          <VisitHistory visits={client.visits} />

          {/* Audit log — admin only */}
          {actor.isAdmin ? (
            <ClientProfileAuditLog events={client.auditEvents} />
          ) : null}
        </div>

        <aside className="space-y-5">
          {client.esMarciano ? <MarcianosBriefing clientId={client.id} /> : null}
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold text-white">Estado Marciano</h2>
            <div className="mt-4 space-y-2 text-sm text-zinc-400">
              <p>
                Estado:{" "}
                <span className="font-medium text-white">
                  {client.esMarciano ? "Activo" : "No Marciano"}
                </span>
              </p>
              <p>
                Desde:{" "}
                <span className="font-medium text-white">
                  {client.marcianoDesde
                    ? new Intl.DateTimeFormat("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "America/Argentina/Buenos_Aires",
                      }).format(new Date(client.marcianoDesde))
                    : "-"}
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
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
