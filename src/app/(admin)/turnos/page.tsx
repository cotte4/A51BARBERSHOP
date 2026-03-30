import Link from "next/link";
import type { TurnoSummary } from "@/lib/types";
import TurnoCard from "@/components/turnos/TurnoCard";
import {
  completarTurnoAction,
  confirmarTurnoAction,
  rechazarTurnoAction,
} from "./actions";
import { getBarberosActivosTurnos, getFechaHoyArgentina, getTurnosAdminList } from "@/lib/turnos";

type TurnosPageProps = {
  searchParams: Promise<{ fecha?: string; estado?: string }>;
};

export default async function TurnosPage({ searchParams }: TurnosPageProps) {
  const params = await searchParams;
  const fecha = params.fecha ?? getFechaHoyArgentina();
  const estado = params.estado && params.estado !== "todos" ? params.estado : undefined;

  const [turnos, barberos] = await Promise.all([
    getTurnosAdminList(fecha, estado),
    getBarberosActivosTurnos(),
  ]);

  const fechaHoy = getFechaHoyArgentina();
  const isToday = fecha === fechaHoy;
  const timelineSlots = buildTimelineSlots(turnos);
  const pendientes = turnos.filter((turno) => turno.estado === "pendiente").length;
  const confirmados = turnos.filter((turno) => turno.estado === "confirmado").length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">Turnos</h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatFechaLarga(fecha)}
              {isToday ? " · Hoy" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reservar/pinky"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              + Nuevo turno
            </Link>
            <Link
              href="/turnos/disponibilidad"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Disponibilidad
            </Link>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Turnos del dia" value={String(turnos.length)} />
          <SummaryCard label="Pendientes" value={String(pendientes)} />
          <SummaryCard
            label="Confirmados"
            value={String(confirmados)}
            detail={`${barberos.length} barbero${barberos.length === 1 ? "" : "s"} activos`}
          />
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <DateLink href={buildEstadoHref(shiftDate(fecha, -1), estado)} label="Ayer" />
            <DateLink href={buildEstadoHref(fechaHoy, estado)} label="Hoy" active={isToday} />
            <DateLink href={buildEstadoHref(shiftDate(fecha, 1), estado)} label="Manana" />

            <form className="ml-auto flex flex-wrap gap-3">
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                className="h-11 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
              <select
                name="estado"
                defaultValue={estado ?? "todos"}
                className="h-11 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="confirmado">Confirmados</option>
                <option value="completado">Completados</option>
                <option value="cancelado">Cancelados</option>
              </select>
              <button
                type="submit"
                className="h-11 rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Ver dia
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

        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Agenda visual</h2>
            <p className="text-sm text-gray-500">
              Entras y ves el dia de una: ocupados, huecos libres y el siguiente turno.
            </p>
          </div>

          {timelineSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No hay turnos para este dia. Todavia hay espacio para walk-ins o para cargar una reserva nueva.
            </div>
          ) : (
            <div className="space-y-4">
              {timelineSlots.map((slot) => (
                <div key={slot.time} className="grid gap-3 md:grid-cols-[88px_1fr]">
                  <div className="pt-3 text-sm font-semibold text-gray-500">{slot.time}</div>
                  {slot.turnos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-400">
                      Hueco libre
                    </div>
                  ) : (
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {detail ? <p className="mt-1 text-sm text-gray-500">{detail}</p> : null}
    </div>
  );
}

function DateLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium ${
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </Link>
  );
}

function buildTimelineSlots(turnos: TurnoSummary[]) {
  if (turnos.length === 0) {
    return buildSlots(9 * 60, 19 * 60).map((time) => ({ time, turnos: [] as TurnoSummary[] }));
  }

  const startMinutes = Math.max(
    8 * 60,
    Math.min(...turnos.map((turno) => parseHour(turno.horaInicio))) - 30
  );
  const endMinutes = Math.min(
    21 * 60,
    Math.max(...turnos.map((turno) => parseHour(turno.horaInicio) + turno.duracionMinutos)) + 30
  );

  return buildSlots(startMinutes, endMinutes).map((time) => ({
    time,
    turnos: turnos.filter((turno) => turno.horaInicio === time),
  }));
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
