import { db } from "@/db";
import {
  atenciones,
  barberos,
  cierresCaja,
  gastos,
  temporadas,
  repagoMemas,
  stockMovimientos,
  productos,
  configuracionNegocio,
} from "@/db/schema";
import { and, eq, gte, lte, sum, count, avg, isNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { toNumber, getDaysInMonth } from "./caja-finance";

// ————————————————————————————
// Utilidades internas
// ————————————————————————————

function fechasDelMes(mes: number, anio: number): { inicio: string; fin: string } {
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fin };
}

function getFechaHoy(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

// ————————————————————————————
// KPIs del día actual
// ————————————————————————————

export async function getKpisDia(): Promise<{
  fechaHoy: string;
  atencionesHoy: number;
  atencionesGabote: number;
  atencionesPinky: number;
  cajaNeta: number;
  aporteEconomicoCasa: number;
  cierreRealizado: boolean;
}> {
  const fechaHoy = getFechaHoy();

  // Barberos con roles
  const listaBarberos = await db.select().from(barberos);
  const gaboteIds = listaBarberos
    .filter((b) => b.rol === "barbero")
    .map((b) => b.id);
  const pinkyIds = listaBarberos
    .filter((b) => b.rol === "admin")
    .map((b) => b.id);

  // Atenciones del día (no anuladas)
  const atencionesDia = await db
    .select({
      barberoId: atenciones.barberoId,
      precioCobrado: atenciones.precioCobrado,
      comisionBarberoMonto: atenciones.comisionBarberoMonto,
      comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
      montoNeto: atenciones.montoNeto,
    })
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

  let cajaNeta = 0;
  let aporteEconomicoCasa = 0;
  let atencionesGabote = 0;
  let atencionesPinky = 0;

  for (const a of atencionesDia) {
    cajaNeta += toNumber(a.montoNeto);
    if (a.barberoId && gaboteIds.includes(a.barberoId)) {
      atencionesGabote++;
      const aporte =
        toNumber(a.precioCobrado) -
        toNumber(a.comisionBarberoMonto) -
        toNumber(a.comisionMedioPagoMonto);
      aporteEconomicoCasa += aporte;
    } else if (a.barberoId && pinkyIds.includes(a.barberoId)) {
      atencionesPinky++;
    }
  }

  // Cierre realizado hoy
  const [cierre] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  return {
    fechaHoy,
    atencionesHoy: atencionesDia.length,
    atencionesGabote,
    atencionesPinky,
    cajaNeta,
    aporteEconomicoCasa,
    cierreRealizado: !!cierre,
  };
}

// ————————————————————————————
// KPIs del mes
// ————————————————————————————

export async function getKpisMes(
  mes: number,
  anio: number
): Promise<{
  atencionesTotales: number;
  resultadoCasaMes: number;
  resultadoPinkyMes: number;
  saldoMemasPendiente: number;
}> {
  const { inicio, fin } = fechasDelMes(mes, anio);

  const listaBarberos = await db.select().from(barberos);
  const gaboteIds = listaBarberos.filter((b) => b.rol === "barbero").map((b) => b.id);
  const pinkyIds = listaBarberos.filter((b) => b.rol === "admin").map((b) => b.id);

  // Atenciones del mes
  const atencionesMes = await db
    .select({
      barberoId: atenciones.barberoId,
      precioCobrado: atenciones.precioCobrado,
      comisionBarberoMonto: atenciones.comisionBarberoMonto,
      comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
      montoNeto: atenciones.montoNeto,
    })
    .from(atenciones)
    .where(
      and(
        gte(atenciones.fecha, inicio),
        lte(atenciones.fecha, fin),
        eq(atenciones.anulado, false)
      )
    );

  let aporteCasaGabote = 0;
  let ingresosNetosPinky = 0;

  for (const a of atencionesMes) {
    if (a.barberoId && gaboteIds.includes(a.barberoId)) {
      aporteCasaGabote +=
        toNumber(a.precioCobrado) -
        toNumber(a.comisionBarberoMonto) -
        toNumber(a.comisionMedioPagoMonto);
    } else if (a.barberoId && pinkyIds.includes(a.barberoId)) {
      ingresosNetosPinky +=
        toNumber(a.precioCobrado) - toNumber(a.comisionMedioPagoMonto);
    }
  }

  // Margen de productos del mes
  const ventasMes = await db
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
        gte(
          sql`DATE(${stockMovimientos.fecha})`,
          sql`${inicio}::date`
        ),
        lte(
          sql`DATE(${stockMovimientos.fecha})`,
          sql`${fin}::date`
        )
      )
    );

  const productosMap = new Map(
    (await db.select({ id: productos.id, costoCompra: productos.costoCompra }).from(productos)).map(
      (p) => [p.id, p]
    )
  );

  let margenProductosMes = 0;
  for (const v of ventasMes) {
    const cant = Math.abs(Number(v.cantidad ?? 0));
    const precio = toNumber(v.precioUnitario);
    // Usa el snapshot histórico del costo; fallback al costo actual para filas anteriores a esta feature.
    const costoSnap = toNumber(v.costoUnitarioSnapshot);
    const prod = v.productoId ? productosMap.get(v.productoId) : undefined;
    const costo = costoSnap > 0 ? costoSnap : toNumber(prod?.costoCompra);
    margenProductosMes += cant * (precio - costo);
  }

  // Gastos del mes
  const gastosMes = await db
    .select({ monto: gastos.monto })
    .from(gastos)
    .where(and(gte(gastos.fecha, inicio), lte(gastos.fecha, fin)));

  const gastosFijosMes = gastosMes.reduce((s, g) => s + toNumber(g.monto), 0);

  // Resultado casa
  const resultadoCasaMes =
    aporteCasaGabote + margenProductosMes - gastosFijosMes;

  // Cuota Memas
  const [repago] = await db
    .select({ cuotaMensual: repagoMemas.cuotaMensual, pagadoCompleto: repagoMemas.pagadoCompleto, saldoPendiente: repagoMemas.saldoPendiente })
    .from(repagoMemas)
    .limit(1);

  const cuotaMemasMes =
    repago && !repago.pagadoCompleto ? toNumber(repago.cuotaMensual) : 0;
  const saldoMemasPendiente = repago ? toNumber(repago.saldoPendiente) : 0;

  const resultadoPinkyMes = ingresosNetosPinky + resultadoCasaMes - cuotaMemasMes;

  return {
    atencionesTotales: atencionesMes.length,
    resultadoCasaMes,
    resultadoPinkyMes,
    saldoMemasPendiente,
  };
}

