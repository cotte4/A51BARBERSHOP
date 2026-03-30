import Link from "next/link";
import type { ClientSummary } from "@/lib/types";

type ClientCardProps = {
  client: ClientSummary;
};

export default function ClientCard({ client }: ClientCardProps) {
  const lastVisitLabel = client.lastVisitAt
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(client.lastVisitAt))
    : "Sin visitas";

  const initials = client.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

  const barberMemory = client.lastVisitNote?.trim() || "Sin nota del ultimo corte";
  const relativeLastVisit = client.lastVisitAt
    ? formatRelativeVisit(client.lastVisitAt)
    : "Todavia no vino";

  return (
    <article className="panel-card rounded-3xl p-4 transition hover:border-[#8cff59]/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#8cff59] text-sm font-semibold text-[#07130a]">
            {initials || "CL"}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/clientes/${client.id}`}
                className="text-base font-semibold text-white underline-offset-4 hover:text-[#8cff59] hover:underline"
              >
                {client.name}
              </Link>

              {client.esMarciano ? (
                <span className="rounded-full bg-[#8cff59]/14 px-2.5 py-1 text-xs font-semibold text-[#8cff59]">
                  Marciano
                </span>
              ) : null}

              {client.archivedAt ? (
                <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
                  Archivado
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-zinc-400">{client.phoneRaw || "Sin telefono"}</p>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Memoria del barbero
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              Ultimo corte: <span className="font-medium text-white">{barberMemory}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {relativeLastVisit}
              {client.lastVisitBarberoNombre ? ` con ${client.lastVisitBarberoNombre}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
        <span>{lastVisitLabel}</span>
        <span>{client.totalVisits} visitas</span>
        <span>{client.lastVisitBarberoNombre || "Sin barbero previo"}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/reservar/pinky"
          className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
        >
          Agendar turno
        </Link>
        <Link
          href="/caja/nueva"
          className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
        >
          Cobrar
        </Link>
        <Link
          href={`/clientes/${client.id}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950/40 px-4 text-sm font-medium text-zinc-200 transition hover:border-[#8cff59]/30 hover:text-white"
        >
          Ver perfil
        </Link>
      </div>
    </article>
  );
}

function formatRelativeVisit(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays <= 1) return "Vino hoy";
  if (diffDays < 7) return `Hace ${diffDays} dias`;

  const weeks = Math.round(diffDays / 7);
  if (weeks < 5) return `Hace ${weeks} semana${weeks === 1 ? "" : "s"}`;

  const months = Math.round(diffDays / 30);
  return `Hace ${months} mes${months === 1 ? "" : "es"}`;
}
