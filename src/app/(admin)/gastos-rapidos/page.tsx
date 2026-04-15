import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import GastoRapidoList from "@/components/gastos-rapidos/GastoRapidoList";
import { auth } from "@/lib/auth";
import {
  GASTO_RAPIDO_CATEGORIAS,
  getCategoriaGastoRapidoByKey,
} from "@/lib/gastos-rapidos";
import { getGastosRapidosDelMes } from "@/lib/mi-resultado-queries";
import { registrarGastoRapidoAction } from "./actions";

type SearchParams = Promise<{ categoria?: string | string[] | undefined }>;

type CategoryMetric = {
  key: string;
  emoji: string;
  label: string;
  total: number;
  count: number;
};

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatMonthLabel() {
  return new Date().toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatCount(count: number) {
  return `${count} movimiento${count === 1 ? "" : "s"}`;
}

function getCategoryTone(index: number) {
  const tones = [
    "border-amber-500/25 bg-amber-500/10 text-amber-200",
    "border-sky-500/25 bg-sky-500/10 text-sky-200",
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    "border-violet-500/25 bg-violet-500/10 text-violet-200",
    "border-rose-500/25 bg-rose-500/10 text-rose-200",
    "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
    "border-zinc-700 bg-zinc-950 text-zinc-200",
  ];

  return tones[index % tones.length];
}

export default async function GastosRapidosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const [{ gastos, total, totalsByCategory }, params] = await Promise.all([
    getGastosRapidosDelMes(),
    searchParams,
  ]);

  const categoriaSeleccionada =
    typeof params.categoria === "string" ? params.categoria : undefined;
  const categoriaActiva = categoriaSeleccionada
    ? getCategoriaGastoRapidoByKey(categoriaSeleccionada)
    : null;
  const gastosFiltrados = categoriaSeleccionada
    ? gastos.filter((gasto) => {
        const categoria = GASTO_RAPIDO_CATEGORIAS.find(
          (item) => item.emoji === gasto.categoriaVisual
        );
        return categoria?.key === categoriaSeleccionada;
      })
    : gastos;

  const totalFiltrado = gastosFiltrados.reduce(
    (acumulado, gasto) => acumulado + Number(gasto.monto ?? 0),
    0
  );
  const totalActivo = categoriaSeleccionada ? totalFiltrado : total;
  const promedioActivo = gastosFiltrados.length > 0 ? totalActivo / gastosFiltrados.length : 0;
  const countsByCategory = gastos.reduce<Record<string, number>>((acumulado, gasto) => {
    const categoria = GASTO_RAPIDO_CATEGORIAS.find(
      (item) => item.emoji === gasto.categoriaVisual
    );
    const key = categoria?.key ?? "otros";
    acumulado[key] = (acumulado[key] ?? 0) + 1;
    return acumulado;
  }, {});
  const categoryMetrics: CategoryMetric[] = GASTO_RAPIDO_CATEGORIAS.map((categoria) => ({
    key: categoria.key,
    emoji: categoria.emoji,
    label: categoria.label,
    total: totalsByCategory[categoria.key] ?? 0,
    count: countsByCategory[categoria.key] ?? 0,
  }));

  const topCategory = [...categoryMetrics].sort((a, b) => b.total - a.total).find((c) => c.total > 0) ?? null;
  const topCategories = [...categoryMetrics]
    .sort((a, b) => b.total - a.total)
    .filter((item) => item.total > 0)
    .slice(0, 3);

  const returnTo = categoriaSeleccionada
    ? `/gastos-rapidos?categoria=${encodeURIComponent(categoriaSeleccionada)}`
    : "/gastos-rapidos";

  const monthLabel = formatMonthLabel();
  const emptyTitle = categoriaSeleccionada
    ? `No hay gastos en ${categoriaActiva?.label ?? "este filtro"}`
    : "Todavia no hay gastos rapidos cargados este mes";
  const emptyDescription = categoriaSeleccionada
    ? "Proba quitar el filtro o agrega un movimiento nuevo desde el boton de arriba."
    : "Cuando cargues el primero, aca vas a ver fecha, categoria, monto y notas de cada movimiento.";

  return (
    <div className="app-shell min-h-screen pb-24">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.08),_transparent_24%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="eyebrow text-xs font-semibold">Control de egresos</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Gastos rapidos
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                  Captura cafe, limpieza, compras chicas y reposiciones sin perder contexto. La
                  lectura queda ordenada por categoria para que sepas rapido donde se fue la caja.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Total del mes" value={formatARS(total)} helper={formatCount(gastos.length)} />
                <StatCard
                  label={categoriaSeleccionada ? "Total filtrado" : "Promedio"}
                  value={formatARS(categoriaSeleccionada ? totalActivo : promedioActivo)}
                  helper={
                    categoriaSeleccionada
                      ? formatCount(gastosFiltrados.length)
                      : "Chequea ticket promedio del mes"
                  }
                />
                <StatCard
                  label="Categoria lider"
                  value={topCategory?.label ?? "Sin datos"}
                  helper={topCategory ? formatARS(topCategory.total) : "Todavia no hay gastos"}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <CategoryChip
                  href="/gastos-rapidos"
                  active={!categoriaSeleccionada}
                  emoji="•"
                  label="Todos"
                  count={gastos.length}
                  total={total}
                />
                {categoryMetrics.map((categoria, index) => (
                  <CategoryChip
                    key={categoria.key}
                    href={`/gastos-rapidos?categoria=${encodeURIComponent(categoria.key)}`}
                    active={categoriaSeleccionada === categoria.key}
                    emoji={categoria.emoji}
                    label={categoria.label}
                    count={categoria.count}
                    total={categoria.total}
                    tone={getCategoryTone(index)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <section className="panel-soft rounded-[28px] p-5">
                <p className="eyebrow text-xs font-semibold">Accion inmediata</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Registrar un gasto</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Captura el movimiento y vuelve enseguida a la lectura mensual.
                </p>
                <div className="mt-4 rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Filtro actual</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {categoriaActiva?.label ?? "Todos los gastos"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {categoriaSeleccionada
                      ? "El alta y los borrados vuelven a este filtro."
                      : "Todo el historial mensual se mantiene visible."}
                  </p>
                </div>
              </section>

              <GastoRapidoFAB
                action={registrarGastoRapidoAction}
                returnTo={returnTo}
                historyHref="/gastos-rapidos"
                fixed={false}
                showHistoryLink={false}
                buttonLabel="Registrar gasto rapido"
                buttonClassName="neon-button inline-flex min-h-[54px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold sm:w-auto"
              />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">Historial del mes</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {categoriaSeleccionada ? categoriaActiva?.label ?? "Filtro activo" : "Todos los movimientos"}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {categoriaSeleccionada
                    ? `Mostrando ${gastosFiltrados.length} movimiento(s) de ${categoriaActiva?.label ?? "esta categoria"}.`
                    : `${gastosFiltrados.length} movimiento(s) registrados en ${monthLabel}.`}
                </p>
              </div>

              {categoriaSeleccionada ? (
                <Link
                  href="/gastos-rapidos"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                >
                  Limpiar filtro
                </Link>
              ) : null}
            </div>

            <GastoRapidoList
              gastos={gastosFiltrados}
              returnTo={returnTo}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>

          <aside className="space-y-4">
            <section className="panel-card rounded-[28px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Lectura rapida</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Categorias con mas peso</h3>
                </div>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
                  Top 3
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {topCategories.length === 0 ? (
                  <p className="text-sm text-zinc-500">Todavia no hay gasto rapido para comparar.</p>
                ) : (
                  topCategories.map((categoria, index) => {
                    const maxTotal = topCategories[0]?.total ?? 1;
                    const width = maxTotal > 0 ? Math.max(10, (categoria.total / maxTotal) * 100) : 10;

                    return (
                      <div key={categoria.key} className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold ${getCategoryTone(index)}`}
                            >
                              {categoria.emoji}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-white">{categoria.label}</p>
                              <p className="text-xs text-zinc-500">{formatCount(categoria.count)}</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-white">{formatARS(categoria.total)}</p>
                        </div>

                        <div className="mt-3 h-2 rounded-full bg-zinc-800">
                          <div
                            className="h-2 rounded-full bg-[#8cff59]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="panel-card rounded-[28px] p-5">
              <p className="eyebrow text-xs font-semibold">Reglas rapidas</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                <li>Usa la categoria correcta para que el mes cierre limpio.</li>
                <li>Deja nota cuando el gasto no sea obvio o cambie una rutina.</li>
                <li>Si algo queda en Otros, revisalo al final de la semana.</li>
              </ul>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function CategoryChip({
  href,
  active,
  emoji,
  label,
  count,
  total,
  tone,
}: {
  href: string;
  active: boolean;
  emoji: string;
  label: string;
  count: number;
  total: number;
  tone?: string;
}) {
  const tooltipText = count > 0
    ? `${formatCount(count)} · ${formatARS(total)}`
    : label;

  return (
    <Link
      href={href}
      title={tooltipText}
      className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-[#8cff59]/30 bg-[#8cff59]/10 text-white"
          : tone ?? "border-zinc-800 bg-zinc-900 text-white hover:border-zinc-700 hover:bg-zinc-800"
      }`}
    >
      {emoji !== "•" && <span className="text-base leading-none">{emoji}</span>}
      <span>{label}</span>
    </Link>
  );
}
