import Link from "next/link";
import { and, eq, gt } from "drizzle-orm";
import AtencionForm from "@/components/caja/AtencionForm";
import QuickCheckoutPanel from "@/components/caja/QuickCheckoutPanel";
import { db } from "@/db";
import {
  barberos,
  cierresCaja,
  mediosPago,
  productos,
  servicios,
  serviciosAdicionales,
} from "@/db/schema";
import { getQuickActionDefaultsForBarbero } from "@/lib/caja-atencion";
import { getCajaActorContext } from "@/lib/caja-access";
import type { QuickActionOption } from "@/lib/types";
import { registrarAtencion, registrarAtencionRapidaSeleccionadaAction } from "../actions";

type NuevaAtencionPageProps = {
  searchParams: Promise<{
    barberoId?: string;
    servicioId?: string;
    medioPagoId?: string;
    precioCobrado?: string;
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

  const [barberosActivos, serviciosActivos, adicionalesAll, mediosPagoActivos, productosActivos] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.activo, true)),
    db.select().from(servicios).where(eq(servicios.activo, true)),
    db.select().from(serviciosAdicionales),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
    db
      .select()
      .from(productos)
      .where(and(eq(productos.activo, true), gt(productos.stockActual, 0))),
  ]);

  const preselectedBarberoId = actor?.barberoId;
  const quickDefaults = preselectedBarberoId
    ? await getQuickActionDefaultsForBarbero(preselectedBarberoId)
    : null;
  const quickActionOptions: QuickActionOption[] = quickDefaults
    ? [
        quickDefaults,
        ...mediosPagoActivos
          .filter((medio) => {
            const nombre = (medio.nombre ?? "").toLowerCase();
            return (
              medio.id !== quickDefaults.medioPagoId &&
              (nombre.includes("efectivo") ||
                nombre.includes("transf") ||
                nombre.includes("posnet") ||
                nombre.includes("tarjeta"))
            );
          })
          .slice(0, 2)
          .map((medio) => ({
            medioPagoId: medio.id,
            medioPagoNombre: medio.nombre ?? "-",
            precioBase: quickDefaults.precioBase,
            comisionMedioPagoPct: Number(medio.comisionPorcentaje ?? 0),
          })),
      ].slice(0, 2)
    : [];

  if (!isAdmin && !preselectedBarberoId) {
    return (
      <main className="app-shell mx-auto min-h-screen max-w-4xl px-4 py-6 pb-16">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/caja" className="text-sm text-zinc-400 transition-colors hover:text-[#8cff59]">
            Volver a caja
          </Link>
        </div>
        <div className="panel-card rounded-[28px] p-6 text-center">
          <p className="font-medium text-white">Tu usuario no tiene un barbero activo vinculado.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Vincula el usuario desde configuracion antes de registrar atenciones.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/caja" className="text-sm text-zinc-400 transition-colors hover:text-[#8cff59]">
            Volver a caja
          </Link>
        </div>

        <section className="mb-6 overflow-hidden rounded-[30px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.18)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.18),_transparent_30%)] p-6 sm:p-7">
            <p className="eyebrow text-xs font-semibold">Caja</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight">Nueva atencion</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
              Pantalla rapida para cobrar como POS: seleccion visual, precio automatico y guardado express.
            </p>
          </div>
        </section>

        <div className="space-y-6">
          <QuickCheckoutPanel
            defaults={quickDefaults}
            options={quickActionOptions}
            action={registrarAtencionRapidaSeleccionadaAction}
          />

          <div className="panel-card rounded-[30px] p-5 sm:p-6">
            {params.fromQuickAction ? (
              <div className="mb-5 rounded-[22px] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-zinc-200">
                Configura el servicio y medio de pago por defecto del barbero para usar la accion rapida sin pasar por este formulario.
              </div>
            ) : null}

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
              }))}
              preselectedBarberoId={preselectedBarberoId}
              isAdmin={isAdmin}
              initialData={{
                barberoId: params.barberoId,
                servicioId: params.servicioId,
                medioPagoId: params.medioPagoId,
                precioCobrado: params.precioCobrado,
              }}
              submitLabel="Registrar atencion"
              cancelHref="/caja"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