// ————————————————————————————
// P&L mensual detallado
// ————————————————————————————

export async function getPL(
  mes: number,
  anio: number
): Promise<{
  ingresosGaboteBruto: number;
  comisionesGabote: number;
  comisionGabotePct: number;
  feesMedioPagoGabote: number;
  margenProductosMes: number;
  ingresosCasaGabote: number;
  gastosFijosMes: number;
  resultadoCasa: number;
  ingresosNetosPinky: number;
  cuotaMemasMes: number;
  resultadoPersonalPinky: number;
}> {
  const { inicio, fin } = fechasDelMes(mes, anio);

  const listaBarberos = await db.select().from(barberos);
  const gaboteIds = listaBarberos.filter((b) => b.rol === "barbero").map((b) => b.id);
  const pinkyIds = listaBarberos.filter((b) => b.rol === "admin").map((b) => b.id);

  const comisionGabotePct = listaBarberos
    .filter((b) => b.rol === "barbero")
    .reduce((max, b) => Math.max(max, toNumber(b.porcentajeComision)), 0);

  const atencionesMes = await db
    .select({
      barberoId: atenciones.barberoId,
      precioCobrado: atenciones.precioCobrado,
      comisionBarberoMonto: atenciones.comisionBarberoMonto,
      comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
    })
    .from(atenciones)
    .where(
      and(
        gte(atenciones.fecha, inicio),
        lte(atenciones.fecha, fin),
        eq(atenciones.anulado, false)
      )
    );

  let ingresosGaboteBruto = 0;
  let comisionesGabote = 0;
  // Solo fees de Gabote — para que el subtotal "Ingresos casa" cuadre aritméticamente.
  // Los fees de Pinky ya están descontados en ingresosNetosPinky.
  let feesMedioPagoGabote = 0;
  let ingresosCasaGabote = 0;
  let ingresosNetosPinky = 0;

  for (const a of atencionesMes) {
    if (a.barberoId && gaboteIds.includes(a.barberoId)) {
      ingresosGaboteBruto += toNumber(a.precioCobrado);
      comisionesGabote += toNumber(a.comisionBarberoMonto);
      feesMedioPagoGabote += toNumber(a.comisionMedioPagoMonto);
      ingresosCasaGabote +=
        toNumber(a.precioCobrado) -
        toNumber(a.comisionBarberoMonto) -
        toNumber(a.comisionMedioPagoMonto);
    } else if (a.barberoId && pinkyIds.includes(a.barberoId)) {
      ingresosNetosPinky +=
        toNumber(a.precioCobrado) - toNumber(a.comisionMedioPagoMonto);
    }
  }

  // Margen de productos
  const ventasMes = await db
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

  const productosMap = new Map(
    (
      await db.select({ id: productos.id, costoCompra: productos.costoCompra }).from(productos)
    ).map((p) => [p.id, p])
  );

  let margenProductosMes = 0;
  for (const v of ventasMes) {
    const cant = Math.abs(Number(v.cantidad ?? 0));
    const precio = toNumber(v.precioUnitario);
    // Usa el snapshot histórico del costo; fallback al costo actual para filas anteriores a esta feature.
    const costoSnap = toNumber(v.costoUnitarioSnapshot);
    const prod = v.productoId ? productosMap.get(v.productoId) : undefined;
    const costo = costoSnap > 0 ? costoSnap : toNumber(prod?.costoCompra);
    margenProductosMes += cant * (precio - costo);
  }

  // Gastos
  const gastosMes = await db
    .select({ monto: gastos.monto })
    .from(gastos)
    .where(and(gte(gastos.fecha, inicio), lte(gastos.fecha, fin)));

  const gastosFijosMes = gastosMes.reduce((s, g) => s + toNumber(g.monto), 0);

  const resultadoCasa =
    ingresosCasaGabote + margenProductosMes - gastosFijosMes;

  // Cuota Memas
  const [repago] = await db
    .select({ cuotaMensual: repagoMemas.cuotaMensual, pagadoCompleto: repagoMemas.pagadoCompleto })
    .from(repagoMemas)
    .limit(1);

  const cuotaMemasMes =
    repago && !repago.pagadoCompleto ? toNumber(repago.cuotaMensual) : 0;

  const resultadoPersonalPinky = ingresosNetosPinky + resultadoCasa - cuotaMemasMes;

  return {
    ingresosGaboteBruto,
    comisionesGabote,
    comisionGabotePct,
    feesMedioPagoGabote,
    margenProductosMes,
    ingresosCasaGabote,
    gastosFijosMes,
    resultadoCasa,
    ingresosNetosPinky,
    cuotaMemasMes,
    resultadoPersonalPinky,
  };
}

