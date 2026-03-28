import { db } from "@/db";
import { barberos, servicios, serviciosAdicionales, mediosPago, cierresCaja } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import AtencionForm from "@/components/caja/AtencionForm";
import { registrarAtencion } from "../actions";

export default async function NuevaAtencionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";

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

  // Pre-seleccionar barbero si el usuario logueado es barbero
  let preselectedBarberoId: string | undefined;
  if (!isAdmin && userId) {
    const barberoDelUsuario = barberosActivos.find((b) => b.userId === userId);
    preselectedBarberoId = barberoDelUsuario?.id;
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
          submitLabel="Registrar atención"
          cancelHref="/caja"
        />
      </div>
    </main>
  );
}
