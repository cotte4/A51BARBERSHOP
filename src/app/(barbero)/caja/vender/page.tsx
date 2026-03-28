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
      <main className="min-h-screen p-4 max-w-2xl mx-auto pb-16">
        <p className="text-gray-500 text-sm">Debés iniciar sesión para acceder a esta página.</p>
      </main>
    );
  }

  // Verificar cierre del día
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
      <main className="min-h-screen p-4 max-w-2xl mx-auto pb-16">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/caja" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
            ← Caja
          </Link>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-700 font-medium">La caja ya está cerrada.</p>
          <p className="text-gray-500 text-sm mt-1">No se pueden registrar nuevas ventas.</p>
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

  // Cargar productos activos con stock > 0, ordenados por nombre
  const [productosActivos, mediosPagoActivos] = await Promise.all([
    db
      .select()
      .from(productos)
      .where(eq(productos.activo, true))
      .orderBy(asc(productos.nombre)),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  // Filtrar los que tienen stock > 0
  const productosConStock = productosActivos.filter(
    (p) => (p.stockActual ?? 0) > 0
  );

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/caja"
          className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
        >
          ← Caja
        </Link>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-5">
        Vender producto
      </h2>

      {productosConStock.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-700 font-medium">Sin productos con stock disponible.</p>
          <p className="text-gray-500 text-sm mt-1">
            Ingresá stock en el módulo de inventario.
          </p>
          <Link
            href="/inventario"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Ir a inventario →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <VentaProductoForm
            action={registrarVentaProducto}
            productosList={productosConStock.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              precioVenta: p.precioVenta,
              stockActual: p.stockActual,
            }))}
            mediosPagoList={mediosPagoActivos.map((m) => ({
              id: m.id,
              nombre: m.nombre,
              comisionPorcentaje: m.comisionPorcentaje,
            }))}
          />
        </div>
      )}
    </main>
  );
}
