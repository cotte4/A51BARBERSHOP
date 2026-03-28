import { db } from "@/db";
import { productos, stockMovimientos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { registrarMovimiento } from "../actions";
import MovimientoForm from "./_MovimientoForm";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(Number(val));
}

function formatFechaHora(val: Date | string | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const tipoBadge: Record<string, string> = {
  entrada: "bg-green-50 text-green-700",
  uso_interno: "bg-orange-50 text-orange-700",
  ajuste: "bg-gray-100 text-gray-700",
  venta: "bg-blue-50 text-blue-700",
};

const tipoLabel: Record<string, string> = {
  entrada: "Entrada",
  uso_interno: "Uso interno",
  ajuste: "Ajuste",
  venta: "Venta",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductoDetallePage({ params }: Props) {
  const { id } = await params;

  const [producto] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  if (!producto) notFound();

  const movimientos = await db
    .select()
    .from(stockMovimientos)
    .where(eq(stockMovimientos.productoId, id))
    .orderBy(desc(stockMovimientos.fecha))
    .limit(20);

  const stockBajo = (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 5);

  const registrarConId = registrarMovimiento.bind(null, id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/inventario" className="text-gray-400 hover:text-gray-600 text-sm mb-2 block">← Inventario</Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{producto.nombre}</h1>
                {stockBajo && (
                  <span className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">
                    Stock bajo
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {producto.stockActual ?? 0} <span className="text-sm font-normal text-gray-500">en stock</span>
              </p>
            </div>
            <Link
              href={`/inventario/${id}/editar`}
              className="min-h-[44px] inline-flex items-center border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Editar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Información</h2>
          <div className="flex flex-col gap-2">
            {producto.descripcion && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Descripción</span>
                <span className="text-gray-900 font-medium text-right max-w-[60%]">{producto.descripcion}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Precio de venta</span>
              <span className="text-gray-900 font-medium">{formatARS(producto.precioVenta)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Costo de compra</span>
              <span className="text-gray-900 font-medium">{formatARS(producto.costoCompra)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Stock mínimo</span>
              <span className="text-gray-900 font-medium">{producto.stockMinimo ?? 5}</span>
            </div>
          </div>
        </div>

        {/* Registrar movimiento */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Registrar movimiento</h2>
          <MovimientoForm registrarAction={registrarConId} />
        </div>

        {/* Últimos movimientos */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimos movimientos</h2>
          {movimientos.length === 0 ? (
            <p className="text-sm text-gray-400">No hay movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs text-gray-400 font-medium pb-2">Fecha</th>
                    <th className="text-left text-xs text-gray-400 font-medium pb-2">Tipo</th>
                    <th className="text-right text-xs text-gray-400 font-medium pb-2">Cantidad</th>
                    <th className="text-left text-xs text-gray-400 font-medium pb-2 pl-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movimientos.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 text-gray-500 text-xs whitespace-nowrap">{formatFechaHora(m.fecha)}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tipoBadge[m.tipo] ?? "bg-gray-100 text-gray-700"}`}>
                          {tipoLabel[m.tipo] ?? m.tipo}
                        </span>
                      </td>
                      <td className={`py-2 text-right font-medium ${(m.cantidad ?? 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {(m.cantidad ?? 0) > 0 ? "+" : ""}{m.cantidad ?? 0}
                      </td>
                      <td className="py-2 text-gray-500 text-xs pl-3">{m.notas ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
