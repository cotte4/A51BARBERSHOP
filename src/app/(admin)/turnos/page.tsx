import Link from "next/link";
import { redirect } from "next/navigation";
import type { TurnoSummary } from "@/lib/types";
import TurnoCard from "@/components/turnos/TurnoCard";
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
  const pendientes = turnos.filter((t) => t.estado === "pendiente").length;
  const confirmados = turnos.filter((t) => t.estado === "confirmado").length;
  const completados = turnos.filter((t) => t.estado === "completado").length;
  const actorBarbero = actor.barberoId ? barberos.find((b) => b.id === actor.barberoId) : null;
  const title = scope === "equipo" ? "Turnos del equipo" : "Mis turnos";
  const showScopeToggle = actor.isAdmin && actor.barberoId;

  if (!actor.isAdmin && !actor.barberoId) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-base font-semibold text-white">No encontramos tu perfil de barbero.</p>
          <p className="mt-2 text-sm text-zinc-400">
            Vincula tu usuario con un barbero activo para usar la agenda desde este tab.
          </p>
          <Link href="/hoy" className="mt-4 inline-flex rounded-xl bg-[#8cff59] px-4 py-2 text-sm font-semibold text-[#07130a]">
            Volver a hoy
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="overflow-hidden rounded-[30px] bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.12),_transparent_34%)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href="/hoy" className="text-xs font-medium text-zinc-500 hover:text-zinc-300">
                  ← Hoy
                </Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  {formatFechaLarga(fecha)}
                  {isToday ? " · Hoy" : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span className="text-white">{turnos.length} turnos</span>
                  <span>·</span>
                  <span className="text-amber-400">{pendientes} pendientes</span>
                  <span>·</span>
                  <span className="text-emerald-400">{confirmados} confirmados</span>
                  <span>·</span>
                  <span className="text-zinc-400">{completados} completados</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={slotsLibres.length === 0 ? "/turnos/disponibilidad" : "#agenda"}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a]"
                >
                  + Nuevo turno
                </Link>
                {actor.isAdmin ? (
                  <Link
                    href="/turnos/disponibilidad"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                  >
                    Disponibilidad
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {showScopeToggle ? (
          <div className="flex gap-2">
            <ScopeLink
              href={buildTurnosHref(fecha, estado, "mio")}
              label={actorBarbero?.nombre ?? "Mis turnos"}
              active={scope === "mio"}
            />
            <ScopeLink href={buildTurnosHref(fecha, estado, "equipo")} label="Equipo" active={scope === "equipo"} />
          </div>
        ) : null}

        <section className="rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <DateLink href={buildTurnosHref(shiftDate(fecha, -1), estado, scope)} label="← Ayer" />
            <DateLink href={buildTurnosHref(fechaHoy, estado, scope)} label="Hoy" active={isToday} />
            <DateLink href={buildTurnosHref(shiftDate(fecha, 1), estado, scope)} label="Mañana →" />
            <form className="ml-auto flex items-center gap-2">
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                className="h-9 rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-[#8cff59]"
              />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="estado" value={estado ?? "todos"} />
              <button
                type="submit"
                className="h-9 rounded-xl bg-zinc-800 px-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Ir
              </button>
            </form>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusLink href={buildTurnosHref(fecha, undefined, scope)} label="Todos" active={!estado} />
            <StatusLink href={buildTurnosHref(fecha, "pendiente", scope)} label="Pendientes" active={estado === "pendiente"} />
            <StatusLink href={buildTurnosHref(fecha, "confirmado", scope)} label="Confirmados" active={estado === "confirmado"} />
            <StatusLink href={buildTurnosHref(fecha, "completado", scope)} label="Completados" active={estado === "completado"} />
            <StatusLink href={buildTurnosHref(fecha, "cancelado", scope)} label="Cancelados" active={estado === "cancelado"} />
          </div>
        </section>

        <section id="agenda" className="rounded-[24px] border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Agenda visual</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Lo que viene hoy</h2>
            </div>
            {slotsLibres.length > 0 ? (
              <span className="rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-3 py-1 text-xs font-medium text-[#8cff59]">
                {slotsLibres.length} huecos libres
              </span>
            ) : null}
          </div>

          {pendingMarcianos.length > 0 ? (
            <div className="mb-4 rounded-[20px] border border-fuchsia-500/20 bg-fuchsia-500/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
                Solicitudes Marciano
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingMarcianos.map((turno) => (
                  <span
                    key={turno.id}
                    className="rounded-full border border-fuchsia-400/20 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    {turno.horaInicio} · {turno.clienteNombre} · {turno.barberoNombre}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {timelineSlots.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
              No hay turnos ni disponibilidad cargada para este día.
              <br />
              <Link href="/turnos/disponibilidad" className="mt-3 inline-flex rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700">
                Configurar disponibilidad
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {timelineSlots.map((slot) => (
                <div key={slot.time} className="grid gap-2 md:grid-cols-[72px_1fr]">
                  <div className="flex items-start pt-3 md:justify-end">
                    <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-400">
                      {slot.time}
                    </span>
                  </div>
                  <div className="space-y-2">
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
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <SmallStat label="Barberos visibles" value={String(scope === "equipo" ? barberos.length : 1)} />
          <SmallStat label="Huecos libres" value={String(slotsLibres.length)} />
          <SmallStat label="Foco" value={pendientes > 0 ? `${pendientes} pendientes` : "Agenda al día"} />
        </section>
      </div>
    </main>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-zinc-800 bg-zinc-900 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DateLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[36px] items-center rounded-xl px-3 text-sm font-medium ${
        active
          ? "bg-[#8cff59] text-[#07130a]"
          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
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
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
        active
          ? "bg-zinc-100 text-zinc-900"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
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
      className={`inline-flex min-h-[38px] items-center rounded-full px-4 text-sm font-semibold ${
        active ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
      }`}
    >
      {label}
    </Link>
  );
}

function buildTimelineSlots(turnos: TurnoSummary[], freeSlots: TimelineFreeSlot[]) {
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
      turnos: sortTurnosForSlot(turnos.filter((t) => t.horaInicio === time)),
      freeSlots: freeSlots.filter((s) => s.horaInicio === time),
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
