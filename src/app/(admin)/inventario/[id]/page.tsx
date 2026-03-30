import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediosPago, productos, stockMovimientos } from "@/db/schema";
import { registrarMovimiento } from "../actions";
import MovimientoForm from "./_MovimientoForm";

function formatARS(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function formatFechaHora(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", {
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

  const [producto] = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
  if (!producto) notFound();

  const [movimientos, mediosPagoList] = await Promise.all([
    db
      .select()
      .from(stockMovimientos)
      .where(eq(stockMovimientos.productoId, id))
      .orderBy(desc(stockMovimientos.fecha))
      .limit(20),
    db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago),
  ]);

  const mediosPagoMap = new Map(
    mediosPagoList.map((medio) => [medio.id, medio.nombre ?? "Medio de pago"])
  );
  const stockBajo = (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 5);
  const registrarConId = registrarMovimiento.bind(null, id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Link href="/inventario" className="mb-2 block text-sm text-gray-400 hover:text-gray-600">
            ← Inventario
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{producto.nombre}</h1>
                {stockBajo ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    Stock bajo
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {producto.stockActual ?? 0}{" "}
                <span className="text-sm font-normal text-gray-500">en stock</span>
              </p>
            </div>
            <Link
              href={`/inventario/${id}/editar`}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Editar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Informacion</h2>
          <div className="flex flex-col gap-2">
            {producto.descripcion ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Descripcion</span>
                <span className="max-w-[60%] text-right font-medium text-gray-900">
                  {producto.descripcion}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Precio de venta</span>
              <span className="font-medium text-gray-900">{formatARS(producto.precioVenta)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Costo de compra</span>
              <span className="font-medium text-gray-900">{formatARS(producto.costoCompra)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Stock minimo</span>
              <span className="font-medium text-gray-900">{producto.stockMinimo ?? 5}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Registrar movimiento</h2>
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Solo administracion puede tocar el stock manualmente.
          </p>
          <MovimientoForm registrarAction={registrarConId} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Ultimos movimientos</h2>
          {movimientos.length === 0 ? (
            <p className="text-sm text-gray-400">No hay movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Fecha</th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Tipo</th>
                    <th className="pb-2 text-right text-xs font-medium text-gray-400">Cantidad</th>
                    <th className="pb-2 pl-3 text-left text-xs font-medium text-gray-400">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td className="whitespace-nowrap py-2 text-xs text-gray-500">
                        {formatFechaHora(movimiento.fecha)}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            tipoBadge[movimiento.tipo] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {tipoLabel[movimiento.tipo] ?? movimiento.tipo}
                        </span>
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          (movimiento.cantidad ?? 0) >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {(movimiento.cantidad ?? 0) > 0 ? "+" : ""}
                        {movimiento.cantidad ?? 0}
                      </td>
                      <td className="py-2 pl-3 text-xs text-gray-500">
                        {formatMovimientoNota(movimiento.tipo, movimiento.notas, mediosPagoMap)}
                      </td>
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

function formatMovimientoNota(
  tipo: string,
  nota: string | null,
  mediosPagoMap: Map<string, string>
) {
  if (tipo === "venta") {
    if (nota && mediosPagoMap.has(nota)) {
      return `Venta por ${mediosPagoMap.get(nota)}`;
    }
    return "Venta registrada";
  }

  if (nota?.trim()) {
    return nota;
  }

  if (tipo === "entrada") return "Reposicion manual";
  if (tipo === "uso_interno") return "Uso interno del salon";
  if (tipo === "ajuste") return "Ajuste manual";
  return "—";
}
