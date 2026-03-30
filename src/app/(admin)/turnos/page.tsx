import Link from "next/link";
import TurnoCard from "@/components/turnos/TurnoCard";
import {
  completarTurnoAction,
  confirmarTurnoAction,
  rechazarTurnoAction,
} from "./actions";
import { getFechaHoyArgentina, getTurnosAdminList } from "@/lib/turnos";

type TurnosPageProps = {
  searchParams: Promise<{ fecha?: string; estado?: string }>;
};

export default async function TurnosPage({ searchParams }: TurnosPageProps) {
  const params = await searchParams;
  const fecha = params.fecha ?? getFechaHoyArgentina();
  const estado = params.estado && params.estado !== "todos" ? params.estado : undefined;
  const turnos = await getTurnosAdminList(fecha, estado);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">Turnos</h1>
          </div>
          <Link
            href="/turnos/disponibilidad"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Disponibilidad
          </Link>
        </div>

        <form className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,1fr,auto]">
          <input
            type="date"
            name="fecha"
            defaultValue={fecha}
            className="h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
          <select
            name="estado"
            defaultValue={estado ?? "todos"}
            className="h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmado">Confirmados</option>
            <option value="completado">Completados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <button
            type="submit"
            className="h-12 rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Filtrar
          </button>
        </form>

        <section className="space-y-3">
          {turnos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              No hay turnos para ese filtro.
            </div>
          ) : (
            turnos.map((turno) => (
              <TurnoCard
                key={turno.id}
                turno={turno}
                confirmarAction={confirmarTurnoAction.bind(null, turno.id)}
                completarAction={completarTurnoAction.bind(null, turno.id)}
                rechazarAction={rechazarTurnoAction.bind(null, turno.id)}
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}