// ————————————————————————————
// Flujo mensual
// ————————————————————————————

export async function getFlujoMensual(
  mes: number,
  anio: number
): Promise<
  Array<{
    fecha: string;
    ingresos: number;
    egresos: number;
    saldoDia: number;
    saldoAcumulado: number;
  }>
> {
  const { inicio, fin } = fechasDelMes(mes, anio);
  const ultimoDia = new Date(anio, mes, 0).getDate();

  // Cierres de caja del mes: totalNeto por fecha
  const cierresMes = await db
    .select({ fecha: cierresCaja.fecha, totalNeto: cierresCaja.totalNeto })
    .from(cierresCaja)
    .where(and(gte(cierresCaja.fecha, inicio), lte(cierresCaja.fecha, fin)));

  const cierresPorFecha = new Map<string, number>();
  for (const c of cierresMes) {
    if (c.fecha) {
      cierresPorFecha.set(c.fecha, toNumber(c.totalNeto));
    }
  }

  // Gastos del mes por fecha
  const gastosMes = await db
    .select({ fecha: gastos.fecha, monto: gastos.monto })
    .from(gastos)
    .where(and(gte(gastos.fecha, inicio), lte(gastos.fecha, fin)));

  const gastosPorFecha = new Map<string, number>();
  for (const g of gastosMes) {
    if (g.fecha) {
      const prev = gastosPorFecha.get(g.fecha) ?? 0;
      gastosPorFecha.set(g.fecha, prev + toNumber(g.monto));
    }
  }

  // Generar todos los días del mes
  const resultado: Array<{
    fecha: string;
    ingresos: number;
    egresos: number;
    saldoDia: number;
    saldoAcumulado: number;
  }> = [];

  let saldoAcumulado = 0;

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const ingresos = cierresPorFecha.get(fecha) ?? 0;
    const egresos = gastosPorFecha.get(fecha) ?? 0;
    const saldoDia = ingresos - egresos;
    saldoAcumulado += saldoDia;

    resultado.push({ fecha, ingresos, egresos, saldoDia, saldoAcumulado });
  }

  return resultado;
}

