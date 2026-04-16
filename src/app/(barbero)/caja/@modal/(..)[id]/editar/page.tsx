import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  atencionesProductos,
  barberos,
  clients,
  mediosPago,
  productos,
  servicios,
  serviciosAdicionales,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import AtencionForm from "@/components/caja/AtencionForm";
import Modal from "@/components/ui/Modal";
import { getCajaActorContext } from "@/lib/caja-access";
import { editarAtencion } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarAtencionModal({ params }: Props) {
  const { id } = await params;

  const fechaHoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const [atencion] = await db
    .select()
    .from(atenciones)
    .where(eq(atenciones.id, id))
    .limit(1);

  if (!atencion || atencion.anulado) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Atención no encontrada.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Este movimiento no existe o ya fue anulado.
          </p>
        </div>
      </Modal>
    );
  }

  if (atencion.fecha !== fechaHoy) {
    const fechaLabel = new Intl.DateTimeFormat("es-AR", {
      dateStyle: "long",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date(`${atencion.fecha}T12:00:00-03:00`));

    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Edición bloqueada.</p>
          <p className="mt-2 text-sm text-zinc-400">
            Esta atención corresponde al {fechaLabel}. Solo se pueden editar
            movimientos del día actual.
          </p>
        </div>
      </Modal>
    );
  }

  const actor = await getCajaActorContext();
  const isAdmin = actor?.isAdmin ?? false;

  if (!isAdmin && !actor?.barberoId) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Acceso requerido.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Tu usuario no tiene un barbero activo vinculado.
          </p>
        </div>
      </Modal>
    );
  }

  if (!isAdmin && atencion.barberoId !== actor?.barberoId) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Sin permiso.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Solo podés editar tus propias atenciones.
          </p>
        </div>
      </Modal>
    );
  }

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

  const clientActual = atencionClient[0]
    ? {
        id: atencionClient[0].id,
        name: atencionClient[0].name,
        phoneRaw: atencionClient[0].phoneRaw,
        esMarciano: atencionClient[0].esMarciano,
      }
    : null;

  const editarConId = editarAtencion.bind(null, id);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">
          Movimiento #{id.slice(0, 8).toUpperCase()}
        </p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Editar atención
        </h2>
      </div>

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
        productosList={productosActivos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precioVenta: p.precioVenta,
          stockActual: p.stockActual,
          esConsumicion: p.esConsumicion,
        }))}
        preselectedBarberoId={actor?.barberoId}
        isAdmin={isAdmin}
        initialData={{
          barberoId: atencion.barberoId ?? undefined,
          client: clientActual,
          servicioId: atencion.servicioId ?? undefined,
          adicionalesIds: adicionalesDeAtencion
            .map((a) => a.adicionalId ?? "")
            .filter(Boolean),
          precioCobrado: atencion.precioCobrado ?? undefined,
          medioPagoId: atencion.medioPagoId ?? undefined,
          notas: atencion.notas,
          productos: productosDeAtencion.map((p) => ({
            productoId: p.productoId ?? "",
            cantidad: p.cantidad ?? 0,
            precioUnitario: p.precioUnitario,
            esMarcianoIncluido: p.esMarcianoIncluido ?? false,
          })),
        }}
        submitLabel="Guardar cambios"
        cancelHref="/caja"
      />
    </Modal>
  );
}
