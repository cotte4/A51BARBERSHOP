import { db } from "@/db";
import { gastos, categoriasGasto } from "@/db/schema";
import { hasGastosRapidosSchema } from "@/lib/gastos-rapidos-server";
import { desc, eq, isNull, or } from "drizzle-orm";
import Link from "next/link";
import GastoDeleteButton from "./_GastoDeleteButton";

function formatARS(val: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function formatFecha(val: string | null) {
  if (!val) return "—";
  const [year, month, day] = val.split("-");
  return `${day}/${month}/${year}`;
}

function frecuenciaLabel(frecuencia: string | null) {
  if (!frecuencia) return null;
  const map: Record<string, string> = {
    mensual: "Mensual",
    trimestral: "Trimestral",
    anual: "Anual",
    unica: "Única vez",
  };
  return map[frecuencia] ?? frecuencia;
}

const gastoLegacySelect = {
  id: gastos.id,
  categoriaId: gastos.categoriaId,
  descripcion: gastos.descripcion,
  monto: gastos.monto,
  fecha: gastos.fecha,
  esRecurrente: gastos.esRecurrente,
  frecuencia: gastos.frecuencia,
  notas: gastos.notas,
};

export default async function GastosFijosPage() {
  const hasQuickExpenseColumns = await hasGastosRapidosSchema();
  const [listaGastos, listaCategorias] = await Promise.all([
    hasQuickExpenseColumns
      ? db
          .select()
          .from(gastos)
          .where(or(eq(gastos.tipo, "fijo"), isNull(gastos.tipo)))
          .orderBy(desc(gastos.fecha))
      : db.select(gastoLegacySelect).from(gastos).orderBy(desc(gastos.fecha)),
    db.select().from(categoriasGasto).orderBy(categoriasGasto.nombre),
  ]);

  const categoriasMap = new Map(
    listaCategorias.map((c) => [c.id, c])
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Gastos fijos</h2>
        <Link
          href="/configuracion/gastos-fijos/nuevo"
          className="min-h-[44px] inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Nuevo
        </Link>
      </div>

      {listaGastos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay gastos cargados todavía.</p>
          <Link
            href="/configuracion/gastos-fijos/nuevo"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Cargar el primero
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listaGastos.map((gasto) => {
            const categoria = gasto.categoriaId
              ? categoriasMap.get(gasto.categoriaId)
              : null;
            const frecLabel = gasto.esRecurrente
              ? frecuenciaLabel(gasto.frecuencia)
              : null;

            return (
              <div
                key={gasto.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {gasto.descripcion}
                      </span>
                      {categoria && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {categoria.nombre}
                        </span>
                      )}
                      {frecLabel && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          Recurrente · {frecLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="font-medium text-gray-700">
                        {formatARS(gasto.monto)}
                      </span>
                      <span>{formatFecha(gasto.fecha)}</span>
                    </div>
                    {gasto.notas && (
                      <p className="mt-1 text-xs text-gray-400 truncate">
                        {gasto.notas}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/configuracion/gastos-fijos/${gasto.id}/editar`}
                      className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Editar
                    </Link>
                    <GastoDeleteButton id={gasto.id} />
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