// ————————————————————————————
// Comparativa de temporadas
// ————————————————————————————

export async function getComparativaTemporadas(): Promise<
  Array<{
    id: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    cortesDiaProyectados: number;
    precioBaseProyectado: number;
    cortesDiaReal: number | null;
    precioPromedioReal: number | null;
    ingresoCasaProyectado: number;
    ingresoCasaReal: number | null;
    desviacionPct: number | null;
    estado: "futura" | "activa" | "completada";
  }>
> {
  const listaTemporadas = await db.select().from(temporadas);
  const hoy = getFechaHoy();

  const listaBarberos = await db.select({ id: barberos.id, rol: barberos.rol }).from(barberos);
  const gaboteIds = listaBarberos.filter((b) => b.rol === "barbero").map((b) => b.id);

  // Pre-fetch all atenciones for non-future seasons in a single query to avoid N+1.
  const temporadasActivas = listaTemporadas.filter(
    (t) => (t.fechaInicio ?? "") <= hoy
  );
  let todasAtenciones: Array<{
    fecha: string | null;
    precioCobrado: string | null;
    comisionBarberoMonto: string | null;
    comisionMedioPagoMonto: string | null;
    barberoId: string | null;
  }> = [];
  if (temporadasActivas.length > 0) {
    const globalStart = temporadasActivas
      .map((t) => t.fechaInicio ?? "")
      .filter(Boolean)
      .sort()[0];
    const globalEnd = temporadasActivas
      .map((t) => t.fechaFin ?? "")
      .filter(Boolean)
      .sort()
      .at(-1) ?? hoy;
    todasAtenciones = await db
      .select({
        fecha: atenciones.fecha,
        precioCobrado: atenciones.precioCobrado,
        comisionBarberoMonto: atenciones.comisionBarberoMonto,
        comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
        barberoId: atenciones.barberoId,
      })
      .from(atenciones)
      .where(
        and(
          gte(atenciones.fecha, globalStart),
          lte(atenciones.fecha, globalEnd),
          eq(atenciones.anulado, false)
        )
      );
  }

  const resultado = [];

  for (const temp of listaTemporadas) {
    const nombre = temp.nombre ?? "Sin nombre";
    const fechaInicio = temp.fechaInicio ?? "";
    const fechaFin = temp.fechaFin ?? "";
    const cortesDiaProyectados = temp.cortesDiaProyectados ?? 0;
    const precioBaseProyectado = toNumber(temp.precioBaseProyectado);

    // Estado
    let estado: "futura" | "activa" | "completada";
    if (fechaInicio > hoy) {
      estado = "futura";
    } else if (fechaFin >= hoy) {
      estado = "activa";
    } else {
      estado = "completada";
    }

    // Días totales de la temporada
    const msInicio = new Date(fechaInicio + "T12:00:00").getTime();
    const msFin = new Date(fechaFin + "T12:00:00").getTime();
    const diasTemporada = Math.max(1, Math.round((msFin - msInicio) / (1000 * 60 * 60 * 24)) + 1);

    // Ingreso casa proyectado: cortes/día * precio * 25% * días
    const ingresoCasaProyectado =
      cortesDiaProyectados * precioBaseProyectado * 0.25 * diasTemporada;

    if (estado === "futura") {
      resultado.push({
        id: temp.id,
        nombre,
        fechaInicio,
        fechaFin,
        cortesDiaProyectados,
        precioBaseProyectado,
        cortesDiaReal: null,
        precioPromedioReal: null,
        ingresoCasaProyectado,
        ingresoCasaReal: null,
        desviacionPct: null,
        estado,
      });
      continue;
    }

    // Filter from the pre-fetched set — no extra DB query per season.
    const atencionesPeriodo = todasAtenciones.filter(
      (a) => a.fecha && a.fecha >= fechaInicio && a.fecha <= fechaFin
    );

    const atencionesGabote = atencionesPeriodo.filter(
      (a) => a.barberoId && gaboteIds.includes(a.barberoId)
    );

    // Días con atenciones de Gabote (para calcular promedio real)
    const diasConAtenciones = new Set(atencionesGabote.map((a) => a.fecha)).size;

    let cortesDiaReal: number | null = null;
    let precioPromedioReal: number | null = null;
    let ingresoCasaReal: number | null = null;
    let desviacionPct: number | null = null;

    if (atencionesGabote.length > 0 && diasConAtenciones > 0) {
      cortesDiaReal = atencionesGabote.length / diasConAtenciones;
      precioPromedioReal =
        atencionesGabote.reduce((s, a) => s + toNumber(a.precioCobrado), 0) /
        atencionesGabote.length;
      ingresoCasaReal = atencionesGabote.reduce(
        (s, a) =>
          s +
          toNumber(a.precioCobrado) -
          toNumber(a.comisionBarberoMonto) -
          toNumber(a.comisionMedioPagoMonto),
        0
      );

      if (ingresoCasaProyectado > 0) {
        desviacionPct =
          ((ingresoCasaReal - ingresoCasaProyectado) / ingresoCasaProyectado) * 100;
      }
    }

    resultado.push({
      id: temp.id,
      nombre,
      fechaInicio,
      fechaFin,
      cortesDiaProyectados,
      precioBaseProyectado,
      cortesDiaReal,
      precioPromedioReal,
      ingresoCasaProyectado,
      ingresoCasaReal,
      desviacionPct,
      estado,
    });
  }

  return resultado;
}

