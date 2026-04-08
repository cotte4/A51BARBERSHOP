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
  const actorBarbero = actor.barberoId
    ? barberos.find((barbero) => barbero.id === actor.barberoId)
    : null;
  const showScopeToggle = actor.isAdmin && actor.barberoId;
  const priorityCount = turnos.filter(
    (turno) => turno.estado === "pendiente" && turno.prioridadAbsoluta
  ).length;
  const canManageAvailability = actor.isAdmin || !!actor.barberoId;

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
    <main className="app-shell min-h-screen">
      <TurnosSpotifyBridge />

      <section className="mx-4 mt-4 rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.12),_transparent_30%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.32)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Agenda viva
            </p>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {scope === "equipo" ? "Turnos del equipo" : `Turnos de ${actorBarbero?.nombre ?? "hoy"}`}
            </h1>
            <p className="max-w-2xl text-sm text-zinc-400">
              Lee pendientes, huecos libres y prioridades sin salir del flujo operativo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {pendientes} pendientes
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {confirmados} confirmados
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
              {slotsLibres.length} libres
            </span>
          </div>
        </div>
      </section>

      <div className="sticky top-3 z-20 mx-4 mt-4 rounded-[28px] border border-zinc-800/70 bg-zinc-950/95 px-4 pb-3 pt-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <Link href="/hoy" className="text-xs font-semibold text-zinc-500 hover:text-zinc-300">
            &larr; Hoy
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href={buildTurnosHref(shiftDate(fecha, -1), estado, scope)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            >
              &lsaquo;
            </Link>
            <span className="min-w-[152px] text-center text-sm font-semibold text-white">
              {isToday ? "Hoy | " : ""}
              {formatFechaCorta(fecha)}
            </span>
            <Link
              href={buildTurnosHref(shiftDate(fecha, 1), estado, scope)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            >
              &rsaquo;
            </Link>
          </div>

          {canManageAvailability ? (
            <Link
              href="/turnos/disponibilidad"
              className="rounded-xl border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1.5 text-xs font-semibold text-[#8cff59]"
            >
              Disponibilidad
            </Link>
          ) : (
            <span className="h-8 w-8" aria-hidden="true" />
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {pendientes > 0 ? (
              <Link
                href={buildTurnosHref(fecha, estado === "pendiente" ? undefined : "pendiente", scope)}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  estado === "pendiente"
                    ? "bg-amber-400/20 text-amber-100"
                    : "bg-amber-400/10 text-amber-300"
                }`}
              >
                {pendientes} pend.{priorityCount > 0 ? ` (${priorityCount}!)` : ""}
              </Link>
            ) : null}
            {confirmados > 0 ? (
              <Link
                href={buildTurnosHref(fecha, estado === "confirmado" ? undefined : "confirmado", scope)}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  estado === "confirmado"
                    ? "bg-emerald-400/20 text-emerald-100"
                    : "bg-emerald-400/10 text-emerald-300"
                }`}
              >
                {confirmados} conf.
              </Link>
            ) : null}
            {completados > 0 ? (
              <span className="rounded-full bg-zinc-800/70 px-2.5 py-1 font-medium text-zinc-400">
                {completados} ok
              </span>
            ) : null}
            {slotsLibres.length > 0 ? (
              <span className="rounded-full bg-[#8cff59]/8 px-2.5 py-1 font-medium text-[#8cff59]/60">
                {slotsLibres.length} libres
              </span>
            ) : null}
            {turnos.length === 0 && slotsLibres.length === 0 ? (
              <span className="text-zinc-600">Sin datos</span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <StatusLink href={buildTurnosHref(fecha, undefined, scope)} label="Todos" active={!estado} />
            <StatusLink href={buildTurnosHref(fecha, "pendiente", scope)} label="Pend." active={estado === "pendiente"} />
            <StatusLink href={buildTurnosHref(fecha, "confirmado", scope)} label="Conf." active={estado === "confirmado"} />
            <StatusLink href={buildTurnosHref(fecha, "completado", scope)} label="Comp." active={estado === "completado"} />
            <StatusLink href={buildTurnosHref(fecha, "cancelado", scope)} label="Canc." active={estado === "cancelado"} />
          </div>
        </div>

        {showScopeToggle ? (
          <div className="mt-2 flex gap-1">
            <ScopeLink
              href={buildTurnosHref(fecha, estado, "mio")}
              label={actorBarbero?.nombre ?? "Mis turnos"}
              active={scope === "mio"}
            />
            <ScopeLink
              href={buildTurnosHref(fecha, estado, "equipo")}
              label="Equipo"
              active={scope === "equipo"}
            />
          </div>
        ) : null}
      </div>

      {pendingMarcianos.length > 0 ? (
        <div className="mx-4 mt-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/8 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-xs font-semibold text-fuchsia-200">
              {pendingMarcianos.length} Marciano{pendingMarcianos.length !== 1 ? "s" : ""} pendiente{pendingMarcianos.length !== 1 ? "s" : ""}
            </p>
            {pendingMarcianos.map((t) => (
              <span key={t.id} className="rounded-full bg-fuchsia-400/10 px-2.5 py-1 text-[11px] text-fuchsia-200">
                {t.horaInicio} | {t.clienteNombre}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {timelineSlots.length === 0 ? (
        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
          <p className="text-sm text-zinc-500">Sin turnos ni disponibilidad para este dia.</p>
          <Link
            href="/turnos/disponibilidad"
            className="ghost-button mt-3 inline-flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-semibold"
          >
            Configurar disponibilidad
          </Link>
        </div>
      ) : (
        <div id="agenda" className="mt-3 px-3 pb-4">
          <div className="space-y-1">
            {timelineSlots.map((slot) => (
              <div key={slot.time} className="flex gap-2">
                <div className="w-12 shrink-0 pt-3 text-right font-mono text-[11px] text-zinc-500">
                  {slot.time}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {slot.turnos.map((turno) => (
                    <TurnoCard
                      key={turno.id}
                      turno={turno}
                      compact
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
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function StatusLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
        active ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
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
      className={`inline-flex min-h-[32px] items-center rounded-full px-3 text-xs font-semibold transition ${
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

function formatFechaCorta(fecha: string) {
  const parsed = new Date(`${fecha}T12:00:00Z`);
  return parsed.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
