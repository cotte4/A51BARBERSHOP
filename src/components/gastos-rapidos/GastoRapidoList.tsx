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
    maximumFractionDigits: 0,
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
      <div className="rounded-[20px] border border-dashed border-zinc-700 bg-zinc-950/50 px-6 py-8 text-center">
        <p className="text-sm text-zinc-500">Todavia no hay gastos rapidos cargados este mes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {gastos.map((gasto) => {
        const categoria = getCategoriaGastoRapidoByEmoji(gasto.categoriaVisual ?? "");
        const actionConId = eliminarGastoRapidoAction.bind(null, gasto.id, returnTo);

        return (
          <div
            key={gasto.id}
            className="rounded-[20px] border border-zinc-800 bg-zinc-950 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{categoria?.emoji ?? "💸"}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {categoria?.label ?? gasto.descripcion ?? "Gasto rapido"}
                    </p>
                    <p className="text-xs text-zinc-600">{formatFecha(gasto.fecha)}</p>
                  </div>
                </div>
                {gasto.notas ? (
                  <p className="mt-2 text-xs text-zinc-500">{gasto.notas}</p>
                ) : null}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-base font-bold text-red-400">{formatARS(gasto.monto)}</span>
                <form action={actionConId}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-zinc-600 transition hover:text-red-400"
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
