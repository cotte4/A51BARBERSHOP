"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";
import type { DisponibilidadSlot } from "@/lib/types";

type BlockedSlot = {
  fecha: string;
  horaInicio: string;
  estado: string;
};

type DisponibilidadGridProps = {
  barberoId: string;
  services: Array<{
    id: string;
    nombre: string;
    duracionMinutos: number;
  }>;
  slots: DisponibilidadSlot[];
  blockedSlots: BlockedSlot[];
  createAction: (barberoId: string, prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
  deleteAction: (slotId: string) => Promise<void>;
  minDate: string;
};

type ShiftPreset = {
  label: string;
  start: string;
  end: string;
};

const initialState: TurnoActionState = {};

const SHIFT_PRESETS: ShiftPreset[] = [
  { label: "Manana", start: "09:00", end: "13:00" },
  { label: "Corrido", start: "09:00", end: "18:00" },
  { label: "Tarde", start: "14:00", end: "20:00" },
];

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getGeneratedTimes(start: string, end: string, duration: number) {
  if (!start || !end || !duration) {
    return [];
  }

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
    return [];
  }

  const times: string[] = [];
  for (let cursor = startMinutes; cursor + duration <= endMinutes; cursor += duration) {
    const hours = Math.floor(cursor / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (cursor % 60).toString().padStart(2, "0");
    times.push(`${hours}:${minutes}`);
  }

  return times;
}

function formatDate(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function DisponibilidadGrid({
  barberoId,
  services,
  slots,
  blockedSlots,
  createAction,
  deleteAction,
  minDate,
}: DisponibilidadGridProps) {
  const router = useRouter();
  const recommendedDuracionMinutos = useMemo<"45" | "60">(() => {
    const maxServiceDuration = services.reduce(
      (currentMax, service) => Math.max(currentMax, service.duracionMinutos),
      30
    );
    return maxServiceDuration > 45 ? "60" : "45";
  }, [services]);
  const [fecha, setFecha] = useState(minDate);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("18:00");
  const [duracionMinutos, setDuracionMinutos] = useState<"45" | "60">(recommendedDuracionMinutos);
  const [state, formAction, isPending] = useActionState(createAction.bind(null, barberoId), initialState);
  const [isDeleting, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const blockedKeys = useMemo(
    () => new Set(blockedSlots.map((slot) => `${slot.fecha}-${slot.horaInicio.slice(0, 5)}`)),
    [blockedSlots]
  );

  const previewTimes = useMemo(
    () => getGeneratedTimes(horaInicio, horaFin, Number(duracionMinutos)),
    [duracionMinutos, horaFin, horaInicio]
  );
  const incompatibleServices = useMemo(
    () => services.filter((service) => service.duracionMinutos > Number(duracionMinutos)),
    [duracionMinutos, services]
  );
  const compatibleServices = useMemo(
    () => services.filter((service) => service.duracionMinutos <= Number(duracionMinutos)),
    [duracionMinutos, services]
  );

  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, DisponibilidadSlot[]>();

    for (const slot of slots) {
      const current = grouped.get(slot.fecha) ?? [];
      current.push(slot);
      grouped.set(slot.fecha, current);
    }

    return Array.from(grouped.entries())
      .map(([date, dateSlots]) => ({
        date,
        slots: dateSlots.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [slots]);

  return (
    <div className="space-y-5">
      <form action={formAction} className="panel-card rounded-[28px] p-5 shadow-[0_22px_50px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow text-xs font-semibold">Jornada base</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Abrir bloques de trabajo</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Marca el dia, el tramo y el ritmo. La grilla se arma sola.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#8cff59]/20 bg-[#8cff59]/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8cff59]">Vista previa</p>
            <p className="mt-1 text-2xl font-semibold text-white">{previewTimes.length}</p>
            <p className="text-xs text-zinc-400">bloques listos</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {SHIFT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setHoraInicio(preset.start);
                setHoraFin(preset.end);
                setDuracionMinutos(recommendedDuracionMinutos);
              }}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-[#8cff59]/40 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Dia</span>
            <input
              type="date"
              name="fecha"
              min={minDate}
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              className="h-12 w-full rounded-2xl border border-zinc-700 bg-[#27272a] px-4 text-sm text-white outline-none focus:border-[#8cff59]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Desde</span>
            <input
              type="time"
              name="horaInicio"
              value={horaInicio}
              onChange={(event) => setHoraInicio(event.target.value)}
              className="h-12 w-full rounded-2xl border border-zinc-700 bg-[#27272a] px-4 text-sm text-white outline-none focus:border-[#8cff59]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Hasta</span>
            <input
              type="time"
              name="horaFin"
              value={horaFin}
              onChange={(event) => setHoraFin(event.target.value)}
              className="h-12 w-full rounded-2xl border border-zinc-700 bg-[#27272a] px-4 text-sm text-white outline-none focus:border-[#8cff59]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Paso</span>
            <select
              name="duracionMinutos"
              value={duracionMinutos}
              onChange={(event) => setDuracionMinutos(event.target.value as "45" | "60")}
              className="h-12 w-full rounded-2xl border border-zinc-700 bg-[#27272a] px-4 text-sm text-white outline-none focus:border-[#8cff59]"
            >
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">Asi queda el dia</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ajusta horario o preset hasta que el ritmo cierre.
                </p>
              </div>
              <span className="text-xs text-zinc-500">
                {horaInicio} a {horaFin}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {previewTimes.length === 0 ? (
                <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  El rango tiene que ser mas grande que el intervalo para generar bloques.
                </p>
              ) : (
                previewTimes.map((time) => (
                  <span
                    key={time}
                    className="rounded-xl border border-zinc-700 bg-[#27272a] px-3 py-2 text-sm font-medium text-white"
                  >
                    {time}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Servicios que entran</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Solo aparecen online los servicios que caben en el bloque.
                </p>
              </div>
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                Recomendado: {recommendedDuracionMinutos} min
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {compatibleServices.length === 0 ? (
                <span className="rounded-xl border border-zinc-700 bg-[#27272a] px-3 py-2 text-sm text-zinc-400">
                  No hay servicios activos.
                </span>
              ) : (
                compatibleServices.map((service) => (
                  <span
                    key={service.id}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                  >
                    {service.nombre} | {service.duracionMinutos} min
                  </span>
                ))
              )}
            </div>

            {incompatibleServices.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Con {duracionMinutos} min no van a figurar estos servicios:{" "}
                {incompatibleServices
                  .map((service) => `${service.nombre} (${service.duracionMinutos} min)`)
                  .join(", ")}
                . Si queres que aparezcan, abre la jornada con {recommendedDuracionMinutos} min.
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Con esta configuracion todos los servicios activos quedan visibles para reservar.
              </div>
            )}
          </div>
        </div>

        {state.error ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="mt-4 rounded-2xl border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 py-3 text-sm text-[#cfffaf]">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || previewTimes.length === 0}
          className="neon-button mt-5 inline-flex min-h-[48px] items-center justify-center rounded-2xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Generando..." : "Generar jornada"}
        </button>
      </form>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">Agenda publicada</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Bloques activos</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
              {slots.length} bloques
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
              {blockedSlots.length} tomados
            </span>
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="panel-card rounded-[24px] p-8 text-center text-sm text-zinc-400">
            Todavia no hay disponibilidad cargada.
          </div>
        ) : (
          slotsByDate.map((group) => {
            const blockedCountForGroup = group.slots.filter((slot) =>
              blockedKeys.has(`${slot.fecha}-${slot.horaInicio.slice(0, 5)}`)
            ).length;
            const freeCountForGroup = group.slots.length - blockedCountForGroup;

            return (
              <div key={group.date} className="panel-card rounded-[24px] p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{formatDate(group.date)}</p>
                    <p className="text-xs text-zinc-500">{group.date}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                      {group.slots.length} bloques
                    </span>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                      {freeCountForGroup} libres
                    </span>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                      {blockedCountForGroup} tomados
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.slots.map((slot) => {
                    const blocked = blockedKeys.has(`${slot.fecha}-${slot.horaInicio.slice(0, 5)}`);

                    return (
                      <div
                        key={slot.id}
                        className="rounded-[22px] border border-zinc-700 bg-[#27272a] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-white">{slot.horaInicio.slice(0, 5)}</p>
                            <p className="mt-1 text-sm text-zinc-400">{slot.duracionMinutos} min</p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              blocked
                                ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            }`}
                          >
                            {blocked ? "Tomado" : "Libre"}
                          </span>
                        </div>

                        <p className="mt-3 min-h-10 text-xs text-zinc-500">
                          {blocked
                            ? "Lo ocupa un turno confirmado o completado."
                            : "Disponible para reservas online."}
                        </p>

                        <button
                          type="button"
                          disabled={blocked || isDeleting}
                          onClick={() => startTransition(() => deleteAction(slot.id))}
                          className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-zinc-600 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {blocked ? "Bloque tomado" : "Quitar bloque"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
