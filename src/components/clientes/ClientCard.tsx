import Image from "next/image";
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
  const relativeLastVisit = client.lastVisitAt ? formatRelativeVisit(client.lastVisitAt) : "Todavia no vino";
  const phoneHref = client.phoneRaw ? `tel:${client.phoneRaw.replace(/\D/g, "")}` : null;

  return (
    <article className="panel-card rounded-[28px] p-4 transition hover:border-[#8cff59]/25 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#8cff59] text-sm font-semibold text-[#07130a] ring-1 ring-[#8cff59]/20">
            {client.avatarUrl ? (
              <Image src={client.avatarUrl} alt={client.name} fill sizes="56px" className="object-cover" />
            ) : (
              initials || "CL"
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/clientes/${client.id}`}
                className="min-w-0 truncate text-base font-semibold text-white underline-offset-4 hover:text-[#8cff59] hover:underline"
              >
                {client.name}
              </Link>

              {client.esMarciano ? (
                <span className="rounded-full border border-[#8cff59]/18 bg-[#8cff59]/12 px-2.5 py-1 text-xs font-semibold text-[#8cff59]">
                  Marciano
                </span>
              ) : null}

              {client.archivedAt ? (
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                  Archivado
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              {phoneHref ? (
                <a href={phoneHref} className="hover:text-white">
                  {client.phoneRaw}
                </a>
              ) : (
                <span>Sin telefono</span>
              )}
              <span className="text-zinc-600">-</span>
              <span>{client.totalVisits} visitas</span>
            </div>

            <div className="mt-3 rounded-[20px] border border-white/6 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Memoria del barbero
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-300">
                Ultimo corte: <span className="font-medium text-white">{barberMemory}</span>
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {relativeLastVisit}
                {client.lastVisitBarberoNombre ? ` con ${client.lastVisitBarberoNombre}` : ""}
              </p>
            </div>

            <div className="mt-3 rounded-[20px] border border-[#8cff59]/14 bg-[linear-gradient(135deg,rgba(140,255,89,0.08),rgba(217,70,239,0.05))] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Radar marciano
                </p>
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.8)]" />
                  <span className="h-2 w-2 rounded-full bg-fuchsia-400/80" />
                  <span className="h-2 w-2 rounded-full bg-sky-300/80" />
                </div>
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-300">
                {client.esMarciano
                  ? "Cliente dentro de la nave: vale cuidarlo con lectura rapida y seguimiento fino."
                  : "Cliente de calle listo para volver a entrar en orbita con un nuevo turno."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
            {lastVisitLabel}
          </span>
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
            {client.lastVisitBarberoNombre || "Sin barbero previo"}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Link
            href={`/clientes/${client.id}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-zinc-950/60 px-4 text-sm font-semibold text-white hover:border-[#8cff59]/25"
          >
            Ver perfil
          </Link>
          <Link
            href="/turnos"
            className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            Agendar turno
          </Link>
          <Link
            href={`/caja/nueva?clienteId=${client.id}`}
            className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            Cobrar
          </Link>
        </div>
      </div>
    </article>
  );
}

function formatRelativeVisit(date: Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays <= 1) return "Vino hoy";
  if (diffDays < 7) return `Hace ${diffDays} dias`;

  const weeks = Math.round(diffDays / 7);
  if (weeks < 5) return `Hace ${weeks} semana${weeks === 1 ? "" : "s"}`;

  const months = Math.round(diffDays / 30);
  return `Hace ${months} mes${months === 1 ? "" : "es"}`;
}