// ————————————————————————————
// Datos para BEP
// ————————————————————————————

export async function getDatosBep(): Promise<{
  gastosMesReal: number;
  presupuestoMensual: number;
  precioPromedioDia: number;
  mixGabote: number;
  feePromedioMedioPago: number;
  diasMes: number;
  cortesDiaMes: number;
}> {
  const fechaHoy = getFechaHoy();
  const [anio, mesStr] = fechaHoy.split("-").map(Number);
  const mes = mesStr;
  const { inicio, fin } = fechasDelMes(mes, anio);
  const diasMes = getDaysInMonth(fechaHoy);

  const listaBarberos = await db.select().from(barberos);
  const gaboteIds = listaBarberos.filter((b) => b.rol === "barbero").map((b) => b.id);
  const pinkyIds = listaBarberos.filter((b) => b.rol === "admin").map((b) => b.id);

  // Gastos del mes
  const gastosMes = await db
    .select({ monto: gastos.monto })
    .from(gastos)
    .where(and(gte(gastos.fecha, inicio), lte(gastos.fecha, fin)));
  const gastosMesReal = gastosMes.reduce((s, g) => s + toNumber(g.monto), 0);

  // Presupuesto de configuracion
  const [config] = await db.select().from(configuracionNegocio).limit(1);
  const presupuestoMensual = config?.presupuestoMensualGastos ?? 0;

  // Atenciones del mes para calcular promedios
  const atencionesMes = await db
    .select({
      barberoId: atenciones.barberoId,
      precioCobrado: atenciones.precioCobrado,
      comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
      fecha: atenciones.fecha,
    })
    .from(atenciones)
    .where(
      and(
        gte(atenciones.fecha, inicio),
        lte(atenciones.fecha, fin),
        eq(atenciones.anulado, false)
      )
    );

  const cortesGabote = atencionesMes.filter(
    (a) => a.barberoId && gaboteIds.includes(a.barberoId)
  ).length;
  const cortesPinky = atencionesMes.filter(
    (a) => a.barberoId && pinkyIds.includes(a.barberoId)
  ).length;
  const totalCortes = cortesGabote + cortesPinky;

  const mixGabote = totalCortes > 0 ? cortesGabote / totalCortes : 0.5;

  // Precio promedio (todos los cortes del día)
  const precioPromedioDia =
    atencionesMes.length > 0
      ? atencionesMes.reduce((s, a) => s + toNumber(a.precioCobrado), 0) / atencionesMes.length
      : 0;

  // Fee promedio medio de pago
  const feePromedioMedioPago =
    atencionesMes.length > 0
      ? atencionesMes.reduce((s, a) => {
          const precioCobrado = toNumber(a.precioCobrado);
          if (precioCobrado > 0) {
            return s + toNumber(a.comisionMedioPagoMonto) / precioCobrado;
          }
          return s;
        }, 0) / atencionesMes.length
      : 0;

  // Cortes por día del mes
  const diasConAtenciones = new Set(atencionesMes.map((a) => a.fecha)).size;
  const cortesDiaMes = diasConAtenciones > 0 ? totalCortes / diasConAtenciones : 0;

  return {
    gastosMesReal,
    presupuestoMensual,
    precioPromedioDia,
    mixGabote,
    feePromedioMedioPago,
    diasMes,
    cortesDiaMes,
  };
}
