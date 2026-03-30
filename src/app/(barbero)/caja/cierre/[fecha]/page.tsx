import { db } from "@/db";
import { barberos, cierresCaja } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { normalizeCierreResumen, type ResumenBarberoCierre } from "@/lib/caja-finance";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "./_PrintButton";

export default async function CierreDetallePage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const userId = session?.user?.id;

  const [cierre] = await db
    .select()
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fecha))
    .limit(1);

  if (!cierre) notFound();

  const resumen = normalizeCierreResumen({
    resumenBarberos: cierre.resumenBarberos,
    totalNeto: cierre.totalNeto,
    totalProductos: cierre.totalProductos,
  });

  let barberoIdDelUsuario: string | null = null;
  if (!isAdmin && userId) {
    const [barberoDelUsuario] = await db
      .select({ id: barberos.id })
      .from(barberos)
      .where(eq(barberos.userId, userId))
      .limit(1);
    barberoIdDelUsuario = barberoDelUsuario?.id ?? null;
  }

  const resumenFiltrado: Record<string, ResumenBarberoCierre> = isAdmin
    ? resumen.barberos
    : barberoIdDelUsuario && resumen.barberos[barberoIdDelUsuario]
      ? { [barberoIdDelUsuario]: resumen.barberos[barberoIdDelUsuario] }
      : {};

  const horaCierre = cierre.cerradoEn
    ? new Date(cierre.cerradoEn).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/caja" className="print:hidden text-sm text-gray-400 hover:text-gray-600">
          {"<- Caja"}
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-gray-900 capitalize">
          Cierre de caja - {formatFechaLarga(fecha)}
        </h2>
      </div>

      <div className="print:hidden flex flex-wrap gap-2">
        <PrintButton />
        {isAdmin && (
          <a
            href={`/api/pdf/cierre/${fecha}`}
            download
            className="min-h-[44px] inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Descargar PDF
          </a>
        )}
      </div>

      <div className="rounded-xl bg-gray-900 p-4 text-white">
        <div className="text-sm font-semibold">
          Caja cerrada{horaCierre ? ` a las ${horaCierre}` : ""}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Totales del dia</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total bruto del dia</span>
            <span className="font-medium text-gray-900">{formatARS(cierre.totalBruto)}</span>
          </div>
          {Number(cierre.totalComisionesMedios ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Comisiones medios de pago</span>
              <span className="text-red-600">-{formatARS(cierre.totalComisionesMedios)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Caja neta del dia</span>
            <span className="font-bold text-gray-900">{formatARS(cierre.totalNeto)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-100 pt-2 text-sm">
            <span className="text-gray-500">Servicios netos</span>
            <span className="font-medium text-gray-900">
              {formatARS(resumen.totales.cajaNetaServicios)}
            </span>
          </div>
          {Number(cierre.totalProductos ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Productos brutos</span>
              <span className="font-medium text-gray-900">
                {formatARS(cierre.totalProductos)}
              </span>
            </div>
          )}
        </div>
      </div>

      {Object.keys(resumenFiltrado).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Por barbero</h3>
          <div className="flex flex-col gap-3">
            {Object.values(resumenFiltrado).map((barbero) => (
              <div key={barbero.nombre} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">{barbero.nombre}</span>
                  <span className="text-gray-500">
                    {barbero.cortes} {barbero.cortes === 1 ? "corte" : "cortes"}
                  </span>
                </div>
                <div className="mt-0.5 flex justify-between text-gray-500">
                  <span>Bruto: {formatARS(barbero.totalBruto)}</span>
                  <span>Comision: {formatARS(barbero.comisionCalculada)}</span>
                </div>
                {barbero.aporteCasaServicios > 0 && (
                  <div className="mt-0.5 text-xs text-gray-400">
                    Aporte casa por servicios: {formatARS(barbero.aporteCasaServicios)}
                  </div>
                )}
                {barbero.ingresoNetoServicios > 0 && (
                  <div className="mt-0.5 text-xs text-gray-400">
                    Ingreso neto propio: {formatARS(barbero.ingresoNetoServicios)}
                  </div>
                )}
                {barbero.alquilerBancoDiario > 0 && (
                  <div className="mt-0.5 text-xs text-gray-400">
                    Alquiler banco/dia devengado: {formatARS(barbero.alquilerBancoDiario)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 text-sm text-gray-500">Caja neta del dia</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatARS(resumen.totales.cajaNetaDia)}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Servicios {formatARS(resumen.totales.cajaNetaServicios)}
            {" · "}
            Productos {formatARS(resumen.totales.cajaNetaProductos)}
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-xl bg-gray-900 p-4 text-white">
            <div className="mb-1 text-sm text-gray-400">Aporte economico casa</div>
            <div className="text-2xl font-bold">
              {formatARS(resumen.totales.aporteEconomicoCasaDia)}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Servicios {formatARS(resumen.totales.aporteCasaServicios)}
              {" · "}
              Productos {formatARS(resumen.totales.margenProductos)}
              {" · "}
              Alquiler devengado {formatARS(resumen.totales.alquilerBancoDevengadoDia)}
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        Atenciones: <strong className="text-gray-900">{cierre.cantidadAtenciones ?? 0}</strong>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function formatFechaLarga(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
