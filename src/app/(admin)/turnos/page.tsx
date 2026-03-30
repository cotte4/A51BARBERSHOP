import Link from "next/link";
import type { TurnoSummary } from "@/lib/types";
import TurnoCard from "@/components/turnos/TurnoCard";
import QuickTurnoSlotCard from "@/components/turnos/QuickTurnoSlotCard";
import {
  completarTurnoAction,
  confirmarTurnoAction,
  crearTurnoRapidoAction,
  rechazarTurnoAction,
} from "./actions";
import {
  getBarberosActivosTurnos,
  getDisponibilidadLibrePorFecha,
  getFechaHoyArgentina,
  getTurnosAdminList,
} from "@/lib/turnos";

type TurnosPageProps = {
  searchParams: Promise<{ fecha?: string; estado?: string }>;
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
  const params = await searchParams;
  const fecha = params.fecha ?? getFechaHoyArgentina();
  const estado = params.estado && params.estado !== "todos" ? params.estado : undefined;

  const [turnos, barberos, slotsLibres] = await Promise.all([
    getTurnosAdminList(fecha, estado),
    getBarberosActivosTurnos(),
    getDisponibilidadLibrePorFecha(fecha),
  ]);

  const fechaHoy = getFechaHoyArgentina();
  const isToday = fecha === fechaHoy;
  const timelineSlots = buildTimelineSlots(turnos, slotsLibres);
  const pendientes = turnos.filter((turno) => turno.estado === "pendiente").length;
  const confirmados = turnos.filter((turno) => turno.estado === "confirmado").length;
  const completados = turnos.filter((turno) => turno.estado === "completado").length;

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="overflow-hidden rounded-[30px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.18)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.18),_transparent_30%)] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <Link href="/dashboard" className="text-sm text-stone-300 hover:text-white">
                  ← Dashboard
                </Link>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">Turnos</h1>
                <p className="mt-2 text-sm text-stone-300">
                  {formatFechaLarga(fecha)}
                  {isToday ? " · Hoy" : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-stone-200">
                  <span>{turnos.length} turnos</span>
                  <span>·</span>
                  <span>{pendientes} pendientes</span>
                  <span>·</span>
                  <span>{confirmados} confirmados</span>
                  <span>·</span>
                  <span>{completados} completados</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/reservar/pinky"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                >
                  + Nuevo turno
                </Link>
                <Link
                  href="/turnos/disponibilidad"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-medium text-white hover:bg-white/15"
                >
                  Disponibilidad
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <DateLink href={buildEstadoHref(shiftDate(fecha, -1), estado)} label="Ayer" />
            <DateLink href={buildEstadoHref(fechaHoy, estado)} label="Hoy" active={isToday} />
            <DateLink href={buildEstadoHref(shiftDate(fecha, 1), estado)} label="Mañana" />

            <form className="ml-auto flex flex-wrap gap-3">
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                className="h-11 rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              />
              <select
                name="estado"
                defaultValue={estado ?? "todos"}
                className="h-11 rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="confirmado">Confirmados</option>
                <option value="completado">Completados</option>
                <option value="cancelado">Cancelados</option>
              </select>
              <button
                type="submit"
                className="h-11 rounded-xl bg-stone-100 px-4 text-sm font-medium text-stone-700 hover:bg-stone-200"
              >
                Ver día
              </button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusLink href={buildEstadoHref(fecha)} label="Todos" active={!estado} />
            <StatusLink href={buildEstadoHref(fecha, "pendiente")} label="Pendientes" active={estado === "pendiente"} />
            <StatusLink href={buildEstadoHref(fecha, "confirmado")} label="Confirmados" active={estado === "confirmado"} />
            <StatusLink href={buildEstadoHref(fecha, "completado")} label="Completados" active={estado === "completado"} />
            <StatusLink href={buildEstadoHref(fecha, "cancelado")} label="Cancelados" active={estado === "cancelado"} />
          </div>
        </section>

        <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Agenda visual
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">La agenda manda</h2>
            <p className="text-sm text-stone-500">
              Turnos confirmados bien visibles y huecos libres convertidos en acciones rápidas.
            </p>
          </div>

          {timelineSlots.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
              No hay turnos ni disponibilidad cargada para este día.
            </div>
          ) : (
            <div className="space-y-4">
              {timelineSlots.map((slot) => (
                <div key={slot.time} className="grid gap-3 md:grid-cols-[88px_1fr]">
                  <div className="pt-3 text-sm font-semibold text-stone-500">{slot.time}</div>
                  <div className="space-y-3">
                    {slot.turnos.map((turno) => (
                      <TurnoCard
                        key={turno.id}
                        turno={turno}
                        confirmarAction={confirmarTurnoAction.bind(null, turno.id)}
                        completarAction={completarTurnoAction.bind(null, turno.id)}
                        rechazarAction={rechazarTurnoAction.bind(null, turno.id)}
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

          {slotsLibres.length > 0 ? (
            <p className="mt-4 text-xs text-stone-500">
              {slotsLibres.length} huecos libres listos para cargar caminantes sin salir de la agenda.
            </p>
          ) : null}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <SmallStat label="Barberos activos" value={String(barberos.length)} />
          <SmallStat label="Huecos libres" value={String(slotsLibres.length)} />
          <SmallStat label="Siguiente foco" value={pendientes > 0 ? "Pendientes" : "Agenda al día"} />
        </section>
      </div>
    </main>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function DateLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium ${
        active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
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
      className={`rounded-full px-3 py-2 text-sm ${
        active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
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
    return buildSlots(9 * 60, 19 * 60).map((time) => ({
      time,
      turnos: [] as TurnoSummary[],
      freeSlots: [] as TimelineFreeSlot[],
    }));
  }

  const minuteValues = [...times].map(parseHour);
  const startMinutes = Math.max(8 * 60, Math.min(...minuteValues) - 30);
  const endMinutes = Math.min(21 * 60, Math.max(...minuteValues) + 30);

  return buildSlots(startMinutes, endMinutes).map((time) => ({
    time,
    turnos: turnos.filter((turno) => turno.horaInicio === time),
    freeSlots: freeSlots.filter((slot) => slot.horaInicio === time),
  })).filter((slot) => slot.turnos.length > 0 || slot.freeSlots.length > 0);
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

function buildEstadoHref(fecha: string, estado?: string) {
  const params = new URLSearchParams({ fecha });
  if (estado) {
    params.set("estado", estado);
  }
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
