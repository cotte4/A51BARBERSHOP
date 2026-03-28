import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(Number(val));
}

export default async function InventarioPage() {
  const lista = await db
    .select()
    .from(productos)
    .where(eq(productos.activo, true))
    .orderBy(asc(productos.nombre));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm mb-2 block">← Dashboard</Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/inventario/rotacion"
                className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Ver rotación →
              </Link>
              <Link
                href="/inventario/nuevo"
                className="min-h-[44px] inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                + Nuevo producto
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {lista.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No hay productos cargados todavía.</p>
            <Link href="/inventario/nuevo" className="mt-4 inline-block text-sm text-gray-900 underline">
              Agregar el primero
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lista.map((p) => {
              const stockBajo = (p.stockActual ?? 0) <= (p.stockMinimo ?? 5);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{p.nombre}</span>
                        {stockBajo && (
                          <span className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">
                            Stock bajo
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        Stock: <span className="font-medium text-gray-900">{p.stockActual ?? 0}</span>
                        {p.precioVenta && (
                          <span className="ml-3">Venta: <span className="font-medium text-gray-900">{formatARS(p.precioVenta)}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        href={`/inventario/${p.id}`}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                      >
                        Ver detalle
                      </Link>
                      <span className="text-gray-300">|</span>
                      <Link
                        href={`/inventario/${p.id}/editar`}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                      >
                        Editar
                      </Link>
                    </div>
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
