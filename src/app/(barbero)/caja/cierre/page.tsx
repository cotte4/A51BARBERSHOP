import Link from "next/link";
import { and, eq, gte, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  gastos,
  liquidaciones,
  mediosPago,
  stockMovimientos,
} from "@/db/schema";
import { formatARS } from "@/lib/format";
import {
  getCajaActorContext,
  getCajaFechaHoyArgentina,
  hasCajaCerrada,
} from "@/lib/dal/caja";
import { cerrarCaja } from "../actions";
import CierreForm from "./_CierreForm";

export default async function CierrePage() {
  const actor = await getCajaActorContext();
  if (!actor?.isAdmin) redirect("/caja");

  const fechaHoy = getFechaHoy();

  if (await hasCajaCerrada(fechaHoy)) redirect(`/caja/cierre/${fechaHoy}`);

  const atencionesDelDia = await db
    .select()
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

  const gastosRapidosDelDia = await db
    .select()
    .from(gastos)
    .where(and(eq(gastos.fecha, fechaHoy), eq(gastos.tipo, "rapido")));
  const totalGastosEfectivoHoy = gastosRapidosDelDia.reduce(
    (sum, gasto) => sum + Number(gasto.monto ?? 0),
    0
  );

  const mediosPagoList = await db.select().from(mediosPago);
  const mediosPagoMap = new Map(mediosPagoList.map((medio) => [medio.id, medio]));
  const barberosList = await db.select().from(barberos);

  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);
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
  const totalBruto = atencionesDelDia.reduce(
    (sum, atencion) => sum + Number(atencion.precioCobrado ?? 0),
    0
  );
  const totalProductos = ventasProductosDelDia.reduce(
    (sum, venta) => sum + -Number(venta.cantidad ?? 0) * Number(venta.precioUnitario ?? 0),
    0
  );
  const totalAtenciones = atencionesDelDia.length;

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
    // fallback: movimientos previos a la migración 0035 guardaban el medio de pago en notas
    const ventaMedioPagoId = venta.medioPagoId ?? venta.notas;
    if (!ventaMedioPagoId) continue;
    const medioPago = mediosPagoMap.get(ventaMedioPagoId);
    if (!medioPago) continue;
    const nombre = medioPago.nombre ?? "Otro";
    const bruto = -Number(venta.cantidad ?? 0) * Number(venta.precioUnitario ?? 0);
    const comision = bruto * (Number(medioPago.comisionPorcentaje ?? 0) / 100);
    if (!totalesPorMedio[nombre]) {
      totalesPorMedio[nombre] = { nombre, bruto: 0, comision: 0 };
    }
    totalesPorMedio[nombre].bruto += bruto;
    totalesPorMedio[nombre].comision += comision;
  }

  const paymentBreakdown = Object.values(totalesPorMedio).sort((a, b) => b.bruto - a.bruto);
  const totalEfectivo = paymentBreakdown
    .filter((medio) => medio.nombre.toLowerCase().includes("efectivo"))
    .reduce((sum, medio) => sum + medio.bruto - medio.comision, 0);

  const resumenPorBarbero: Record<string, { nombre: string; cortes: number; bruto: number; comision: number }> = {};
  for (const atencion of atencionesDelDia) {
    if (!atencion.barberoId) continue;
    const barbero = barberosList.find((item) => item.id === atencion.barberoId);
    if (!barbero) continue;
    if (!resumenPorBarbero[atencion.barberoId]) {
      resumenPorBarbero[atencion.barberoId] = {
        nombre: barbero.nombre,
        cortes: 0,
        bruto: 0,
        comision: 0,
      };
    }
    resumenPorBarbero[atencion.barberoId].cortes += 1;
    resumenPorBarbero[atencion.barberoId].bruto += Number(atencion.precioCobrado ?? 0);
    resumenPorBarbero[atencion.barberoId].comision += Number(atencion.comisionBarberoMonto ?? 0);
  }

  const gaboteEntry = Object.entries(resumenPorBarbero).find(([, resumen]) =>
    resumen.nombre.toLowerCase().includes("gabo")
  );
  const gaboteLiquidacionExistente = gaboteEntry
    ? await db
        .select({ id: liquidaciones.id })
        .from(liquidaciones)
        .where(
          and(
            eq(liquidaciones.barberoId, gaboteEntry[0]),
            eq(liquidaciones.periodoInicio, fechaHoy),
            eq(liquidaciones.periodoFin, fechaHoy)
          )
        )
        .limit(1)
    : [];

  const totalDelDia = totalBruto + totalProductos;

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div>
          <Link href="/caja" className="text-sm text-zinc-400 hover:text-[#8cff59]">
            ← Caja
          </Link>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white">
            Cerrar caja
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            {formatFechaLarga(fechaHoy)} · hoy entraron {formatARS(totalDelDia)} en{" "}
            {totalAtenciones === 1 ? "1 servicio" : `${totalAtenciones} servicios`}
          </p>
        </div>

        <CierreForm
          cerrarAction={cerrarCaja}
          efectivoCobrado={totalEfectivo}
          gastosEfectivoHoy={totalGastosEfectivoHoy}
        />

        {gaboteEntry ? (
          <p className="px-1 text-sm text-zinc-300">
            {gaboteEntry[1].nombre}: {gaboteEntry[1].cortes === 1 ? "1 corte" : `${gaboteEntry[1].cortes} cortes`}{" "}
            hoy, comisión {formatARS(gaboteEntry[1].comision)}.{" "}
            <Link
              href={
                gaboteLiquidacionExistente.length > 0
                  ? `/liquidaciones/${gaboteLiquidacionExistente[0].id}`
                  : `/liquidaciones/nueva?barberoId=${gaboteEntry[0]}&fecha=${fechaHoy}`
              }
              className="font-semibold text-white underline underline-offset-4 hover:text-[#8cff59]"
            >
              {gaboteLiquidacionExistente.length > 0 ? "Ver liquidación" : "Generar liquidación"}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}

function getFechaHoy(): string {
  return getCajaFechaHoyArgentina();
}

function formatFechaLarga(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
