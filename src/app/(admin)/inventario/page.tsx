import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productos } from "@/db/schema";
import InventoryQuickAdjust from "@/components/inventario/InventoryQuickAdjust";
import { formatARS } from "@/lib/format";
import { ajustarStockRapido } from "./actions";

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

function getStockStatus(stockActual: number, stockMinimo: number) {
  if (stockActual <= 0) {
    return {
      label: "Sin stock",
      tone: "border-red-500/30 bg-red-500/12 text-red-200",
      helper: "No hay unidades disponibles.",
    };
  }

  if (stockActual <= stockMinimo) {
    return {
      label: "Bajo minimo",
      tone: "border-amber-500/30 bg-amber-500/12 text-amber-200",
      helper: "Conviene reponer pronto.",
    };
  }

  return {
    label: "Saludable",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    helper: "Todavia tiene margen operativo.",
  };
}

function StatCard({
  label,
  value,
  helper,
  tone = "border-zinc-800 bg-zinc-950/70 text-white",
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-[24px] border px-4 py-4 ${tone}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-400">{helper}</p>
    </div>
  );
}

export default async function InventarioPage() {
  const lista = await db
    .select()
    .from(productos)
    .where(eq(productos.activo, true))
    .orderBy(asc(productos.nombre));

  const totalProductos = lista.length;
  const totalUnidades = lista.reduce((sum, producto) => sum + Number(producto.stockActual ?? 0), 0);
  const bajoMinimo = lista.filter(
    (producto) => (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 5)
  ).length;
  const consumiciones = lista.filter((producto) => producto.esConsumicion).length;
  const valorCosto = lista.reduce((sum, producto) => {
    const stockActual = Number(producto.stockActual ?? 0);
    const costoCompra = Number(producto.costoCompra ?? 0);
    return sum + stockActual * costoCompra;
  }, 0);

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.1),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                &larr; Dashboard
              </Link>

              <div className="space-y-3">
                <p className="eyebrow text-[11px] font-semibold">Centro de stock</p>
                <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Inventario
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                  Un tablero para ver stock, detectar reposicion y tocar ajustes sin salir del
                  flujo operativo.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#b9ff96]">
                  {bajoMinimo} en alerta
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {totalProductos} SKUs activos
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {consumiciones} consumiciones
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/inventario/rotacion"
                className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Ver rotacion
              </Link>
              <Link
                href="/inventario/nuevo"
                className="inline-flex min-h-[44px] items-center rounded-full bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] transition hover:bg-[#b6ff84]"
              >
                + Nuevo producto
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Stock total"
              value={totalUnidades}
              helper="Unidades disponibles en productos activos."
            />
            <StatCard
              label="Bajo minimo"
              value={bajoMinimo}
              helper="Productos que conviene reponer primero."
              tone="border-amber-500/20 bg-amber-500/10 text-white"
            />
            <StatCard
              label="Consumiciones"
              value={consumiciones}
              helper="Items marcianos que requieren seguimiento."
            />
            <StatCard
              label="Costo de stock"
              value={formatARS(valorCosto)}
              helper="Valor estimado a costo de compra."
            />
          </div>

        </section>

        {lista.length === 0 ? (
          <div className="mt-5 rounded-[28px] border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">Todavia no hay productos cargados.</p>
            <Link
              href="/inventario/nuevo"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#8cff59] px-5 text-sm font-semibold text-[#07130a] transition hover:bg-[#b6ff84]"
            >
              Agregar el primero
            </Link>
          </div>
        ) : (
          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            {lista.map((p) => {
              const stockActual = Number(p.stockActual ?? 0);
              const stockMinimo = Number(p.stockMinimo ?? 5);
              const stockBajo = stockActual <= stockMinimo;
              const stockStatus = getStockStatus(stockActual, stockMinimo);
              const precioVenta = Number(p.precioVenta ?? 0);
              const costoCompra = Number(p.costoCompra ?? 0);
              const margenUnitario =
                p.precioVenta !== null && p.costoCompra !== null ? precioVenta - costoCompra : null;
              const valorCostoProducto = stockActual * costoCompra;

              return (
                <div
                  key={p.id}
                  className={[
                    "group relative overflow-hidden rounded-[28px] border p-5 transition",
                    stockBajo
                      ? "border-amber-500/25 bg-zinc-900 shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_18px_40px_rgba(0,0,0,0.25)]"
                      : "border-zinc-800 bg-zinc-900 hover:-translate-y-0.5 hover:border-zinc-700",
                  ].join(" ")}
                >
                  <Link
                    href={`/inventario/${p.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={`Ver detalle de ${p.nombre}`}
                  />

                  <div className="relative z-10 flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-2xl" aria-hidden="true">
                            {getProductoEmoji(p.nombre)}
                          </span>
                          <span className="truncate text-lg font-semibold text-white">
                            {p.nombre}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stockStatus.tone}`}
                          >
                            {stockStatus.label}
                          </span>
                          {p.esConsumicion ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                              Consumicion
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <Link
                        href={`/inventario/${p.id}/editar`}
                        className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                      >
                        Editar
                      </Link>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Stock</p>
                        <p className="mt-2 text-2xl font-bold text-white">{stockActual}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Min sugerido {stockMinimo} | {stockStatus.helper}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Precios</p>
                        <p className="mt-2 text-sm font-medium text-zinc-200">
                          Venta {p.precioVenta ? formatARS(p.precioVenta) : "Sin precio"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Costo {p.costoCompra ? formatARS(p.costoCompra) : "Sin costo"} | Margen{" "}
                          {margenUnitario !== null ? formatARS(margenUnitario) : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Card tactil
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          Tocala para entrar al detalle. Los botones de abajo hacen el ajuste rapido
                          sin salir de la tarjeta.
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Valor a costo del stock: {formatARS(valorCostoProducto)}
                        </p>
                      </div>

                      <Link
                        href={`/inventario/${p.id}/editar`}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                      >
                        Editar ficha
                      </Link>
                    </div>

                    <InventoryQuickAdjust
                      stock={stockActual}
                      stockMinimo={stockMinimo}
                      decrementAction={ajustarStockRapido.bind(null, p.id, -1)}
                      incrementAction={ajustarStockRapido.bind(null, p.id, 1)}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
