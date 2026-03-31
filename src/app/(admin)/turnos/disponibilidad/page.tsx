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
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
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
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <Link href="/turnos" className="text-sm text-gray-400 hover:text-gray-600">
            {"<- Turnos"}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">Disponibilidad</h1>
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
