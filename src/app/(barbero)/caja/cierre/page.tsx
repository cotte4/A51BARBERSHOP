import { db } from "@/db";
import {
  atenciones,
  barberos,
  cierresCaja,
  mediosPago,
  productos,
  stockMovimientos,
} from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { buildCierreResumen } from "@/lib/caja-finance";
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

  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) redirect(`/caja/cierre/${fechaHoy}`);

  const atencionesDelDia = await db
    .select()
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

  const atencionesAnuladas = await db
    .select({ id: atenciones.id })
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, true)));

  const mediosPagoList = await db.select().from(mediosPago);
  const mediosPagoMap = new Map(mediosPagoList.map((medio) => [medio.id, medio]));
  const barberosList = await db.select().from(barberos);

  const inicioDia = new Date(fechaHoy + "T00:00:00-03:00");
  const finDia = new Date(fechaHoy + "T23:59:59-03:00");
  const ventasProductosDelDia = await db
    .select()
    .from(stockMovimientos)
    .where(
      and(
        eq(stockMovimientos.tipo, "venta"),
        gte(stockMovimientos.fecha, inicioDia),
        lte(stockMovimientos.fecha, finDia)
      )
    );
  const productosList = ventasProductosDelDia.length > 0 ? await db.select().from(productos) : [];

  const cierreResumen = buildCierreResumen({
    fecha: fechaHoy,
    atenciones: atencionesDelDia,
    barberos: barberosList,
    ventasProductos: ventasProductosDelDia.map((venta) => ({
      productoId: venta.productoId,
      cantidad: venta.cantidad,
      precioUnitario: venta.precioUnitario,
      medioPagoId: venta.notas,
    })),
    productos: productosList,
    mediosPago: mediosPagoList,
  });

  const totalesPorMedio: Record<string, { nombre: string; bruto: number; comision: number }> = {};

  for (const atencion of atencionesDelDia) {
    if (!atencion.medioPagoId) continue;
    const medioPago = mediosPagoMap.get(atencion.medioPagoId);
    if (!medioPago) continue;
    const nombre = medioPago.nombre ?? "Otro";
    if (!totalesPorMedio[nombre]) {
      totalesPorMedio[nombre] = { nombre, bruto: 0, comision: 0 };
    }
    totalesPorMedio[nombre].bruto += Number(atencion.precioCobrado ?? 0);
    totalesPorMedio[nombre].comision += Number(atencion.comisionMedioPagoMonto ?? 0);
  }

  for (const venta of ventasProductosDelDia) {
    if (!venta.notas) continue;
    const medioPago = mediosPagoMap.get(venta.notas);
    if (!medioPago) continue;
    const nombre = medioPago.nombre ?? "Otro";
    const bruto = Math.abs(Number(venta.cantidad ?? 0)) * Number(venta.precioUnitario ?? 0);
    const comision = bruto * (Number(medioPago.comisionPorcentaje ?? 0) / 100);
    if (!totalesPorMedio[nombre]) {
      totalesPorMedio[nombre] = { nombre, bruto: 0, comision: 0 };
    }
    totalesPorMedio[nombre].bruto += bruto;
    totalesPorMedio[nombre].comision += comision;
  }

  const totalEfectivo = Object.entries(totalesPorMedio)
    .filter(([nombre]) => nombre.toLowerCase().includes("efectivo"))
    .reduce((sum, [, datos]) => sum + datos.bruto - datos.comision, 0);

  const barberosMap = new Map(barberosList.map((barbero) => [barbero.id, barbero]));
  const resumenPorBarbero: Record<
    string,
    { nombre: string; cortes: number; bruto: number; comision: number; alquilerDiario: number }
  > = {};

  for (const atencion of atencionesDelDia) {
    if (!atencion.barberoId) continue;
    const barbero = barberosMap.get(atencion.barberoId);
    if (!barbero) continue;
    if (!resumenPorBarbero[atencion.barberoId]) {
      resumenPorBarbero[atencion.barberoId] = {
        nombre: barbero.nombre,
        cortes: 0,
        bruto: 0,
        comision: 0,
        alquilerDiario:
          barbero.tipoModelo === "hibrido"
            ? Number(barbero.alquilerBancoMensual ?? 0) / getDaysInMonth(fechaHoy)
            : 0,
      };
    }
    resumenPorBarbero[atencion.barberoId].cortes += 1;
    resumenPorBarbero[atencion.barberoId].bruto += Number(atencion.precioCobrado ?? 0);
    resumenPorBarbero[atencion.barberoId].comision += Number(atencion.comisionBarberoMonto ?? 0);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/caja" className="text-sm text-gray-400 hover:text-gray-600">
          {"<- Caja"}
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-gray-900">
          Cierre - {formatFechaLarga(fechaHoy)}
        </h2>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Ingresos por medio de pago</h3>
        {Object.values(totalesPorMedio).length === 0 ? (
          <p className="text-sm text-gray-400">Sin movimientos registrados hoy.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.values(totalesPorMedio).map((medio) => (
              <div key={medio.nombre} className="flex justify-between text-sm">
                <span className="text-gray-500">{medio.nombre}</span>
                <span className="font-medium text-gray-900">
                  {formatARS(medio.bruto)}
                  {medio.comision > 0 && (
                    <span className="font-normal text-gray-400">
                      {" -> "} {formatARS(medio.bruto - medio.comision)} neto
                    </span>
                  )}
                </span>
              </div>
            ))}

            <div className="mt-1 flex flex-col gap-1 border-t border-gray-100 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total bruto del dia</span>
                <span className="font-semibold text-gray-900">
                  {formatARS(cierreResumen.totales.totalBrutoDia)}
                </span>
              </div>
              {cierreResumen.totales.totalComisionesMediosDia > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Comisiones medios de pago</span>
                  <span className="text-red-600">
                    -{formatARS(cierreResumen.totales.totalComisionesMediosDia)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Caja neta del dia</span>
                <span className="font-bold text-gray-900">
                  {formatARS(cierreResumen.totales.cajaNetaDia)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Por barbero</h3>
        {Object.values(resumenPorBarbero).length === 0 ? (
          <p className="text-sm text-gray-400">Sin atenciones.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.values(resumenPorBarbero).map((barbero) => (
              <div key={barbero.nombre} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">{barbero.nombre}</span>
                  <span className="text-gray-500">
                    {barbero.cortes} {barbero.cortes === 1 ? "corte" : "cortes"}
                  </span>
                </div>
                <div className="mt-0.5 flex justify-between text-gray-500">
                  <span>Bruto: {formatARS(barbero.bruto)}</span>
                  <span>Su comision: {formatARS(barbero.comision)}</span>
                </div>
                {barbero.alquilerDiario > 0 && (
                  <div className="mt-0.5 text-xs text-gray-400">
                    Alquiler banco/dia devengado: {formatARS(barbero.alquilerDiario)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 text-sm text-gray-500">Caja neta del dia</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatARS(cierreResumen.totales.cajaNetaDia)}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Servicios {formatARS(cierreResumen.totales.cajaNetaServicios)}
            {" · "}
            Productos {formatARS(cierreResumen.totales.cajaNetaProductos)}
          </div>
        </div>
        <div className="rounded-xl bg-gray-900 p-4 text-white">
          <div className="mb-1 text-sm text-gray-400">Aporte economico casa hoy</div>
          <div className="text-2xl font-bold">
            {formatARS(cierreResumen.totales.aporteEconomicoCasaDia)}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Servicios {formatARS(cierreResumen.totales.aporteCasaServicios)}
            {" · "}
            Productos {formatARS(cierreResumen.totales.margenProductos)}
            {" · "}
            Alquiler devengado {formatARS(cierreResumen.totales.alquilerBancoDevengadoDia)}
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-gray-500">
        <span>
          Atenciones: <strong className="text-gray-900">{atencionesDelDia.length}</strong>
        </span>
        {ventasProductosDelDia.length > 0 && (
          <span>
            Ventas productos:{" "}
            <strong className="text-gray-900">{ventasProductosDelDia.length}</strong>
          </span>
        )}
        {atencionesAnuladas.length > 0 && (
          <span>
            Anuladas: <strong className="text-gray-900">{atencionesAnuladas.length}</strong>
          </span>
        )}
      </div>

      {totalEfectivo > 0 && <EfectivoChecker totalEfectivoSistema={totalEfectivo} />}

      <CerrarCajaButton cerrarAction={cerrarCaja} />

      <Link href="/caja" className="text-center text-sm text-gray-400 hover:text-gray-600">
        Cancelar
      </Link>
    </div>
  );
}

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

function getDaysInMonth(fecha: string): number {
  const [year, month] = fecha.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function formatFechaLarga(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
