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
  emptyTitle?: string;
  emptyDescription?: string;
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

function getTone(categoryKey?: string | null) {
  switch (categoryKey) {
    case "cafe":
      return {
        badge: "border-amber-500/25 bg-amber-500/10 text-amber-200",
        amount: "text-amber-100",
      };
    case "bebida":
      return {
        badge: "border-sky-500/25 bg-sky-500/10 text-sky-200",
        amount: "text-sky-100",
      };
    case "comida":
      return {
        badge: "border-rose-500/25 bg-rose-500/10 text-rose-200",
        amount: "text-rose-100",
      };
    case "barber":
      return {
        badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
        amount: "text-emerald-100",
      };
    case "limpieza":
      return {
        badge: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
        amount: "text-cyan-100",
      };
    case "compras":
      return {
        badge: "border-violet-500/25 bg-violet-500/10 text-violet-200",
        amount: "text-violet-100",
      };
    default:
      return {
        badge: "border-zinc-700 bg-zinc-900 text-zinc-200",
        amount: "text-white",
      };
  }
}

export default function GastoRapidoList({
  gastos,
  returnTo = "/gastos-rapidos",
  emptyTitle = "Todavia no hay gastos rapidos cargados este mes",
  emptyDescription = "Cuando cargues el primero, aca vas a ver fecha, categoria, monto y notas de cada movimiento.",
}: GastoRapidoListProps) {
  if (gastos.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/55 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-white">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {gastos.map((gasto) => {
        const categoria = getCategoriaGastoRapidoByEmoji(gasto.categoriaVisual ?? "");
        const actionConId = eliminarGastoRapidoAction.bind(null, gasto.id, returnTo);
        const tone = getTone(categoria?.key);

        return (
          <article
            key={gasto.id}
            className="rounded-[26px] border border-zinc-800 bg-zinc-950/85 p-4 shadow-[0_18px_36px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-semibold ${tone.badge}`}
              >
                {categoria?.emoji ?? "•"}
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {categoria?.label ?? gasto.descripcion ?? "Gasto rapido"}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                    {formatFecha(gasto.fecha)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-start">
                  <div>
                    {gasto.notas ? (
                      <p className="text-sm leading-6 text-zinc-300">{gasto.notas}</p>
                    ) : (
                      <p className="text-sm text-zinc-500">Sin nota agregada.</p>
                    )}
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Categoria
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-200">
                      {categoria?.label ?? "Otros"}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4 text-left sm:text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Monto</p>
                    <p className={`mt-2 text-2xl font-semibold ${tone.amount}`}>
                      {formatARS(gasto.monto)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Se descuenta del mes al guardar.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                  <p className="text-xs text-zinc-500">
                    Dejar notas ayuda a revisar picos de consumo y compras repetidas.
                  </p>
                  <form action={actionConId}>
                    <button
                      type="submit"
                      className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 px-3.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/15 hover:text-red-100"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
