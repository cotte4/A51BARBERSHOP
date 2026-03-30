import { eliminarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";
import { getCategoriaGastoRapidoByEmoji } from "@/lib/gastos-rapidos";

type GastoRapidoListProps = {
  gastos: Array<{
    id: string;
    descripcion: string | null;
    monto: string | null;
    fecha: string | null;
    categoriaVisual: string | null;
    notas: string | null;
  }>;
  returnTo?: string;
};

function formatARS(value: string | null) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default function GastoRapidoList({
  gastos,
  returnTo = "/gastos-rapidos",
}: GastoRapidoListProps) {
  if (gastos.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
        <p className="text-sm text-gray-500">Todavia no hay gastos rapidos cargados este mes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {gastos.map((gasto) => {
        const categoria = getCategoriaGastoRapidoByEmoji(gasto.categoriaVisual ?? "");
        const actionConId = eliminarGastoRapidoAction.bind(null, gasto.id, returnTo);

        return (
          <div
            key={gasto.id}
            className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{categoria?.emoji ?? "💸"}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {categoria?.label ?? gasto.descripcion ?? "Gasto rapido"}
                    </p>
                    <p className="text-xs text-gray-400">{formatFecha(gasto.fecha)}</p>
                  </div>
                </div>
                {gasto.notas ? (
                  <p className="mt-3 text-sm text-gray-600">{gasto.notas}</p>
                ) : null}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-base font-bold text-gray-900">{formatARS(gasto.monto)}</span>
                <form action={actionConId}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-red-600 transition hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
