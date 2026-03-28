import { db } from "@/db";
import { atenciones, barberos, mediosPago, cierresCaja } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import CerrarCajaButton from "@/components/caja/CerrarCajaButton";
import EfectivoChecker from "@/components/caja/EfectivoChecker";
import { cerrarCaja } from "../actions";

export default async function CierrePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") redirect("/caja");

  const fechaHoy = getFechaHoy();

  // Si ya hay cierre hoy → redirigir a la vista
  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) redirect(`/caja/cierre/${fechaHoy}`);

  // Calcular preview
  const atencionesDelDia = await db
    .select()
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

  const atencionesAnuladas = await db
    .select({ id: atenciones.id })
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, true)));

  // Totales
  const totalBruto = atencionesDelDia.reduce((s, a) => s + Number(a.precioCobrado ?? 0), 0);
  const totalComisionesMp = atencionesDelDia.reduce((s, a) => s + Number(a.comisionMedioPagoMonto ?? 0), 0);
  const totalNeto = atencionesDelDia.reduce((s, a) => s + Number(a.montoNeto ?? 0), 0);
  const totalComisionesBarberos = atencionesDelDia.reduce((s, a) => s + Number(a.comisionBarberoMonto ?? 0), 0);
  const paraLaCasa = totalNeto - totalComisionesBarberos;

  // Por medio de pago
  const mediosPagoList = await db.select().from(mediosPago);
  const mediosPagoMap = new Map(mediosPagoList.map((m) => [m.id, m]));
  const totalesPorMedio: Record<string, { nombre: string; bruto: number; comision: number }> = {};
  for (const a of atencionesDelDia) {
    if (!a.medioPagoId) continue;
    const mp = mediosPagoMap.get(a.medioPagoId);
    if (!mp) continue;
    const nombre = mp.nombre ?? "Otro";
    if (!totalesPorMedio[nombre]) totalesPorMedio[nombre] = { nombre, bruto: 0, comision: 0 };
    totalesPorMedio[nombre].bruto += Number(a.precioCobrado ?? 0);
    totalesPorMedio[nombre].comision += Number(a.comisionMedioPagoMonto ?? 0);
  }

  // Total efectivo (medio de pago "Efectivo")
  const totalEfectivo = Object.entries(totalesPorMedio)
    .filter(([nombre]) => nombre.toLowerCase().includes("efectivo"))
    .reduce((s, [, datos]) => s + datos.bruto - datos.comision, 0);

  // Por barbero
  const barberosMap = new Map((await db.select().from(barberos)).map((b) => [b.id, b]));
  const resumenPorBarbero: Record<
    string,
    { nombre: string; cortes: number; bruto: number; comision: number; alquilerDiario: number }
  > = {};
  for (const a of atencionesDelDia) {
    if (!a.barberoId) continue;
    const b = barberosMap.get(a.barberoId);
    if (!b) continue;
    if (!resumenPorBarbero[a.barberoId]) {
      resumenPorBarbero[a.barberoId] = {
        nombre: b.nombre,
        cortes: 0,
        bruto: 0,
        comision: 0,
        alquilerDiario:
          b.tipoModelo === "hibrido" ? Number(b.alquilerBancoMensual ?? 0) / 30 : 0,
      };
    }
    resumenPorBarbero[a.barberoId].cortes += 1;
    resumenPorBarbero[a.barberoId].bruto += Number(a.precioCobrado ?? 0);
    resumenPorBarbero[a.barberoId].comision += Number(a.comisionBarberoMonto ?? 0);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/caja" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Caja
        </Link>
        <h2 className="text-lg font-semibold text-gray-900 mt-1">
          Cierre — {formatFechaLarga(fechaHoy)}
        </h2>
      </div>

      {/* Por medio de pago */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ingresos por medio de pago</h3>
        {Object.values(totalesPorMedio).length === 0 ? (
          <p className="text-sm text-gray-400">Sin atenciones registradas hoy.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.values(totalesPorMedio).map((mp) => (
              <div key={mp.nombre} className="flex justify-between text-sm">
                <span className="text-gray-500">{mp.nombre}</span>
                <span className="text-gray-900 font-medium">
                  {formatARS(mp.bruto)}
                  {mp.comision > 0 && (
                    <span className="text-gray-400 font-normal">
                      {" "}→ {formatARS(mp.bruto - mp.comision)} neto
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-1 flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total bruto</span>
                <span className="font-semibold text-gray-900">{formatARS(totalBruto)}</span>
              </div>
              {totalComisionesMp > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Comisiones cobradas</span>
                  <span className="text-red-600">−{formatARS(totalComisionesMp)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total neto</span>
                <span className="font-bold text-gray-900">{formatARS(totalNeto)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Por barbero */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Por barbero</h3>
        {Object.values(resumenPorBarbero).length === 0 ? (
          <p className="text-sm text-gray-400">Sin atenciones.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.values(resumenPorBarbero).map((b) => (
              <div key={b.nombre} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">{b.nombre}</span>
                  <span className="text-gray-500">
                    {b.cortes} {b.cortes === 1 ? "corte" : "cortes"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 mt-0.5">
                  <span>Bruto: {formatARS(b.bruto)}</span>
                  <span>Su comisión: {formatARS(b.comision)}</span>
                </div>
                {b.alquilerDiario > 0 && (
                  <div className="text-gray-400 text-xs mt-0.5">
                    Alquiler banco/día (referencia): {formatARS(b.alquilerDiario)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Para la casa */}
      <div className="bg-gray-900 text-white rounded-xl p-4">
        <div className="text-sm text-gray-400 mb-1">Para la casa hoy</div>
        <div className="text-2xl font-bold">{formatARS(paraLaCasa)}</div>
        <div className="text-xs text-gray-400 mt-1">
          Neto {formatARS(totalNeto)} − comisiones barberos {formatARS(totalComisionesBarberos)}
        </div>
      </div>

      {/* Resumen */}
      <div className="text-sm text-gray-500 flex gap-4">
        <span>
          Atenciones: <strong className="text-gray-900">{atencionesDelDia.length}</strong>
        </span>
        {atencionesAnuladas.length > 0 && (
          <span>
            Anuladas: <strong className="text-gray-900">{atencionesAnuladas.length}</strong>
          </span>
        )}
      </div>

      {/* Verificación efectivo físico vs sistema */}
      {totalEfectivo > 0 && (
        <EfectivoChecker totalEfectivoSistema={totalEfectivo} />
      )}

      {/* Botón de confirmación */}
      <CerrarCajaButton cerrarAction={cerrarCaja} />

      <Link href="/caja" className="text-center text-sm text-gray-400 hover:text-gray-600">
        Cancelar
      </Link>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

function getFechaHoy(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatFechaLarga(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
