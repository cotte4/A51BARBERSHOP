import Link from "next/link";
import { redirect } from "next/navigation";
import DisponibilidadGrid from "@/components/turnos/DisponibilidadGrid";
import PlantillaSemanalForm from "@/components/turnos/PlantillaSemanalForm";
import BorrarDiaSemanaForm from "@/components/turnos/BorrarDiaSemanaForm";
import {
  crearDisponibilidadAction,
  crearDisponibilidadLoteAction,
  eliminarDisponibilidadAction,
  eliminarDisponibilidadDiaSemanaAction,
} from "../actions";
import {
  getBarberoAgendaProfile,
  getDisponibilidadAdminList,
  getFechaHoyArgentina,
  getServiciosPublicos,
  getTurnosOcupadosDesde,
} from "@/lib/turnos";
import { getTurnosActorContext } from "@/lib/turnos-access";

export default async function DisponibilidadPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    redirect("/login");
  }

  if (!actor.barberoId) {
    return (
      <main className="app-shell min-h-screen px-4 py-6">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-red-900/40 bg-red-950/30 p-6 text-red-300 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <p className="eyebrow text-xs">Disponibilidad</p>
          <p className="mt-3 text-lg font-semibold text-white">
            No encontramos un perfil de barbero activo vinculado a esta sesion.
          </p>
          <p className="mt-2 text-sm text-red-200/80">
            Vincula tu usuario con un barbero para administrar la agenda desde aca.
          </p>
        </div>
      </main>
    );
  }

  const targetBarbero = await getBarberoAgendaProfile(actor.barberoId);

  if (!targetBarbero) {
    return (
      <main className="app-shell min-h-screen px-4 py-6">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-red-900/40 bg-red-950/30 p-6 text-red-300 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <p className="eyebrow text-xs">Disponibilidad</p>
          <p className="mt-3 text-lg font-semibold text-white">
            No encontramos tu perfil de barbero activo para configurar disponibilidad.
          </p>
        </div>
      </main>
    );
  }

  const minDate = getFechaHoyArgentina();
  const [slots, blockedSlots, services] = await Promise.all([
    getDisponibilidadAdminList(targetBarbero.id, minDate),
    getTurnosOcupadosDesde(targetBarbero.id, minDate),
    getServiciosPublicos(),
  ]);

  const slotDates = new Set(slots.map((slot) => slot.fecha));
  const nextOpenSlot = [...slots].sort((a, b) => {
    const dateCompare = a.fecha.localeCompare(b.fecha);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return a.horaInicio.localeCompare(b.horaInicio);
  })[0];

  return (
    <main className="app-shell min-h-screen px-4 py-4 pb-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.12),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.32)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <Link
                href="/turnos"
                className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                &larr; Volver a turnos
              </Link>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Cabina de disponibilidad
              </p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                Agenda base de {targetBarbero.nombre}
              </h1>
              <p className="text-sm text-zinc-400">
                Define la jornada, revisa que servicios entran y limpia huecos sin perder ritmo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                {slots.length} bloques
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                {slotDates.size} dias activos
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                {services.length} servicios
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  targetBarbero.publicReservaActiva
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                }`}
              >
                {targetBarbero.publicReservaActiva ? "Reserva publica activa" : "Reserva publica pausada"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Proximo bloque</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {nextOpenSlot ? `${nextOpenSlot.fecha} | ${nextOpenSlot.horaInicio.slice(0, 5)}` : "Sin agenda"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Primer horario libre publicado desde hoy.</p>
            </div>

            <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Bloques tomados</p>
              <p className="mt-2 text-lg font-semibold text-white">{blockedSlots.length}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Bloques ocupados por turnos confirmados o completados.
              </p>
            </div>

            <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Modo de trabajo</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {services.some((service) => service.duracionMinutos > 45) ? "Conviene 60 min" : "Conviene 45 min"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Sugerencia rapida segun los servicios activos.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <PlantillaSemanalForm
            action={crearDisponibilidadLoteAction.bind(null, targetBarbero.id)}
          />
          <BorrarDiaSemanaForm
            action={eliminarDisponibilidadDiaSemanaAction.bind(null, targetBarbero.id)}
          />
        </div>

        <DisponibilidadGrid
          barberoId={targetBarbero.id}
          services={services.map((service) => ({
            id: service.id,
            nombre: service.nombre,
            duracionMinutos: service.duracionMinutos,
          }))}
          slots={slots.map((slot) => ({
            ...slot,
            horaInicio: slot.horaInicio.slice(0, 5),
          }))}
          blockedSlots={blockedSlots.map((slot) => ({
            ...slot,
            horaInicio: slot.horaInicio.slice(0, 5),
          }))}
          createAction={crearDisponibilidadAction}
          deleteAction={eliminarDisponibilidadAction}
          minDate={minDate}
        />
      </div>
    </main>
  );
}
