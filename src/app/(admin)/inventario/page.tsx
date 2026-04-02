import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import InventoryQuickAdjust from "@/components/inventario/InventoryQuickAdjust";
import { ajustarStockRapido } from "./actions";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
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

export default async function InventarioPage() {
  const lista = await db
    .select()
    .from(productos)
    .where(eq(productos.activo, true))
    .orderBy(asc(productos.nombre));

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <Link href="/dashboard" className="mb-2 block text-sm text-zinc-500 hover:text-zinc-300">
            ← Dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Operación
              </p>
              <h1 className="mt-2 text-2xl font-bold text-white">Inventario</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Ajustes rápidos, alertas visibles y cards listas para tocar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/inventario/rotacion"
                className="inline-flex min-h-[48px] items-center rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Ver rotación →
              </Link>
              <Link
                href="/inventario/nuevo"
                className="inline-flex min-h-[48px] items-center rounded-2xl bg-[#8cff59] px-4 py-2 text-sm font-medium text-[#07130a] hover:bg-[#b6ff84]"
              >
                + Nuevo producto
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {lista.length === 0 ? (
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">No hay productos cargados todavía.</p>
            <Link href="/inventario/nuevo" className="mt-4 inline-block text-sm font-medium text-[#8cff59] underline">
              Agregar el primero
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {lista.map((p) => {
              const stockBajo = (p.stockActual ?? 0) <= (p.stockMinimo ?? 5);
              return (
                <div
                  key={p.id}
                  className={`group relative overflow-hidden rounded-[28px] border p-5 transition ${
                    stockBajo
                      ? "border-red-900/50 bg-zinc-900 shadow-[0_0_0_1px_rgba(239,68,68,0.12),0_14px_32px_rgba(239,68,68,0.08)]"
                      : "border-zinc-800 bg-zinc-900 hover:-translate-y-0.5 hover:border-zinc-700"
                  }`}
                >
                  <Link
                    href={`/inventario/${p.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={`Ver detalle de ${p.nombre}`}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl" aria-hidden="true">
                          {getProductoEmoji(p.nombre)}
                        </span>
                        <span className="font-semibold text-white">{p.nombre}</span>
                        {p.esConsumicion ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                            Consumicion
                          </span>
                        ) : null}
                        {stockBajo ? (
                          <span className="rounded-full bg-red-950/60 px-2 py-0.5 text-xs text-red-400">
                            Stock bajo
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm text-zinc-400">
                        Mínimo sugerido:{" "}
                        <span className="font-medium text-zinc-200">{p.stockMinimo ?? 5}</span>
                        {p.precioVenta ? (
                          <span className="ml-3">
                            Venta: <span className="font-medium text-zinc-200">{formatARS(p.precioVenta)}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-shrink-0 gap-2">
                      <Link
                        href={`/inventario/${p.id}/editar`}
                        className="inline-flex min-h-[44px] items-center rounded-2xl border border-zinc-700 bg-zinc-800/50 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="rounded-[22px] bg-zinc-800/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Card táctil
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Tocá la tarjeta para ver detalle completo. Los botones sirven para sumar o descontar stock desde acá.
                      </p>
                    </div>

                    <InventoryQuickAdjust
                      stock={p.stockActual ?? 0}
                      decrementAction={ajustarStockRapido.bind(null, p.id, -1)}
                      incrementAction={ajustarStockRapido.bind(null, p.id, 1)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
