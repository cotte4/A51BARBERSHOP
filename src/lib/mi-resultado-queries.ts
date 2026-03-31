import { db } from "@/db";
import { atenciones, barberos, gastos, productos, stockMovimientos } from "@/db/schema";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { toNumber } from "@/lib/caja-finance";
import { getPL } from "@/lib/dashboard-queries";
import { getCategoriaGastoRapidoByEmoji } from "@/lib/gastos-rapidos";
import { hasGastosRapidosSchema } from "@/lib/gastos-rapidos-server";

function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function getFechasMesActual() {
  const fechaHoy = getFechaHoyArgentina();
  const [anio, mes] = fechaHoy.split("-").map(Number);
  const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const finMes = `${anio}-${String(mes).padStart(2, "0")}-${String(
    new Date(anio, mes, 0).getDate()
  ).padStart(2, "0")}`;

  return { fechaHoy, anio, mes, inicioMes, finMes };
}

async function getProductoMargin(inicio: string, fin: string) {
  const ventas = await db
    .select({
      productoId: stockMovimientos.productoId,
      cantidad: stockMovimientos.cantidad,
      precioUnitario: stockMovimientos.precioUnitario,
      costoUnitarioSnapshot: stockMovimientos.costoUnitarioSnapshot,
    })
    .from(stockMovimientos)
    .where(
      and(
        eq(stockMovimientos.tipo, "venta"),
        gte(sql`DATE(${stockMovimientos.fecha})`, sql`${inicio}::date`),
        lte(sql`DATE(${stockMovimientos.fecha})`, sql`${fin}::date`)
      )
    );

  if (ventas.length === 0) {
    return 0;
  }

  const productosMap = new Map(
    (
      await db.select({ id: productos.id, costoCompra: productos.costoCompra }).from(productos)
    ).map((producto) => [producto.id, producto])
  );

  return ventas.reduce((acumulado, venta) => {
    const cantidad = Math.abs(Number(venta.cantidad ?? 0));
    const precio = toNumber(venta.precioUnitario);
    const costoSnapshot = toNumber(venta.costoUnitarioSnapshot);
    const producto = venta.productoId ? productosMap.get(venta.productoId) : undefined;
    const costo = costoSnapshot > 0 ? costoSnapshot : toNumber(producto?.costoCompra);

    return acumulado + cantidad * (precio - costo);
  }, 0);
}

async function getQuickExpenses(inicio: string, fin: string) {
  if (!(await hasGastosRapidosSchema())) {
    return { quickExpenses: [], total: 0, totalsByCategory: {} as Record<string, number> };
  }

  const quickExpenses = await db
    .select({
      id: gastos.id,
      descripcion: gastos.descripcion,
      monto: gastos.monto,
      fecha: gastos.fecha,
      categoriaVisual: gastos.categoriaVisual,
      notas: gastos.notas,
      creadoEn: gastos.creadoEn,
    })
    .from(gastos)
    .where(
      and(
        eq(gastos.tipo, "rapido"),
        gte(gastos.fecha, inicio),
        lte(gastos.fecha, fin)
      )
    );

  const total = quickExpenses.reduce((acumulado, gasto) => acumulado + toNumber(gasto.monto), 0);

  const totalsByCategory = quickExpenses.reduce<Record<string, number>>((acumulado, gasto) => {
    const categoria = getCategoriaGastoRapidoByEmoji(gasto.categoriaVisual ?? "");
    const key = categoria?.key ?? "otros";
    acumulado[key] = (acumulado[key] ?? 0) + toNumber(gasto.monto);
    return acumulado;
  }, {});

  return { quickExpenses, total, totalsByCategory };
}

