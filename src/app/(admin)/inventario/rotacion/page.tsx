import { db } from "@/db";
import { stockMovimientos, productos } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

export default async function RotacionPage() {
  // Obtener todos los movimientos de venta
  const movimientosVenta = await db
    .select({
      productoId: stockMovimientos.productoId,
      cantidad: stockMovimientos.cantidad,
      precioUnitario: stockMovimientos.precioUnitario,
    })
    .from(stockMovimientos)
    .where(eq(stockMovimientos.tipo, "venta"));

  // Obtener todos los productos
  const productosList = await db.select().from(productos);
  const productosMap = new Map(productosList.map((p) => [p.id, p]));

  // Agrupar y sumar por producto
  const rotacionMap = new Map<
    string,
    { unidades: number; ingresoTotal: number }
  >();
  for (const m of movimientosVenta) {
    if (!m.productoId) continue;
    const prev = rotacionMap.get(m.productoId) ?? {
      unidades: 0,
      ingresoTotal: 0,
    };
    const cant = Math.abs(Number(m.cantidad ?? 0));
    const ingreso = cant * Number(m.precioUnitario ?? 0);
    rotacionMap.set(m.productoId, {
      unidades: prev.unidades + cant,
      ingresoTotal: prev.ingresoTotal + ingreso,
    });
  }

  // Combinar con datos de producto y ordenar por unidades DESC
  const rotacion = Array.from(rotacionMap.entries())
    .map(([productoId, datos]) => ({
      producto: productosMap.get(productoId),
      ...datos,
    }))
    .filter((r) => r.producto)
    .sort((a, b) => b.unidades - a.unidades);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/inventario"
            className="text-gray-400 hover:text-gray-600 text-sm mb-2 block"
          >
            ← Inventario
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Rotación de productos
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Total histórico de ventas
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {rotacion.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Sin ventas registradas todavía.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rotacion.map((item, index) => {
              const p = item.producto!;
              const stockBajo = (p.stockActual ?? 0) <= (p.stockMinimo ?? 5);

              const margen =
                p.costoCompra !== null && p.costoCompra !== undefined
                  ? (Number(p.precioVenta ?? 0) - Number(p.costoCompra)) *
                    item.unidades
                  : null;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Número de posición */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {p.nombre}
                        </span>
                        {stockBajo && (
                          <span className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">
                            Stock bajo
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-col gap-1">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-gray-900">
                            {item.unidades}
                          </span>{" "}
                          unidades vendidas
                        </div>

                        <div className="text-sm text-gray-600">
                          Ingreso total:{" "}
                          <span className="font-medium text-gray-900">
                            {formatARS(item.ingresoTotal)}
                          </span>
                        </div>

                        {margen !== null && (
                          <div className="text-sm text-gray-600">
                            Margen estimado:{" "}
                            <span className="font-medium text-green-700">
                              {formatARS(margen)}
                            </span>
                          </div>
                        )}

                        <div className="text-sm text-gray-600">
                          Stock actual:{" "}
                          <span
                            className={
                              stockBajo
                                ? "font-medium text-red-700"
                                : "font-medium text-gray-900"
                            }
                          >
                            {p.stockActual ?? 0}
                          </span>
                        </div>
                      </div>
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
