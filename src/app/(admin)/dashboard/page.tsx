import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const todosProductos = await db
    .select()
    .from(productos)
    .where(eq(productos.activo, true));

  const productosStockBajo = todosProductos.filter(
    (p) => (p.stockActual ?? 0) <= (p.stockMinimo ?? 5)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">💈 A51 Barber</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Alertas de stock */}
        {productosStockBajo.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
              ⚠️ Stock bajo ({productosStockBajo.length} producto{productosStockBajo.length !== 1 ? "s" : ""})
            </h2>
            <div className="flex flex-col gap-3">
              {productosStockBajo.map((p) => (
                <div
                  key={p.id}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{p.nombre}</span>
                        <span className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">
                          Stock bajo
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Stock actual:{" "}
                        <span className="font-medium text-gray-900">{p.stockActual ?? 0}</span>
                        <span className="mx-1 text-gray-400">/</span>
                        Mínimo:{" "}
                        <span className="font-medium text-gray-900">{p.stockMinimo ?? 5}</span>
                      </p>
                    </div>
                    <Link
                      href={`/inventario/${p.id}`}
                      className="flex-shrink-0 text-sm text-amber-700 hover:text-amber-900 underline"
                    >
                      Ver →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-700 font-medium">✓ Inventario en orden</p>
          </div>
        )}

        {/* Accesos rápidos */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Accesos rápidos
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <Link
              href="/caja"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Caja del día</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/inventario"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Inventario</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/configuracion"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Configuración</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href="/liquidaciones"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Liquidaciones</span>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
