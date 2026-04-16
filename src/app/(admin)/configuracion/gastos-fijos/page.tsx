import { db } from "@/db";
import { gastos, categoriasGasto } from "@/db/schema";
import { hasGastosRapidosSchema } from "@/lib/gastos-rapidos-server";
import { desc, eq, isNull, or } from "drizzle-orm";
import Link from "next/link";
import { formatARS } from "@/lib/format";
import { formatFecha } from "@/lib/fecha";
import GastoDeleteButton from "./_GastoDeleteButton";

function frecuenciaLabel(frecuencia: string | null) {
  if (!frecuencia) return null;
  const map: Record<string, string> = {
    mensual: "Mensual",
    trimestral: "Trimestral",
    anual: "Anual",
    unica: "Unica vez",
  };
  return map[frecuencia] ?? frecuencia;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] bg-white/6 px-4 py-4 ring-1 ring-white/8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-zinc-400">{hint}</p>
    </div>
  );
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

  const categoriasMap = new Map(listaCategorias.map((c) => [c.id, c]));
  const recurrentes = listaGastos.filter((gasto) => gasto.esRecurrente).length;
  const montoTotal = listaGastos.reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0);

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.12),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.04),_transparent_30%)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Configuracion financiera
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Gastos fijos
              </h1>
              <p className="mt-3 max-w-xl text-sm text-zinc-400">
                Ordena salidas recurrentes y puntuales para que el impacto mensual quede visible
                sin tener que abrir cada item.
              </p>
            </div>

            <Link
              href="/configuracion/gastos-fijos/nuevo"
              className="neon-button inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-semibold transition-colors"
            >
              + Nuevo gasto
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Totales" value={`${listaGastos.length}`} hint="Gastos cargados" />
            <MetricCard label="Recurrentes" value={`${recurrentes}`} hint="Se repiten en el tiempo" />
            <MetricCard
              label="Monto listado"
              value={formatARS(String(montoTotal))}
              hint="Suma de todos los gastos visibles"
            />
            <MetricCard
              label="Categorias"
              value={`${listaCategorias.length}`}
              hint="Contexto para ordenar egresos"
            />
          </div>
        </div>
      </section>

      {listaGastos.length === 0 ? (
        <div className="panel-card rounded-[28px] p-8 text-center">
          <p className="text-zinc-400">No hay gastos cargados todavia.</p>
          <Link
            href="/configuracion/gastos-fijos/nuevo"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-zinc-800 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Cargar el primero
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {listaGastos.map((gasto) => {
            const categoria = gasto.categoriaId ? categoriasMap.get(gasto.categoriaId) : null;
            const frecLabel = gasto.esRecurrente ? frecuenciaLabel(gasto.frecuencia) : null;
            const recurrente = Boolean(gasto.esRecurrente);

            return (
              <article
                key={gasto.id}
                className={`overflow-hidden rounded-[26px] border p-5 transition ${
                  recurrente
                    ? "border-zinc-700 bg-zinc-900/80 hover:-translate-y-0.5 hover:border-zinc-600"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-sm font-semibold text-white">
                      GF
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight text-white">
                          {gasto.descripcion}
                        </h2>
                        {categoria && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {categoria.nombre}
                          </span>
                        )}
                        {recurrente && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Recurrente
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-400">
                        <span className="font-medium text-zinc-200">
                          {formatARS(gasto.monto)}
                        </span>
                        <span>-</span>
                        <span>{formatFecha(gasto.fecha)}</span>
                        {frecLabel ? (
                          <>
                            <span>-</span>
                            <span>{frecLabel}</span>
                          </>
                        ) : null}
                      </div>
                      {gasto.notas ? <p className="mt-3 text-sm text-zinc-500">{gasto.notas}</p> : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:min-w-[180px]">
                    <Link
                      href={`/configuracion/gastos-fijos/${gasto.id}/editar`}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                    >
                      Editar
                    </Link>
                    <GastoDeleteButton id={gasto.id} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
