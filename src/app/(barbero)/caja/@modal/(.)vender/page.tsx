import { db } from "@/db";
import { productos, mediosPago, cierresCaja } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import VentaProductoForm from "@/components/caja/VentaProductoForm";
import Modal from "@/components/ui/Modal";
import { registrarVentaProducto } from "../../actions";

export default async function VenderModal() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return (
      <Modal>
        <p className="text-sm text-zinc-400">Debés iniciar sesión para acceder.</p>
      </Modal>
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
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">La caja ya esta cerrada.</p>
          <p className="mt-1 text-sm text-zinc-400">No se pueden registrar nuevas ventas.</p>
          <Link
            href={`/caja/cierre/${fechaHoy}`}
            className="mt-4 inline-block text-sm font-medium text-[#8cff59]"
          >
            Ver resumen del cierre
          </Link>
        </div>
      </Modal>
    );
  }

  const [productosActivos, mediosPagoActivos] = await Promise.all([
    db.select().from(productos).where(eq(productos.activo, true)).orderBy(asc(productos.nombre)),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  const productosConStock = productosActivos.filter((p) => (p.stockActual ?? 0) > 0);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Caja</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Vender producto
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Elegí el producto y el medio de pago. El precio se completa solo.
        </p>
      </div>

      {productosConStock.length === 0 ? (
        <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-6 text-center">
          <p className="font-medium text-white">Sin productos con stock disponible.</p>
          <p className="mt-1 text-sm text-zinc-400">Ingresá stock en el módulo de inventario.</p>
          <Link href="/inventario" className="mt-4 inline-block text-sm font-medium text-[#8cff59]">
            Ir a inventario
          </Link>
        </div>
      ) : (
        <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-5">
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
    </Modal>
  );
}
