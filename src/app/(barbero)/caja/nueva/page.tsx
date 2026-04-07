import Link from "next/link";
import { and, eq, gt } from "drizzle-orm";
import AtencionForm from "@/components/caja/AtencionForm";
import { db } from "@/db";
import {
  barberos,
  cierresCaja,
  clients,
  mediosPago,
  productos,
  servicios,
  serviciosAdicionales,
} from "@/db/schema";
import { getCajaActorContext } from "@/lib/caja-access";
import { registrarAtencion } from "../actions";

type NuevaAtencionPageProps = {
  searchParams: Promise<{
    barberoId?: string;
    servicioId?: string;
    medioPagoId?: string;
    precioCobrado?: string;
    clienteId?: string;
    fromQuickAction?: string;
  }>;
};

export default async function NuevaAtencionPage({ searchParams }: NuevaAtencionPageProps) {
  const actor = await getCajaActorContext();
  const isAdmin = actor?.isAdmin ?? false;
  const params = await searchParams;

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
      <div className="space-y-4">
        <Link href="/caja" className="text-sm text-zinc-400 hover:text-[#8cff59]">
          Volver a caja
        </Link>
        <div className="panel-card rounded-[28px] p-6 text-center">
          <p className="font-medium text-white">La caja del dia ya fue cerrada.</p>
          <p className="mt-1 text-sm text-zinc-400">No se pueden registrar nuevas atenciones.</p>
          <Link
            href={`/caja/cierre/${fechaHoy}`}
            className="mt-4 inline-block text-sm font-medium text-[#8cff59] underline"
          >
            Ver resumen del cierre
          </Link>
        </div>
      </div>
    );
  }

  const [
    barberosActivos,
    serviciosActivos,
    adicionalesAll,
    mediosPagoActivos,
    productosActivos,
    clientePreseleccionado,
  ] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.activo, true)),
    db.select().from(servicios).where(eq(servicios.activo, true)),
    db.select().from(serviciosAdicionales),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
    db
      .select()
      .from(productos)
      .where(and(eq(productos.activo, true), gt(productos.stockActual, 0))),
    params.clienteId
      ? db
          .select({
            id: clients.id,
            name: clients.name,
            phoneRaw: clients.phoneRaw,
            esMarciano: clients.esMarciano,
          })
          .from(clients)
          .where(eq(clients.id, params.clienteId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const preselectedBarberoId = actor?.barberoId;

  if (!isAdmin && !preselectedBarberoId) {
    return (
      <div className="space-y-4">
        <Link href="/caja" className="text-sm text-zinc-400 hover:text-[#8cff59]">
          Volver a caja
        </Link>
        <div className="panel-card rounded-[28px] p-6 text-center">
          <p className="font-medium text-white">Tu usuario no tiene un barbero activo vinculado.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Vincula el usuario desde configuracion antes de registrar atenciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Link href="/caja" className="text-sm text-zinc-400 transition-colors hover:text-[#8cff59]">
          &larr; Volver a caja
        </Link>
      </div>

      <section className="panel-card overflow-hidden rounded-[28px] p-5 sm:p-6">
        <p className="eyebrow text-[11px] font-semibold">Caja</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {clientePreseleccionado
            ? `Cobrar a ${clientePreseleccionado.name}`
            : "Nueva atencion"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Registra el servicio, los productos y el medio de pago. Si es un cliente Marciano, se
          habilitan las consumiciones incluidas automaticamente.
        </p>
      </section>

      {params.fromQuickAction ? (
        <div className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-zinc-200">
          Configura el servicio y medio de pago por defecto del barbero para usar la accion rapida
          sin pasar por este formulario.
        </div>
      ) : null}

      <div className="panel-card rounded-[28px] p-5 sm:p-6">
        <AtencionForm
          action={registrarAtencion}
          barberosList={barberosActivos.map((barbero) => ({
            id: barbero.id,
            nombre: barbero.nombre,
            porcentajeComision: barbero.porcentajeComision,
          }))}
          serviciosList={serviciosActivos.map((servicio) => ({
            id: servicio.id,
            nombre: servicio.nombre,
            precioBase: servicio.precioBase,
          }))}
          adicionalesList={adicionalesAll.map((adicional) => ({
            id: adicional.id,
            servicioId: adicional.servicioId,
            nombre: adicional.nombre,
            precioExtra: adicional.precioExtra,
          }))}
          mediosPagoList={mediosPagoActivos.map((medio) => ({
            id: medio.id,
            nombre: medio.nombre,
            comisionPorcentaje: medio.comisionPorcentaje,
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
            barberoId: params.barberoId,
            servicioId: params.servicioId,
            medioPagoId: params.medioPagoId,
            precioCobrado: params.precioCobrado,
            client: clientePreseleccionado,
          }}
          submitLabel="Registrar atencion"
          cancelHref="/caja"
        />
      </div>
    </div>
  );
}