export async function getMiResultadoData() {
  const { fechaHoy, anio, mes, inicioMes, finMes } = getFechasMesActual();
  const gastosRapidosHabilitados = await hasGastosRapidosSchema();

  const [listaBarberos, plMes, margenProductosHoy, margenProductosMes, quickExpensesMes] =
    await Promise.all([
      db.select().from(barberos),
      getPL(mes, anio),
      getProductoMargin(fechaHoy, fechaHoy),
      getProductoMargin(inicioMes, finMes),
      getQuickExpenses(inicioMes, finMes),
    ]);

  const pinkyIds = listaBarberos.filter((barbero) => barbero.rol === "admin").map((barbero) => barbero.id);
  const gaboteIds = listaBarberos
    .filter((barbero) => barbero.rol === "barbero")
    .map((barbero) => barbero.id);

  const [atencionesHoy, atencionesMes, gastosFijosMesRows] = await Promise.all([
    db
      .select({
        barberoId: atenciones.barberoId,
        precioCobrado: atenciones.precioCobrado,
        comisionBarberoMonto: atenciones.comisionBarberoMonto,
        comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
      })
      .from(atenciones)
      .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false))),
    db
      .select({
        barberoId: atenciones.barberoId,
        precioCobrado: atenciones.precioCobrado,
        comisionBarberoMonto: atenciones.comisionBarberoMonto,
        comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
        fecha: atenciones.fecha,
      })
      .from(atenciones)
      .where(
        and(
          gte(atenciones.fecha, inicioMes),
          lte(atenciones.fecha, finMes),
          eq(atenciones.anulado, false)
        )
      ),
    gastosRapidosHabilitados
      ? db
          .select({ monto: gastos.monto })
          .from(gastos)
          .where(
            and(
              gte(gastos.fecha, inicioMes),
              lte(gastos.fecha, finMes),
              or(eq(gastos.tipo, "fijo"), isNull(gastos.tipo))
            )
          )
      : db
          .select({ monto: gastos.monto })
          .from(gastos)
          .where(and(gte(gastos.fecha, inicioMes), lte(gastos.fecha, finMes))),
  ]);

  let tusCortesHoy = 0;
  let aporteCasaServiciosHoy = 0;
  let comisionesHoy = 0;

  for (const atencion of atencionesHoy) {
    const precio = toNumber(atencion.precioCobrado);
    const comisionBarbero = toNumber(atencion.comisionBarberoMonto);
    const comisionMedioPago = toNumber(atencion.comisionMedioPagoMonto);

    comisionesHoy += comisionMedioPago;

    if (atencion.barberoId && pinkyIds.includes(atencion.barberoId)) {
      tusCortesHoy += precio - comisionMedioPago;
    } else if (atencion.barberoId && gaboteIds.includes(atencion.barberoId)) {
      aporteCasaServiciosHoy += precio - comisionBarbero - comisionMedioPago;
    }
  }

  const gastosFijosMes = gastosFijosMesRows.reduce(
    (acumulado, gasto) => acumulado + toNumber(gasto.monto),
    0
  );

  const totalIngresosHoy = tusCortesHoy + aporteCasaServiciosHoy + margenProductosHoy;
  const aporteCasaMes = plMes.ingresosCasaGabote;
  const totalIngresosMes = plMes.ingresosNetosPinky + aporteCasaMes + margenProductosMes;
  const totalEgresosMes =
    gastosFijosMes + quickExpensesMes.total + plMes.feesMedioPagoGabote;

  return {
    fechaHoy,
    mes,
    anio,
    ingresos: {
      totalHoy: totalIngresosHoy,
      totalMes: totalIngresosMes,
      tusCortesHoy,
      tusCortesMes: plMes.ingresosNetosPinky,
      aporteCasaHoy: aporteCasaServiciosHoy,
      aporteCasaMes,
      productosHoy: margenProductosHoy,
      productosMes: margenProductosMes,
    },
    egresos: {
      gastosFijosMes,
      gastosRapidosMes: quickExpensesMes.total,
      comisionesMediosMes: plMes.feesMedioPagoGabote,
      totalMes: totalEgresosMes,
    },
    resultado: {
      paraVosHoy: tusCortesHoy,
      paraVosMes: plMes.ingresosNetosPinky,
      paraLaBarberMes: plMes.resultadoCasa,
    },
    gastosRapidos: {
      habilitados: gastosRapidosHabilitados,
      totalMes: quickExpensesMes.total,
      totalsByCategory: quickExpensesMes.totalsByCategory,
    },
  };
}

export async function getGastosRapidosDelMes() {
  const { fechaHoy, inicioMes, finMes } = getFechasMesActual();
  const { quickExpenses, total, totalsByCategory } = await getQuickExpenses(inicioMes, finMes);

  const ordered = [...quickExpenses].sort((a, b) => {
    const fechaA = a.fecha ?? "";
    const fechaB = b.fecha ?? "";
    if (fechaA !== fechaB) {
      return fechaB.localeCompare(fechaA);
    }
    return new Date(b.creadoEn ?? 0).getTime() - new Date(a.creadoEn ?? 0).getTime();
  });

  return {
    fechaHoy,
    gastos: ordered,
    total,
    totalsByCategory,
  };
}
