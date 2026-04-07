import Link from "next/link";
import { redirect } from "next/navigation";
import ClientSearch from "@/components/clientes/ClientSearch";
import RetentionBanner from "@/components/clientes/RetentionBanner";
import { getClientActorContext } from "@/lib/client-access";
import { getRetentionCandidates, searchVisibleClients } from "@/lib/client-queries";

export default async function ClientesPage() {
  const actor = await getClientActorContext();
  if (!actor) {
    redirect("/login");
  }

  const [initialClients, allClients, retentionCandidates] = await Promise.all([
    searchVisibleClients(actor, "", { limit: 12 }),
    searchVisibleClients(actor, "", { limit: 120 }),
    actor.isAdmin ? getRetentionCandidates() : Promise.resolve([]),
  ]);

  const recentCount = initialClients.length;
  const totalCount = allClients.length;
  const retentionCount = retentionCandidates.length;

  return (
    <div className="space-y-5 pb-6">
      <section className="panel-card overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow text-[11px] font-semibold">Gestion de clientes</p>
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Encuentra, lee y actua sobre cada cliente sin perder ritmo.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              La vista prioriza escaneo rapido, memoria del ultimo corte y accesos obvios para
              abrir perfil, agendar turno o cobrar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/clientes/nuevo"
              className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold"
            >
              + Nuevo cliente
            </Link>
            <Link
              href="/turnos"
              className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold"
            >
              Ver turnos
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="panel-soft rounded-[22px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Base visible
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">{totalCount}</p>
            <p className="mt-1 text-sm text-zinc-400">Clientes cargados para buscar y abrir.</p>
          </div>
          <div className="panel-soft rounded-[22px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Recientes
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">{recentCount}</p>
            <p className="mt-1 text-sm text-zinc-400">Arranque rapido con los ultimos movimientos.</p>
          </div>
          <div className="panel-soft rounded-[22px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Retencion
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">{retentionCount}</p>
            <p className="mt-1 text-sm text-zinc-400">Senal para reactivar clientes con valor.</p>
          </div>
        </div>

      </section>

      {actor.isAdmin && retentionCandidates.length > 0 ? (
        <RetentionBanner candidates={retentionCandidates} />
      ) : null}

      <ClientSearch
        initialClients={initialClients}
        allClients={allClients}
        totalClients={totalCount}
        recentCount={recentCount}
      />
    </div>
  );
}
