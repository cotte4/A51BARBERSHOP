import { db } from "@/db";
import { productos, mediosPago, cierresCaja } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import VentaProductoForm from "@/components/caja/VentaProductoForm";
import { registrarVentaProducto } from "../actions";

export default async function VenderProductoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl p-4 pb-16">
        <p className="text-sm text-gray-500">Debés iniciar sesión para acceder a esta página.</p>
      </main>
    );
  }

  const fechaHoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl p-4 pb-16">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/caja" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
            ← Caja
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="font-medium text-gray-700">La caja ya está cerrada.</p>
          <p className="mt-1 text-sm text-gray-500">No se pueden registrar nuevas ventas.</p>
          <Link
            href={`/caja/cierre/${fechaHoy}`}
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Ver resumen del cierre →
          </Link>
        </div>
      </main>
    );
  }

  const [productosActivos, mediosPagoActivos] = await Promise.all([
    db
      .select()
      .from(productos)
      .where(eq(productos.activo, true))
      .orderBy(asc(productos.nombre)),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  const productosConStock = productosActivos.filter((producto) => (producto.stockActual ?? 0) > 0);

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-4 pb-16">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/caja" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
          ← Caja
        </Link>
      </div>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Vender producto</h2>
      <p className="mb-5 text-sm text-gray-500">
        Elegí el producto y el medio de pago con toques rápidos. El precio se completa solo.
      </p>

      {productosConStock.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="font-medium text-gray-700">Sin productos con stock disponible.</p>
          <p className="mt-1 text-sm text-gray-500">Ingresá stock en el módulo de inventario.</p>
          <Link href="/inventario" className="mt-4 inline-block text-sm text-gray-900 underline">
            Ir a inventario →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <VentaProductoForm
            action={registrarVentaProducto}
            productosList={productosConStock.map((producto) => ({
              id: producto.id,
              nombre: producto.nombre,
              precioVenta: producto.precioVenta,
              stockActual: producto.stockActual,
            }))}
            mediosPagoList={mediosPagoActivos.map((medio) => ({
              id: medio.id,
              nombre: medio.nombre,
              comisionPorcentaje: medio.comisionPorcentaje,
            }))}
          />
        </div>
      )}
    </main>
  );
}
