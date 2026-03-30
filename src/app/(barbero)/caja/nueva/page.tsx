import { db } from "@/db";
import { barberos, servicios, serviciosAdicionales, mediosPago, cierresCaja } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCajaActorContext } from "@/lib/caja-access";
import Link from "next/link";
import AtencionForm from "@/components/caja/AtencionForm";
import { registrarAtencion } from "../actions";

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
      <div className="flex flex-col gap-4">
        <Link href="/caja" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Caja
        </Link>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-700 font-medium">La caja del día ya fue cerrada.</p>
          <p className="text-gray-500 text-sm mt-1">No se pueden registrar nuevas atenciones.</p>
          <Link
            href={`/caja/cierre/${fechaHoy}`}
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Ver resumen del cierre →
          </Link>
        </div>
      </div>
    );
  }

  // Cargar datos en paralelo
  const [barberosActivos, serviciosActivos, adicionalesAll, mediosPagoActivos] =
    await Promise.all([
      db.select().from(barberos).where(eq(barberos.activo, true)),
      db.select().from(servicios).where(eq(servicios.activo, true)),
      db.select().from(serviciosAdicionales),
      db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
    ]);

  const preselectedBarberoId = actor?.barberoId;

  if (!isAdmin && !preselectedBarberoId) {
    return (
      <main className="min-h-screen p-4 max-w-2xl mx-auto pb-16">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/caja"
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            {"<- Caja"}
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-700 font-medium">
            Tu usuario no tiene un barbero activo vinculado.
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Vincula el usuario desde configuracion antes de registrar atenciones.
          </p>
        </div>
      </main>
    );
  }

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
        Nueva atención
      </h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {params.fromQuickAction ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            ConfigurÃ¡ el servicio y medio de pago por defecto del barbero para usar la acciÃ³n rÃ¡pida sin pasar por este formulario.
          </div>
        ) : null}
        <AtencionForm
          action={registrarAtencion}
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
          preselectedBarberoId={preselectedBarberoId}
          isAdmin={isAdmin}
          initialData={{
            barberoId: params.barberoId,
            servicioId: params.servicioId,
            medioPagoId: params.medioPagoId,
            precioCobrado: params.precioCobrado,
          }}
          submitLabel="Registrar atención"
          cancelHref="/caja"
        />
      </div>
    </main>
  );
}
