import Link from "next/link";
import { redirect } from "next/navigation";
import type { TurnoSummary } from "@/lib/types";
import TurnoCard from "@/components/turnos/TurnoCard";
import TurnosSpotifyBridge from "@/components/turnos/TurnosSpotifyBridge";
import QuickTurnoSlotCard from "@/components/turnos/QuickTurnoSlotCard";
import {
  clienteLlegoAction,
  completarTurnoAction,
  confirmarTurnoAction,
  crearTurnoRapidoAction,
  rechazarTurnoAction,
} from "./actions";
import {
  getBarberosActivosTurnos,
  getDisponibilidadLibrePorFecha,
  getFechaHoyArgentina,
  getTurnosVisibleList,
} from "@/lib/turnos";
import { getTurnosActorContext } from "@/lib/turnos-access";

type TurnosPageProps = {
  searchParams: Promise<{ fecha?: string; estado?: string; scope?: string }>;
};

type TimelineFreeSlot = {
  id: string;
  barberoId: string;
  barberoNombre: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
};

type TimelineSlot = {
  time: string;
  turnos: TurnoSummary[];
  freeSlots: TimelineFreeSlot[];
};

export default async function TurnosPage({ searchParams }: TurnosPageProps) {
  const actor = await getTurnosActorContext();
  if (!actor) {
    redirect("/login");
  }

  const params = await searchParams;
  const fecha = params.fecha ?? getFechaHoyArgentina();
  const estado = params.estado && params.estado !== "todos" ? params.estado : undefined;
  const scope = actor.isAdmin && params.scope === "equipo" ? "equipo" : "mio";
  const visibleBarberoId = scope === "mio" ? actor.barberoId ?? undefined : undefined;

  const [turnos, barberos, slotsLibres] = await Promise.all([
    getTurnosVisibleList(fecha, estado, visibleBarberoId),
    getBarberosActivosTurnos(),
    getDisponibilidadLibrePorFecha(fecha, visibleBarberoId),
  ]);

  const fechaHoy = getFechaHoyArgentina();
  const isToday = fecha === fechaHoy;
  const timelineSlots = buildTimelineSlots(turnos, slotsLibres);
  const pendingMarcianos = turnos.filter(
    (turno) => turno.estado === "pendiente" && turno.esMarcianoSnapshot
  );
  const pendientes = turnos.filter((turno) => turno.estado === "pendiente").length;
  const confirmados = turnos.filter((turno) => turno.estado === "confirmado").length;
  const completados = turnos.filter((turno) => turno.estado === "completado").length;
  const actorBarbero = actor.barberoId ? barberos.find((barbero) => barbero.id === actor.barberoId) : null;
  const title = scope === "equipo" ? "Turnos del equipo" : "Mis turnos";
  const showScopeToggle = actor.isAdmin && actor.barberoId;
  const priorityCount = turnos.filter((turno) => turno.estado === "pendiente" && turno.prioridadAbsoluta).length;

  if (!actor.isAdmin && !actor.barberoId) {
    return (
      <main className="app-shell min-h-screen px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-900 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <p className="eyebrow text-xs">Acceso a turnos</p>
          <p className="mt-3 text-base font-semibold text-white">No encontramos tu perfil de barbero.</p>
          <p className="mt-2 text-sm text-zinc-400">
            Vincula tu usuario con un barbero activo para usar la agenda desde este tab.
          </p>
          <Link
            href="/hoy"
            className="neon-button mt-4 inline-flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-semibold"
          >
            Volver a hoy
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-24">
      <TurnosSpotifyBridge />
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="panel-card overflow-hidden rounded-[30px]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.16),_transparent_34%)] p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/hoy" className="eyebrow inline-flex items-center text-xs hover:text-zinc-300">
                    &larr; Hoy
                  </Link>
                  <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cff59]">
                    {isToday ? "En curso" : "Plan del dia"}
                  </span>
                  <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    {scope === "equipo" ? "Equipo" : "Mi agenda"}
                  </span>
                </div>

                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    {formatFechaLarga(fecha)}
                    {isToday ? " · Hoy" : ""}. Priorizamos pendientes y confirmados para ver rapido lo que pide
                    accion.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1.5 text-xs font-medium text-zinc-300">
                    {turnos.length} turnos visibles
                  </span>
                  <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1.5 text-xs font-medium text-[#8cff59]">
                    {slotsLibres.length} huecos libres
                  </span>
                  {priorityCount > 0 ? (
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
                      {priorityCount} pendientes prioritarios
                    </span>
                  ) : null}
                  {pendingMarcianos.length > 0 ? (
                    <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1.5 text-xs font-medium text-fuchsia-200">
                      {pendingMarcianos.length} solicitudes Marciano
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Link
                  href={slotsLibres.length === 0 ? "/turnos/disponibilidad" : "#agenda"}
                  className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-sm font-semibold"
                >
                  + Nuevo turno
                </Link>
                {actor.isAdmin ? (
                  <Link
                    href="/turnos/disponibilidad"
                    className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-sm font-semibold"
                  >
                    Disponibilidad
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Pendientes"
                value={String(pendientes)}
                detail={priorityCount > 0 ? `${priorityCount} con prioridad` : "Listos para despejar"}
                tone="amber"
              />
              <MetricCard
                label="Confirmados"
                value={String(confirmados)}
                detail="Turnos listos para atender"
                tone="emerald"
              />
              <MetricCard
                label="Completados"
                value={String(completados)}
                detail="Cierre operativo del dia"
                tone="slate"
              />
              <MetricCard
                label="Huecos libres"
                value={String(slotsLibres.length)}
                detail="Disponibilidad lista para cargar"
                tone="brand"
              />
            </div>
          </div>
        </section>

        {showScopeToggle ? (
          <section className="panel-soft rounded-[24px] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow text-[10px]">Scope</p>
                <h2 className="font-display text-xl text-white">Barbero o equipo</h2>
              </div>
              <p className="text-xs text-zinc-500">
                {scope === "equipo" ? "Estas viendo toda la operacion activa" : "Estas viendo solo tu agenda"}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ScopeLink
                href={buildTurnosHref(fecha, estado, "mio")}
                label={actorBarbero?.nombre ?? "Mis turnos"}
                active={scope === "mio"}
              />
              <ScopeLink href={buildTurnosHref(fecha, estado, "equipo")} label="Equipo" active={scope === "equipo"} />
            </div>
          </section>
        ) : null}

        <section className="panel-soft rounded-[24px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-[10px]">Filtros</p>
              <h2 className="font-display text-xl text-white sm:text-2xl">Recorte de agenda</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Cambia el dia y el estado sin perder contexto visual.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs font-medium text-zinc-300">
                {turnos.length} visibles
              </span>
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1.5 text-xs font-medium text-[#8cff59]">
                {isToday ? "Vista de hoy" : "Fecha manual"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <DateLink href={buildTurnosHref(shiftDate(fecha, -1), estado, scope)} label="Ayer" />
            <DateLink href={buildTurnosHref(fechaHoy, estado, scope)} label="Hoy" active={isToday} />
            <DateLink href={buildTurnosHref(shiftDate(fecha, 1), estado, scope)} label="Mañana" />
          </div>

          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="eyebrow mb-2 block text-[10px]">Fecha manual</span>
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                className="h-11 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none placeholder-zinc-600 focus:border-[#8cff59]"
              />
            </label>
            <input type="hidden" name="scope" value={scope} />
            <input type="hidden" name="estado" value={estado ?? "todos"} />
            <button
              type="submit"
              className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-sm font-semibold"
            >
              Ir
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusLink href={buildTurnosHref(fecha, undefined, scope)} label="Todos" active={!estado} />
            <StatusLink href={buildTurnosHref(fecha, "pendiente", scope)} label="Pendientes" active={estado === "pendiente"} />
            <StatusLink href={buildTurnosHref(fecha, "confirmado", scope)} label="Confirmados" active={estado === "confirmado"} />
            <StatusLink href={buildTurnosHref(fecha, "completado", scope)} label="Completados" active={estado === "completado"} />
            <StatusLink href={buildTurnosHref(fecha, "cancelado", scope)} label="Cancelados" active={estado === "cancelado"} />
          </div>
        </section>

        <section id="agenda" className="panel-card rounded-[28px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-[10px]">Agenda visual</p>
              <h2 className="font-display text-2xl text-white">Timeline de servicio</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Los pendientes quedan arriba de cada bloque, luego confirmados y los huecos libres para ocupar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LegendChip tone="amber" label="Pendiente" />
              <LegendChip tone="emerald" label="Confirmado" />
              <LegendChip tone="brand" label="Hueco libre" />
            </div>
          </div>

          {pendingMarcianos.length > 0 ? (
            <div className="mt-4 rounded-[22px] border border-fuchsia-400/20 bg-fuchsia-400/8 p-4">
              <p className="eyebrow text-[10px] text-fuchsia-200">Solicitudes Marciano</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingMarcianos.map((turno) => (
                  <span
                    key={turno.id}
                    className="rounded-full border border-fuchsia-300/20 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    {turno.horaInicio} · {turno.clienteNombre} · {turno.barberoNombre}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {timelineSlots.length === 0 ? (
            <div className="mt-5 rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
              No hay turnos ni disponibilidad cargada para este dia.
              <br />
              <Link
                href="/turnos/disponibilidad"
                className="ghost-button mt-3 inline-flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-semibold"
              >
                Configurar disponibilidad
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {timelineSlots.map((slot) => (
                <div key={slot.time} className="grid gap-3 md:grid-cols-[112px_1fr]">
                  <div className="flex items-start md:justify-end">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-right">
                      <p className="text-sm font-semibold text-white">{slot.time}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        {slot.turnos.length > 0 ? "Bloque activo" : "Hueco abierto"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`rounded-[24px] border p-3 sm:p-4 ${
                      slot.turnos.length > 0
                        ? "border-zinc-800 bg-zinc-950"
                        : "border-[#8cff59]/20 bg-[#8cff59]/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="eyebrow text-[10px]">
                        {slot.turnos.length > 0 ? "Turnos programados" : "Hueco disponible"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slot.turnos.length > 0 ? (
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                            {slot.turnos.length} {slot.turnos.length === 1 ? "turno" : "turnos"}
                          </span>
                        ) : null}
                        {slot.freeSlots.length > 0 ? (
                          <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8cff59]">
                            {slot.freeSlots.length} {slot.freeSlots.length === 1 ? "hueco" : "huecos"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {slot.turnos.map((turno) => (
                        <TurnoCard
                          key={turno.id}
                          turno={turno}
                          confirmarAction={confirmarTurnoAction.bind(null, turno.id)}
                          completarAction={completarTurnoAction.bind(null, turno.id)}
                          rechazarAction={rechazarTurnoAction.bind(null, turno.id)}
                          clienteLlegoAction={clienteLlegoAction.bind(null, turno.id)}
                        />
                      ))}
                      {slot.freeSlots.map((freeSlot) => (
                        <QuickTurnoSlotCard
                          key={freeSlot.id}
                          time={freeSlot.horaInicio}
                          barberName={freeSlot.barberoNombre}
                          durationMinutos={freeSlot.duracionMinutos}
                          action={crearTurnoRapidoAction.bind(
                            null,
                            freeSlot.barberoId,
                            freeSlot.fecha,
                            freeSlot.horaInicio,
                            freeSlot.duracionMinutos
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "amber" | "emerald" | "slate" | "brand";
}) {
  const toneClasses = {
    amber: "border-amber-400/20 bg-amber-400/8 text-amber-200",
    emerald: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
    slate: "border-zinc-700 bg-zinc-950/70 text-zinc-200",
    brand: "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]",
  }[tone];

  return (
    <div className={`rounded-[22px] border p-4 ${toneClasses}`}>
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{detail}</p>
    </div>
  );
}

function LegendChip({ label, tone }: { label: string; tone: "amber" | "emerald" | "brand" }) {
  const toneClasses = {
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    brand: "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#8cff59]",
  }[tone];

  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses}`}>{label}</span>
  );
}

function DateLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[40px] items-center rounded-2xl px-3.5 text-sm font-semibold ${
        active
          ? "bg-[#8cff59] text-[#07130a] shadow-[0_10px_30px_rgba(140,255,89,0.18)]"
          : "border border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}

function StatusLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-zinc-100 text-zinc-900"
          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
    >
      {label}
    </Link>
  );
}

function ScopeLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-semibold ${
        active ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {label}
    </Link>
  );
}

function buildTimelineSlots(turnos: TurnoSummary[], freeSlots: TimelineFreeSlot[]): TimelineSlot[] {
  const times = new Set<string>();
  for (const turno of turnos) times.add(turno.horaInicio);
  for (const slot of freeSlots) times.add(slot.horaInicio);

  if (times.size === 0) {
    return [];
  }

  const minuteValues = [...times].map(parseHour);
  const startMinutes = Math.max(8 * 60, Math.min(...minuteValues) - 30);
  const endMinutes = Math.min(21 * 60, Math.max(...minuteValues) + 30);

  return buildSlots(startMinutes, endMinutes)
    .map((time) => ({
      time,
      turnos: sortTurnosForSlot(turnos.filter((turno) => turno.horaInicio === time)),
      freeSlots: freeSlots.filter((slot) => slot.horaInicio === time),
    }))
    .filter((slot) => slot.turnos.length > 0 || slot.freeSlots.length > 0);
}

function sortTurnosForSlot(turnos: TurnoSummary[]) {
  return [...turnos].sort((a, b) => {
    if (a.prioridadAbsoluta !== b.prioridadAbsoluta) {
      return a.prioridadAbsoluta ? -1 : 1;
    }
    if (a.esMarcianoSnapshot !== b.esMarcianoSnapshot) {
      return a.esMarcianoSnapshot ? -1 : 1;
    }
    return a.clienteNombre.localeCompare(b.clienteNombre, "es");
  });
}

function buildSlots(startMinutes: number, endMinutes: number) {
  const start = Math.floor(startMinutes / 30) * 30;
  const end = Math.ceil(endMinutes / 30) * 30;
  const slots: string[] = [];
  for (let minutes = start; minutes <= end; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  }
  return slots;
}

function parseHour(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function shiftDate(fecha: string, days: number) {
  const [year, month, day] = fecha.split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

function buildTurnosHref(fecha: string, estado?: string, scope?: string) {
  const params = new URLSearchParams({ fecha });
  if (estado) params.set("estado", estado);
  if (scope && scope !== "mio") params.set("scope", scope);
  return `/turnos?${params.toString()}`;
}

function formatFechaLarga(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
