import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ClientProfileAuditLog from "@/components/clientes/ClientProfileAuditLog";
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
      <div className="flex items-center justify-between gap-3">
        <Link href="/clientes" className="text-sm text-gray-500 underline">
          ← Volver a clientes
        </Link>
        <div className="flex gap-2">
          {actor.isAdmin ? (
            <>
              <form action={toggleAction}>
                <button
                  type="submit"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  {client.esMarciano ? "Quitar Marciano" : "Activar Marciano"}
                </button>
              </form>
              <form action={archiveAction}>
                <button
                  type="submit"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
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
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Perfil compartido</h2>
            <form action={updateAction} className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  id="name"
                  name="name"
                  defaultValue={client.name}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label htmlFor="phoneRaw" className="mb-1 block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <input
                  id="phoneRaw"
                  name="phoneRaw"
                  defaultValue={client.phoneRaw ?? ""}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label htmlFor="tags" className="mb-1 block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  id="tags"
                  name="tags"
                  defaultValue={client.tags.join(", ")}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label htmlFor="allergies" className="mb-1 block text-sm font-medium text-gray-700">
                  Alergias
                </label>
                <input
                  id="allergies"
                  name="allergies"
                  defaultValue={client.preferences?.allergies ?? ""}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label
                  htmlFor="productPreferences"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Preferencias de producto
                </label>
                <input
                  id="productPreferences"
                  name="productPreferences"
                  defaultValue={client.preferences?.productPreferences ?? ""}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label htmlFor="extraNotes" className="mb-1 block text-sm font-medium text-gray-700">
                  Extra preferencias
                </label>
                <input
                  id="extraNotes"
                  name="extraNotes"
                  defaultValue={client.preferences?.extraNotes ?? ""}
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
                  Nota general
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={client.notes ?? ""}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>
              {actor.isAdmin ? (
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="esMarciano"
                    defaultChecked={client.esMarciano}
                    className="size-4 rounded border-gray-300"
                  />
                  Cliente Marciano
                </label>
              ) : null}
              <button
                type="submit"
                className="h-12 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white"
              >
                Guardar perfil
              </button>
            </form>
          </section>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Historial</h2>
            <Link
              href={`/clientes/${client.id}/post-corte`}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              + Post-corte
            </Link>
          </div>
          <VisitHistory visits={client.visits} />
          <ClientProfileAuditLog events={client.auditEvents} />
        </div>

        <aside className="space-y-5">
          {client.esMarciano ? <MarcianosBriefing clientId={client.id} /> : null}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Estado Marciano</h2>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                Estado:{" "}
                <span className="font-medium text-gray-900">
                  {client.esMarciano ? "Activo" : "No Marciano"}
                </span>
              </p>
              <p>
                Desde:{" "}
                <span className="font-medium text-gray-900">
                  {client.marcianoDesde
                    ? new Intl.DateTimeFormat("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "America/Argentina/Buenos_Aires",
                      }).format(new Date(client.marcianoDesde))
                    : "—"}
                </span>
              </p>
              <p>
                Cortes usados este mes:{" "}
                <span className="font-medium text-gray-900">
                  {client.marcianoUsage?.cortesUsados ?? 0}/{MARCIANO_BENEFICIOS.cortesPorMes}
                </span>
              </p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
