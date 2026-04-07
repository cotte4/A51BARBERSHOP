import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productos, stockMovimientos } from "@/db/schema";

function formatARS(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function getProductoEmoji(nombre: string) {
  const normalized = nombre.toLowerCase();
  if (normalized.includes("cafe")) return "☕";
  if (normalized.includes("pomada")) return "🧴";
  if (normalized.includes("shampoo")) return "🫧";
  if (normalized.includes("gel")) return "🪮";
  if (normalized.includes("cera")) return "🕯️";
  if (normalized.includes("toalla")) return "🧺";
  if (normalized.includes("agua")) return "💧";
  return "📦";
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-400">{helper}</p>
    </div>
  );
}

export default async function RotacionPage() {
  const movimientosVenta = await db
    .select({
      productoId: stockMovimientos.productoId,
      cantidad: stockMovimientos.cantidad,
      precioUnitario: stockMovimientos.precioUnitario,
    })
    .from(stockMovimientos)
    .where(eq(stockMovimientos.tipo, "venta"));

  const productosList = await db.select().from(productos);
  const productosMap = new Map(productosList.map((p) => [p.id, p]));

  const rotacionMap = new Map<string, { unidades: number; ingresoTotal: number }>();
  for (const m of movimientosVenta) {
    if (!m.productoId) continue;
    const prev = rotacionMap.get(m.productoId) ?? { unidades: 0, ingresoTotal: 0 };
    const cant = Math.abs(Number(m.cantidad ?? 0));
    const ingreso = cant * Number(m.precioUnitario ?? 0);
    rotacionMap.set(m.productoId, {
      unidades: prev.unidades + cant,
      ingresoTotal: prev.ingresoTotal + ingreso,
    });
  }

  const rotacion = Array.from(rotacionMap.entries())
    .map(([productoId, datos]) => ({
      producto: productosMap.get(productoId),
      ...datos,
    }))
    .filter((item) => item.producto)
    .sort((a, b) => b.unidades - a.unidades);

  const totalUnidades = rotacion.reduce((sum, item) => sum + item.unidades, 0);
  const totalIngreso = rotacion.reduce((sum, item) => sum + item.ingresoTotal, 0);
  const totalMargen = rotacion.reduce((sum, item) => {
    const producto = item.producto!;
    if (producto.costoCompra === null || producto.costoCompra === undefined) {
      return sum;
    }

    return (
      sum +
      (Number(producto.precioVenta ?? 0) - Number(producto.costoCompra ?? 0)) * item.unidades
    );
  }, 0);
  const topProducto = rotacion[0];
  const criticos = rotacion.filter((item) => (item.producto?.stockActual ?? 0) <= (item.producto?.stockMinimo ?? 5)).slice(0, 4);

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.15),_transparent_35%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link
                href="/inventario"
                className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                &larr; Inventario
              </Link>

              <div className="space-y-3">
                <p className="eyebrow text-[11px] font-semibold">Rotacion</p>
                <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Productos que mas se mueven
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                  Un ranking historico para ver que vende mas, que deja mejor margen y que conviene
                  reponer primero.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {rotacion.length} productos en rotacion
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {totalUnidades} unidades vendidas
                </span>
                <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#b9ff96]">
                  {formatARS(totalIngreso)} bruto
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
              <StatCard
                label="Top producto"
                value={topProducto?.producto?.nombre ?? "Sin datos"}
                helper={topProducto ? `${topProducto.unidades} unidades vendidas` : "Todavia sin ventas."}
              />
              <StatCard
                label="Margen estimado"
                value={formatARS(totalMargen)}
                helper="Suma historica de margen segun costo de compra."
              />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            {rotacion.length === 0 ? (
              <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-8 text-center">
                <p className="text-zinc-400">Sin ventas registradas todavia.</p>
              </div>
            ) : (
              rotacion.map((item, index) => {
                const p = item.producto!;
                const stockBajo = (p.stockActual ?? 0) <= (p.stockMinimo ?? 5);
                const margen =
                  p.costoCompra !== null && p.costoCompra !== undefined
                    ? (Number(p.precioVenta ?? 0) - Number(p.costoCompra)) * item.unidades
                    : null;
                const maxUnidades = rotacion[0]?.unidades ?? 1;
                const progress = Math.max(12, Math.round((item.unidades / maxUnidades) * 100));

                return (
                  <article
                    key={p.id}
                    className={[
                      "rounded-[28px] border p-5",
                      stockBajo
                        ? "border-amber-500/25 bg-zinc-900"
                        : "border-zinc-800 bg-zinc-900",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-lg">
                            {index + 1}
                          </div>
                          <span className="text-2xl" aria-hidden="true">
                            {getProductoEmoji(p.nombre)}
                          </span>
                          <span className="truncate text-lg font-semibold text-white">
                            {p.nombre}
                          </span>
                          {stockBajo ? (
                            <span className="rounded-full border border-amber-500/25 bg-amber-500/12 px-2.5 py-1 text-xs font-semibold text-amber-200">
                              Stock bajo
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <MiniStat label="Vendidas" value={item.unidades} />
                          <MiniStat label="Ingreso" value={formatARS(item.ingresoTotal)} />
                          <MiniStat
                            label="Margen"
                            value={margen !== null ? formatARS(margen) : "N/A"}
                          />
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-zinc-500">
                            <span>Presencia</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-[#8cff59]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:min-w-[220px]">
                        <InfoPill label="Stock actual" value={String(p.stockActual ?? 0)} />
                        <InfoPill label="Minimo" value={String(p.stockMinimo ?? 5)} />
                        <InfoPill
                          label="Precio venta"
                          value={p.precioVenta ? formatARS(p.precioVenta) : "Sin precio"}
                        />
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <p className="eyebrow text-xs font-semibold">Prioridad</p>
              <h2 className="font-display mt-2 text-xl font-semibold text-white">
                Lo que conviene reponer
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Estas son las referencias con mayor riesgo de quedarse cortas segun su stock actual.
              </p>

              <div className="mt-4 space-y-3">
                {criticos.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/30 p-6 text-center text-sm text-zinc-400">
                    No hay productos en zona critica.
                  </div>
                ) : (
                  criticos.map((item) => {
                    const p = item.producto!;
                    const stockActual = Number(p.stockActual ?? 0);
                    return (
                      <div
                        key={p.id}
                        className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{p.nombre}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Stock {stockActual} | Min {p.stockMinimo ?? 5}
                            </p>
                          </div>
                          <span className="rounded-full border border-amber-500/25 bg-amber-500/12 px-2.5 py-1 text-xs font-semibold text-amber-200">
                            {stockActual <= 0 ? "Sin stock" : "Bajo"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-5">
              <p className="eyebrow text-xs font-semibold text-[#8cff59]">Lectura</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                La rotacion te ayuda a comprar mejor: primero lo que mas sale, despues lo que da
                margen y por ultimo lo que no puede faltar.
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
