import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  atencionesProductos,
  barberos,
  clients,
  serviciosAdicionales,
  mediosPago,
  productos,
  servicios,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCajaActorContext } from "@/lib/caja-access";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import AtencionForm from "@/components/caja/AtencionForm";
import { editarAtencion } from "../../actions";

export default async function EditarAtencionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fechaHoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const [atencion] = await db
    .select()
    .from(atenciones)
    .where(eq(atenciones.id, id))
    .limit(1);

  if (!atencion) notFound();
  if (atencion.anulado) redirect("/caja");

  // Verificar que es del día de hoy
  if (atencion.fecha !== fechaHoy) {
    return (
      <main className="min-h-screen p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm mb-3">
            Solo se pueden editar atenciones del día de hoy.
          </p>
          <Link
            href="/caja"
            className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
          >
            ← Volver a caja
          </Link>
        </div>
      </main>
    );
  }

  const actor = await getCajaActorContext();
  const isAdmin = actor?.isAdmin ?? false;

  const [
    barberosActivos,
    serviciosActivos,
    adicionalesAll,
    mediosPagoActivos,
    productosActivos,
    adicionalesDeAtencion,
    productosDeAtencion,
    atencionClient,
  ] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.activo, true)),
    db.select().from(servicios).where(eq(servicios.activo, true)),
    db.select().from(serviciosAdicionales),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
    db.select().from(productos).where(eq(productos.activo, true)),
    db
      .select()
      .from(atencionesAdicionales)
      .where(eq(atencionesAdicionales.atencionId, id)),
    db
      .select()
      .from(atencionesProductos)
      .where(eq(atencionesProductos.atencionId, id)),
    atencion.clientId
      ? db
          .select({
            id: clients.id,
            name: clients.name,
            phoneRaw: clients.phoneRaw,
            esMarciano: clients.esMarciano,
          })
          .from(clients)
          .where(eq(clients.id, atencion.clientId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const preselectedBarberoId = actor?.barberoId;

  if (!isAdmin && !preselectedBarberoId) {
    return (
      <main className="min-h-screen p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm mb-3">
            Tu usuario no tiene un barbero activo vinculado.
          </p>
          <Link
            href="/caja"
            className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
          >
            {"<- Volver a caja"}
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdmin && atencion.barberoId !== preselectedBarberoId) {
    redirect("/caja");
  }

  const editarConId = editarAtencion.bind(null, id);

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
        Editar atención
      </h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <AtencionForm
          action={editarConId}
          barberosList={barberosActivos.map((b) => ({
            id: b.id,
            nombre: b.nombre,
            porcentajeComision: b.porcentajeComision,
          }))}
          serviciosList={serviciosActivos.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            precioBase: s.precioBase,
          }))}
          adicionalesList={adicionalesAll.map((a) => ({
            id: a.id,
            servicioId: a.servicioId,
            nombre: a.nombre,
            precioExtra: a.precioExtra,
          }))}
          mediosPagoList={mediosPagoActivos.map((m) => ({
            id: m.id,
            nombre: m.nombre,
            comisionPorcentaje: m.comisionPorcentaje,
          }))}
          productosList={productosActivos.map((producto) => ({
            id: producto.id,
            nombre: producto.nombre,
            precioVenta: producto.precioVenta,
            stockActual: producto.stockActual,
            esConsumicion: producto.esConsumicion,
          }))}
          preselectedBarberoId={preselectedBarberoId}
          isAdmin={isAdmin}
          initialData={{
            barberoId: atencion.barberoId ?? undefined,
            client: atencionClient[0]
              ? {
                  id: atencionClient[0].id,
                  name: atencionClient[0].name,
                  phoneRaw: atencionClient[0].phoneRaw,
                  esMarciano: atencionClient[0].esMarciano,
                }
              : null,
            servicioId: atencion.servicioId ?? undefined,
            adicionalesIds: adicionalesDeAtencion
              .map((a) => a.adicionalId ?? "")
              .filter(Boolean),
            precioCobrado: atencion.precioCobrado ?? undefined,
            medioPagoId: atencion.medioPagoId ?? undefined,
            notas: atencion.notas,
            productos: productosDeAtencion.map((producto) => ({
              productoId: producto.productoId ?? "",
              cantidad: producto.cantidad ?? 0,
              precioUnitario: producto.precioUnitario,
              esMarcianoIncluido: producto.esMarcianoIncluido ?? false,
            })),
          }}
          submitLabel="Guardar cambios"
          cancelHref="/caja"
        />
      </div>
    </main>
  );
}
