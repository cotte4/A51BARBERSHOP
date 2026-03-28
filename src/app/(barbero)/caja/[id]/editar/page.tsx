import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  barberos,
  servicios,
  serviciosAdicionales,
  mediosPago,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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

  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  const userId = session?.user?.id;
  const isAdmin = userRole === "admin";

  const [
    barberosActivos,
    serviciosActivos,
    adicionalesAll,
    mediosPagoActivos,
    adicionalesDeAtencion,
  ] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.activo, true)),
    db.select().from(servicios).where(eq(servicios.activo, true)),
    db.select().from(serviciosAdicionales),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
    db
      .select()
      .from(atencionesAdicionales)
      .where(eq(atencionesAdicionales.atencionId, id)),
  ]);

  let preselectedBarberoId: string | undefined;
  if (!isAdmin && userId) {
    const barberoDelUsuario = barberosActivos.find((b) => b.userId === userId);
    preselectedBarberoId = barberoDelUsuario?.id;
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
          preselectedBarberoId={preselectedBarberoId}
          isAdmin={isAdmin}
          initialData={{
            barberoId: atencion.barberoId ?? undefined,
            servicioId: atencion.servicioId ?? undefined,
            adicionalesIds: adicionalesDeAtencion
              .map((a) => a.adicionalId ?? "")
              .filter(Boolean),
            precioCobrado: atencion.precioCobrado ?? undefined,
            medioPagoId: atencion.medioPagoId ?? undefined,
            notas: atencion.notas,
          }}
          submitLabel="Guardar cambios"
          cancelHref="/caja"
        />
      </div>
    </main>
  );
}
