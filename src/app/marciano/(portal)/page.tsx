import Link from "next/link";
import { getMarcianoUpcomingTurno } from "@/lib/marciano-turnos";
import { getMarcianoDashboardData, requireMarcianoClient } from "@/lib/marciano-portal";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";
import AvatarCard from "./_AvatarCard";

function formatFecha(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(value);
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 2l2.9 6.4 6.9.6-5 4.8 1.5 6.8L12 17.5l-6.3 3.1 1.5-6.8-5-4.8 6.9-.6L12 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" />
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      <path d="M5.6 5.6l1.4 1.4M16.9 16.9l1.5 1.5M5.6 18.4l1.4-1.4M16.9 7.1l1.5-1.5" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M7.5 3.5V7M16.5 3.5V7M3.5 9.5h17" strokeLinecap="round" />
    </svg>
  );
}

export default async function MarcianoPortalPage() {
  const { session, client } = await requireMarcianoClient();
  const [data, proximoTurno] = await Promise.all([
    getMarcianoDashboardData(session.user.id),
    getMarcianoUpcomingTurno(client.id),
  ]);

  if (!data) return null;

  const cortesRestantes = data.usage.cortesRestantes ?? MARCIANO_BENEFICIOS.cortesPorMes;
  const consumicionesRestantes = data.usage.consumicionesRestantes;

  const proximoFecha = proximoTurno
    ? formatFecha(new Date(`${proximoTurno.fecha}T${proximoTurno.horaInicio}-03:00`))
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI hero */}
      <section className="panel-card rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs">Este mes</p>
            <p className="font-display mt-2 text-4xl font-bold text-white">
              {cortesRestantes}{" "}
              <span className="text-2xl font-semibold text-zinc-400">
                {cortesRestantes === 1 ? "corte" : "cortes"}
              </span>
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {data.usage.cortesUsados} de {MARCIANO_BENEFICIOS.cortesPorMes} usados
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]">
            <StarIcon />
          </span>
        </div>

        {consumicionesRestantes !== null ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8cff59]" />
            <p className="text-xs text-zinc-400">
              {consumicionesRestantes} consumiciones disponibles este mes
            </p>
          </div>
        ) : null}
      </section>

      {/* Próximo turno */}
      <section className="panel-card rounded-[28px] p-5">
        <p className="eyebrow text-xs">Próximo turno</p>
        {proximoTurno && proximoFecha ? (
          <div className="mt-3">
            <div className="rounded-[20px] border border-[#8cff59]/20 bg-[#8cff59]/8 px-4 py-3">
              <p className="text-sm font-bold text-white capitalize">{proximoFecha}</p>
              <p className="mt-0.5 text-sm text-zinc-400">
                {proximoTurno.horaInicio.slice(0, 5)}
                {proximoTurno.servicioNombre ? ` · ${proximoTurno.servicioNombre}` : ""}
              </p>
            </div>
            <Link
              href="/marciano/turnos/nuevo"
              className="ghost-button mt-3 flex w-full items-center justify-center rounded-[20px] px-4 py-2.5 text-sm font-semibold"
            >
              Reservar otro turno
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-zinc-500">No tenés un turno próximo.</p>
            <Link
              href="/marciano/turnos/nuevo"
              className="neon-button mt-3 flex w-full items-center justify-center rounded-[20px] px-4 py-3 text-sm font-semibold"
            >
              Reservar ahora
            </Link>
          </div>
        )}
      </section>

      {/* Avatar Marciano */}
      <AvatarCard
        styleCompletedAt={data.client.styleCompletedAt ?? null}
        avatarUrl={data.client.avatarUrl ?? null}
        favoriteColor={data.client.favoriteColor ?? null}
      />

      {/* Quick access */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/marciano/estilo"
          className="panel-card flex flex-col items-center justify-center gap-2 rounded-[28px] p-5 text-center transition hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span className="text-[#8cff59]">
            <SparklesIcon />
          </span>
          <p className="text-sm font-semibold text-white">Mi Estilo</p>
          <p className="text-xs text-zinc-500">Style DNA</p>
        </Link>

        <Link
          href="/marciano/turnos"
          className="panel-card flex flex-col items-center justify-center gap-2 rounded-[28px] p-5 text-center transition hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span className="text-zinc-400">
            <CalendarIcon />
          </span>
          <p className="text-sm font-semibold text-white">Mis Turnos</p>
          <p className="text-xs text-zinc-500">Historial y agenda</p>
        </Link>
      </div>
    </div>
  );
}
