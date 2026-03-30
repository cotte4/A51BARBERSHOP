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
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <Link href="/dashboard" className="mb-2 block text-sm text-stone-400 hover:text-stone-600">
            ← Dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Operación
              </p>
              <h1 className="mt-2 text-2xl font-bold text-stone-900">Inventario</h1>
              <p className="mt-1 text-sm text-stone-500">
                Ajustes rápidos, alertas visibles y cards listas para tocar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/inventario/rotacion"
                className="inline-flex min-h-[48px] items-center rounded-2xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200"
              >
                Ver rotación →
              </Link>
              <Link
                href="/inventario/nuevo"
                className="inline-flex min-h-[48px] items-center rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              >
                + Nuevo producto
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {lista.length === 0 ? (
          <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-sm">
            <p className="text-stone-500">No hay productos cargados todavía.</p>
            <Link href="/inventario/nuevo" className="mt-4 inline-block text-sm font-medium text-stone-900 underline">
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
                  className={`group relative overflow-hidden rounded-[28px] border bg-white p-5 shadow-sm transition ${
                    stockBajo
                      ? "border-red-200 shadow-[0_0_0_1px_rgba(239,68,68,0.16),0_14px_32px_rgba(239,68,68,0.10)]"
                      : "border-stone-200 hover:-translate-y-0.5 hover:shadow-md"
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
                        <span className="font-semibold text-stone-900">{p.nombre}</span>
                        {stockBajo ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                            Stock bajo
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm text-stone-500">
                        Mínimo sugerido:{" "}
                        <span className="font-medium text-stone-900">{p.stockMinimo ?? 5}</span>
                        {p.precioVenta ? (
                          <span className="ml-3">
                            Venta: <span className="font-medium text-stone-900">{formatARS(p.precioVenta)}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-shrink-0 gap-2">
                      <Link
                        href={`/inventario/${p.id}/editar`}
                        className="inline-flex min-h-[44px] items-center rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="rounded-[22px] bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                        Card táctil
                      </p>
                      <p className="mt-2 text-sm text-stone-600">
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
