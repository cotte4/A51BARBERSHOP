import { db } from "@/db";
import { mediosPago } from "@/db/schema";
import Link from "next/link";
import { toggleActivoMedioPago } from "./actions";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";

function formatComision(val: string | null) {
  if (!val || Number(val) === 0) return null;
  return `${Number(val).toFixed(2).replace(/\.00$/, "")}%`;
}

export default async function MediosDePagoPage() {
  const lista = await db
    .select()
    .from(mediosPago)
    .orderBy(mediosPago.nombre);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Medios de pago</h2>
        <Link
          href="/configuracion/medios-de-pago/nuevo"
          className="min-h-[44px] inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Nuevo
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay medios de pago cargados todavía.</p>
          <Link
            href="/configuracion/medios-de-pago/nuevo"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((mp) => {
            const comision = formatComision(mp.comisionPorcentaje);
            return (
              <div
                key={mp.id}
                className={`bg-white rounded-xl border p-4 ${
                  !mp.activo ? "opacity-60 border-gray-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {mp.nombre}
                      </span>
                      {!mp.activo && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {comision
                        ? `Comisión: ${comision}`
                        : "Sin comisión"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/configuracion/medios-de-pago/${mp.id}/editar`}
                      className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Editar
                    </Link>
                    <ToggleActivoButton
                      id={mp.id}
                      activo={mp.activo ?? true}
                      toggleAction={toggleActivoMedioPago}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
