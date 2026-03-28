import { db } from "@/db";
import { temporadas } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import TemporadaDeleteButton from "./_TemporadaDeleteButton";

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

export default async function TemporadasPage() {
  const lista = await db
    .select()
    .from(temporadas)
    .orderBy(desc(temporadas.fechaInicio));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Temporadas</h2>
        <Link
          href="/configuracion/temporadas/nuevo"
          className="min-h-[44px] inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Nueva
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay temporadas cargadas todavía.</p>
          <Link
            href="/configuracion/temporadas/nuevo"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((t) => {
            const fechaInicioFmt = formatFecha(t.fechaInicio);
            const fechaFinFmt = t.fechaFin ? formatFecha(t.fechaFin) : "en curso";
            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-900">
                      {t.nombre ?? "Sin nombre"}
                    </span>
                    <p className="mt-1 text-sm text-gray-500">
                      {fechaInicioFmt} → {fechaFinFmt}
                    </p>
                    {(t.cortesDiaProyectados !== null || t.precioBaseProyectado !== null) && (
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                        {t.cortesDiaProyectados !== null && (
                          <span>Cortes/día: {t.cortesDiaProyectados}</span>
                        )}
                        {t.precioBaseProyectado !== null && (
                          <span>
                            Precio base: ${Number(t.precioBaseProyectado).toLocaleString("es-AR")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/configuracion/temporadas/${t.id}/editar`}
                      className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Editar
                    </Link>
                    <TemporadaDeleteButton id={t.id} />
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
