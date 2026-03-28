import { db } from "@/db";
import { barberos } from "@/db/schema";
import Link from "next/link";
import { toggleActivoBarbero } from "./actions";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";

function formatPct(val: string | null) {
  if (!val) return "—";
  return `${Number(val).toFixed(0)}%`;
}

function formatARS(val: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function modeloLabel(tipo: string | null) {
  if (tipo === "hibrido") return "Híbrido";
  if (tipo === "variable") return "Variable";
  if (tipo === "fijo") return "Fijo";
  return "—";
}

export default async function BarberosPage() {
  const lista = await db.select().from(barberos).orderBy(barberos.nombre);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Barberos</h2>
        <Link
          href="/configuracion/barberos/nuevo"
          className="min-h-[44px] inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Nuevo
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay barberos cargados todavía.</p>
          <Link
            href="/configuracion/barberos/nuevo"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-xl border p-4 ${
                !b.activo ? "opacity-60 border-gray-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{b.nombre}</span>
                    {!b.activo && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Inactivo
                      </span>
                    )}
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                      {b.rol}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Modelo: {modeloLabel(b.tipoModelo)}</span>
                    <span>Comisión: {formatPct(b.porcentajeComision)}</span>
                    {b.alquilerBancoMensual && (
                      <span>Alquiler banco: {formatARS(b.alquilerBancoMensual)}/mes</span>
                    )}
                    {b.sueldoMinimoGarantizado && (
                      <span>Mínimo: {formatARS(b.sueldoMinimoGarantizado)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/configuracion/barberos/${b.id}/editar`}
                    className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Editar
                  </Link>
                  <ToggleActivoButton
                    id={b.id}
                    activo={b.activo ?? true}
                    toggleAction={toggleActivoBarbero}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
