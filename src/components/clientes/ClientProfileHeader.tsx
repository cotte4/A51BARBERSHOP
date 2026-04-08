import Image from "next/image";
import type { ReactNode } from "react";
import type { ClientProfile } from "@/lib/types";

type ClientProfileHeaderProps = {
  client: ClientProfile;
  actions?: ReactNode;
  stateLabel?: string;
  stateToneClass?: string;
};

export default function ClientProfileHeader({
  client,
  actions,
  stateLabel,
  stateToneClass,
}: ClientProfileHeaderProps) {
  const initials =
    client.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "CL";

  const resolvedStateLabel = stateLabel ?? (client.archivedAt ? "Archivado" : "Cliente activo");
  const resolvedStateToneClass =
    stateToneClass ??
    (client.archivedAt
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]");
  const lastVisitLabel = client.lastVisitAt
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "short",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(client.lastVisitAt))
    : null;

  return (
    <section className="space-y-4 rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950 text-lg font-semibold text-white shadow-[0_0_0_1px_rgba(140,255,89,0.08)]">
            {client.avatarUrl ? (
              <Image src={client.avatarUrl} alt={client.name} fill sizes="72px" className="object-cover" />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Cliente
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white">{client.name}</h1>
              <p className="text-sm text-zinc-400">{client.phoneRaw || "Sin telefono"}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${resolvedStateToneClass}`}>
                {resolvedStateLabel}
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-300">
                {client.totalVisits} {client.totalVisits === 1 ? "visita" : "visitas"}
              </span>
              {client.esMarciano ? (
                <span className="rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#8cff59]">
                  Marciano
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Ultimo barbero:{" "}
                <span className="font-medium text-zinc-300">
                  {client.lastVisitBarberoNombre || "Sin historial"}
                </span>
              </span>
              {lastVisitLabel ? (
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                  Ultimo corte: <span className="font-medium text-zinc-300">{lastVisitLabel}</span>
                </span>
              ) : null}
              {client.email ? (
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                  Email: <span className="font-medium text-zinc-300">{client.email}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:max-w-[340px] lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {client.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {client.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
