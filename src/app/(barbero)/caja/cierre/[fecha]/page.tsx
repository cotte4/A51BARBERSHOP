import { db } from "@/db";
import { barberos, cierresCaja } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "./_PrintButton";

type ResumenBarbero = {
  nombre: string;
  cortes: number;
  totalBruto: number;
  comisionCalculada: number;
  alquilerBancoDiario: number;
};

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

  const resumen = cierre.resumenBarberos as Record<string, ResumenBarbero> | null;

  // Para la casa: neto − suma comisiones barberos
  const totalComisionesBarberos = resumen
    ? Object.values(resumen).reduce((s, b) => s + Number(b.comisionCalculada ?? 0), 0)
    : 0;
  const paraLaCasa = Number(cierre.totalNeto ?? 0) - totalComisionesBarberos;

  // Si es barbero, buscar su barberoId para filtrar
  let barberoIdDelUsuario: string | null = null;
  if (!isAdmin && userId) {
    const [barberoDelUsuario] = await db
      .select({ id: barberos.id })
      .from(barberos)
      .where(eq(barberos.userId, userId))
      .limit(1);
    barberoIdDelUsuario = barberoDelUsuario?.id ?? null;
  }

  // Filtrar resumen para mostrar
  const resumenFiltrado: Record<string, ResumenBarbero> = resumen
    ? isAdmin
      ? resumen
      : barberoIdDelUsuario && resumen[barberoIdDelUsuario]
        ? { [barberoIdDelUsuario]: resumen[barberoIdDelUsuario] }
        : {}
    : {};

  // Formatear hora del cierre
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
        <Link href="/caja" className="print:hidden text-gray-400 hover:text-gray-600 text-sm">
          ← Caja
        </Link>
        <h2 className="text-lg font-semibold text-gray-900 mt-1 capitalize">
          Cierre de caja — {formatFechaLarga(fecha)}
        </h2>
      </div>

      {/* Botón imprimir */}
      <div className="print:hidden">
        <PrintButton />
      </div>

      {/* Banner cierre */}
      <div className="bg-gray-900 text-white rounded-xl p-4">
        <div className="text-sm font-semibold">
          ✓ Caja cerrada{horaCierre ? ` a las ${horaCierre}` : ""}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Totales</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total bruto</span>
            <span className="text-gray-900 font-medium">{formatARS(cierre.totalBruto)}</span>
          </div>
          {Number(cierre.totalComisionesMedios ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Comisiones cobradas</span>
              <span className="text-red-600">−{formatARS(cierre.totalComisionesMedios)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-1">
            <span className="text-gray-500">Total neto</span>
            <span className="text-gray-900 font-bold">{formatARS(cierre.totalNeto)}</span>
          </div>
        </div>
      </div>

      {/* Por barbero */}
      {Object.keys(resumenFiltrado).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Por barbero</h3>
          <div className="flex flex-col gap-3">
            {Object.values(resumenFiltrado).map((b) => (
              <div key={b.nombre} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">{b.nombre}</span>
                  <span className="text-gray-500">
                    {b.cortes} {b.cortes === 1 ? "corte" : "cortes"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 mt-0.5">
                  <span>Bruto: {formatARS(b.totalBruto)}</span>
                  <span>Comisión: {formatARS(b.comisionCalculada)}</span>
                </div>
                {b.alquilerBancoDiario > 0 && (
                  <div className="text-gray-400 text-xs mt-0.5">
                    Alquiler banco/día (referencia): {formatARS(b.alquilerBancoDiario)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Para la casa (solo admin) */}
      {isAdmin && (
        <div className="bg-gray-900 text-white rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">Para la casa</div>
          <div className="text-2xl font-bold">{formatARS(paraLaCasa)}</div>
          <div className="text-xs text-gray-400 mt-1">
            Neto {formatARS(cierre.totalNeto)} − comisiones barberos{" "}
            {formatARS(totalComisionesBarberos)}
          </div>
        </div>
      )}

      {/* Atenciones */}
      <div className="text-sm text-gray-500">
        Atenciones:{" "}
        <strong className="text-gray-900">{cierre.cantidadAtenciones ?? 0}</strong>
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

// ─── Helpers ─────────────────────────────────────────

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
