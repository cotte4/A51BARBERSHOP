import Link from "next/link";
import { redirect } from "next/navigation";
import DisponibilidadGrid from "@/components/turnos/DisponibilidadGrid";
import {
  crearDisponibilidadAction,
  eliminarDisponibilidadAction,
} from "../actions";
import {
  getDisponibilidadAdminList,
  getFechaHoyArgentina,
  getTurnosOcupadosDesde,
  resolvePublicBarberoBySlug,
} from "@/lib/turnos";
import { requireAdminSession } from "@/lib/admin-action";

export default async function DisponibilidadPage() {
  if (!(await requireAdminSession())) {
    redirect("/turnos");
  }

  const pinky = await resolvePublicBarberoBySlug("pinky");

  if (!pinky) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-900/40 bg-red-950/30 p-6 text-red-400">
          No encontre al barbero admin activo para configurar disponibilidad.
        </div>
      </main>
    );
  }

  const minDate = getFechaHoyArgentina();
  const [slots, blockedSlots] = await Promise.all([
    getDisponibilidadAdminList(pinky.id, minDate),
    getTurnosOcupadosDesde(pinky.id, minDate),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <Link href="/turnos" className="text-sm text-zinc-500 hover:text-zinc-300">
            {"<- Turnos"}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">Disponibilidad</h1>
        </div>

        <DisponibilidadGrid
          barberoId={pinky.id}
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
