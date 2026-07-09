/**
 * Seed de actividad de prueba — A51 Barber
 *
 * Genera un mes completo de actividad realista (Marzo 2026) para testing:
 * - 20 clientes (5 Marciano, 15 regulares)
 * - ~100 atenciones (Pinky + Gabote)
 * - Ventas de productos
 * - 20 cierres diarios (uno por día hábil)
 * - 8 gastos rápidos
 * - 15 turnos (mix de estados)
 *
 * Edge cases incluidos:
 * - 2 atenciones con comisionBarberoMonto = null
 * - 1 atención con Posnet crédito (3.5%)
 * - 1 Marciano con consumición incluida
 * - 1 día donde Gabote no trabajó
 * - Cambio de precio a mitad del mes
 *
 * Es idempotente: elimina los datos de seed antes de re-insertar.
 * Marcador: notas = 'seed_activity' en atenciones/gastos/turnos
 *            nombre LIKE '[SEED] %' en clientes
 *            nombre LIKE '%(Seed Test)' en productos
 *
 * Cómo correr:
 *   cd a51-barber && npx tsx src/db/seed-activity.ts
 */

import "./load-env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, like } from "drizzle-orm";
import * as schema from "./schema";
import { buildCierreResumen } from "../lib/caja-finance";
import {
  workingDaysOfMonth,
  pickRandom,
  randomInt,
  calcAtencionFinancials,
} from "./seed-helpers";

const TEST_YEAR = 2026;
const TEST_MONTH = 3;
const SEED_MARKER = "seed_activity";
const CLIENT_PREFIX = "[SEED] ";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada");
}

const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient, { schema });

type Barbero = typeof schema.barberos.$inferSelect;
type Cliente = typeof schema.clients.$inferSelect;
type Atencion = typeof schema.atenciones.$inferSelect;
type MedioPago = typeof schema.mediosPago.$inferSelect;
type Producto = typeof schema.productos.$inferSelect;

async function cleanup(workingDays: string[]) {
  console.log("  Limpiando datos de seed previos...");

  await Promise.all([
    db.delete(schema.turnos).where(eq(schema.turnos.notaCliente, SEED_MARKER)),
    db.delete(schema.atenciones).where(eq(schema.atenciones.notas, SEED_MARKER)),
    workingDays.length > 0
      ? db.delete(schema.cierresCaja).where(inArray(schema.cierresCaja.fecha, workingDays))
      : Promise.resolve(),
    db.delete(schema.gastos).where(eq(schema.gastos.notas, SEED_MARKER)),
    db.delete(schema.clients).where(like(schema.clients.name, `${CLIENT_PREFIX}%`)),
    db.delete(schema.productos).where(like(schema.productos.nombre, "%(Seed Test)")),
  ]);

  console.log("  ✓ Limpieza completada");
}

async function createOrFindProducto(
  nombre: string,
  values: Omit<typeof schema.productos.$inferInsert, "id">
): Promise<Producto> {
  const [inserted] = await db
    .insert(schema.productos)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  return (await db.query.productos.findFirst({
    where: (p, { eq: eqFn }) => eqFn(p.nombre, nombre),
  }))!;
}

async function main() {
  console.log("Iniciando seed de actividad A51 Barber...\n");

  const [pinkyBarbero, gaboteBarbero, pinkyUser, allServicios, allMediosPago] =
    await Promise.all([
      db.query.barberos.findFirst({ where: (b, { eq: eqFn }) => eqFn(b.nombre, "Pinky") }),
      db.query.barberos.findFirst({ where: (b, { eq: eqFn }) => eqFn(b.nombre, "Gabote") }),
      db.query.user.findFirst({ where: (u, { eq: eqFn }) => eqFn(u.email, "pinky@a51barber.com") }),
      db.select().from(schema.servicios).where(eq(schema.servicios.activo, true)),
      db.select().from(schema.mediosPago).where(eq(schema.mediosPago.activo, true)),
    ]);

  if (!pinkyBarbero || !gaboteBarbero || !pinkyUser) {
    throw new Error(
      "Barberos o usuario Pinky no encontrados. Corré npx tsx src/db/seed.ts primero."
    );
  }

  if (allServicios.length === 0 || allMediosPago.length === 0) {
    throw new Error("No hay servicios o medios de pago. Corré seed.ts primero.");
  }

  const servCorte = allServicios.find((s) => s.nombre === "Corte") ?? allServicios[0];
  const servCorteBarba =
    allServicios.find((s) => s.nombre === "Corte y Barba") ?? allServicios[0];
  const mpEfectivo =
    allMediosPago.find((m) => m.nombre === "Efectivo") ?? allMediosPago[0];
  const mpQR =
    allMediosPago.find((m) => m.nombre === "MP QR") ?? allMediosPago[0];
  const mpPosnetCredito =
    allMediosPago.find((m) => m.nombre === "Posnet crédito") ?? allMediosPago[0];

  const workingDays = workingDaysOfMonth(TEST_YEAR, TEST_MONTH);
  console.log(`Días hábiles de Marzo ${TEST_YEAR}: ${workingDays.length}\n`);

  await cleanup(workingDays);

  // ——————————————————————————————————
  // Productos de test
  // ——————————————————————————————————
  console.log("Creando productos de test...");

  const productoPomada = await createOrFindProducto("Pomada (Seed Test)", {
    nombre: "Pomada (Seed Test)",
    precioVenta: "5000.00",
    costoCompra: "2000.00",
    stockActual: 50,
    stockMinimo: 5,
    esConsumicion: false,
    activo: true,
  });
  console.log("  ✓ Pomada (Seed Test)");

  const productoBebida = await createOrFindProducto("Bebida (Seed Test)", {
    nombre: "Bebida (Seed Test)",
    precioVenta: "2000.00",
    costoCompra: "600.00",
    stockActual: 30,
    stockMinimo: 5,
    esConsumicion: true,
    activo: true,
  });
  console.log("  ✓ Bebida (Seed Test)");

  // ——————————————————————————————————
  // Clientes
  // ——————————————————————————————————
  console.log("\nCreando clientes...");

  const marcianoClients: Cliente[] = [];
  for (let i = 1; i <= 5; i++) {
    const [client] = await db
      .insert(schema.clients)
      .values({
        name: `${CLIENT_PREFIX}Marciano ${i}`,
        esMarciano: true,
        marcianoDesde: new Date(`${TEST_YEAR}-${String(TEST_MONTH).padStart(2, "0")}-01T12:00:00-03:00`),
        createdByUserId: pinkyUser.id,
        createdByBarberoId: pinkyBarbero.id,
        totalVisits: 0,
      })
      .returning();
    marcianoClients.push(client);
  }
  console.log(`  ✓ ${marcianoClients.length} clientes Marciano`);

  const regularClients: Cliente[] = [];
  for (let i = 1; i <= 15; i++) {
    const [client] = await db
      .insert(schema.clients)
      .values({
        name: `${CLIENT_PREFIX}Regular ${i}`,
        esMarciano: false,
        createdByUserId: pinkyUser.id,
        createdByBarberoId: pinkyBarbero.id,
        totalVisits: 0,
      })
      .returning();
    regularClients.push(client);
  }
  console.log(`  ✓ ${regularClients.length} clientes regulares`);

  const allClients = [...marcianoClients, ...regularClients];

  // ——————————————————————————————————
  // Atenciones + Cierres por día
  // ——————————————————————————————————
  console.log("\nCreando atenciones y cierres diarios...");

  const midPoint = Math.floor(workingDays.length / 2);
  // Precio v1: primera mitad del mes. v2: segunda mitad (simula aumento de precio).
  const PRECIO_CORTE_V1 = 13000;
  const PRECIO_CORTE_V2 = 14500;
  const PRECIO_BARBA_V1 = 16000;
  const PRECIO_BARBA_V2 = 18000;

  let nullComisionCount = 0;
  let posnetCreditoUsed = false;
  let marcianoConsumicionUsed = false;
  let gaboteZeroDayUsed = false;
  let totalAtenciones = 0;

  const barberosParaCierre = [
    {
      id: pinkyBarbero.id,
      nombre: pinkyBarbero.nombre,
      rol: pinkyBarbero.rol,
      tipoModelo: pinkyBarbero.tipoModelo ?? null,
    },
    {
      id: gaboteBarbero.id,
      nombre: gaboteBarbero.nombre,
      rol: gaboteBarbero.rol,
      tipoModelo: gaboteBarbero.tipoModelo ?? null,
    },
  ];

  const productosParaCierre = [
    { id: productoPomada.id, costoCompra: productoPomada.costoCompra },
    { id: productoBebida.id, costoCompra: productoBebida.costoCompra },
  ];

  const mediosPagoParaCierre = allMediosPago.map((m) => ({
    id: m.id,
    comisionPorcentaje: m.comisionPorcentaje,
  }));

  const mes = `${TEST_YEAR}-${String(TEST_MONTH).padStart(2, "0")}`;

  for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
    const fecha = workingDays[dayIdx];
    const isFirstHalf = dayIdx < midPoint;
    const precioCorte = isFirstHalf ? PRECIO_CORTE_V1 : PRECIO_CORTE_V2;
    const precioBarba = isFirstHalf ? PRECIO_BARBA_V1 : PRECIO_BARBA_V2;

    const dayAtenciones: Atencion[] = [];
    const dayVentas: Array<{
      productoId: string;
      cantidad: number;
      precioUnitario: number;
      medioPagoId: string;
    }> = [];

    // — Pinky (rol admin, 100%) —
    const pinkyCount = randomInt(2, 4);
    for (let i = 0; i < pinkyCount; i++) {
      const isBarba = Math.random() < 0.3;
      const servicio = isBarba ? servCorteBarba : servCorte;
      const precio = isBarba ? precioBarba : precioCorte;
      const medioPago: MedioPago = pickRandom(allMediosPago);
      const client = Math.random() < 0.6 ? pickRandom(allClients) : null;
      const financials = calcAtencionFinancials(precio, precio, Number(medioPago.comisionPorcentaje), 100);

      const [at] = await db
        .insert(schema.atenciones)
        .values({
          barberoId: pinkyBarbero.id,
          clientId: client?.id ?? null,
          servicioId: servicio.id,
          fecha,
          hora: `${randomInt(9, 12).toString().padStart(2, "0")}:00:00`,
          precioBase: precio.toString(),
          precioCobrado: precio.toString(),
          medioPagoId: medioPago.id,
          comisionMedioPagoPct: String(financials.comisionMedioPagoPct),
          comisionMedioPagoMonto: String(financials.comisionMedioPagoMonto),
          montoNeto: String(financials.montoNeto),
          comisionBarberoPct: financials.comisionBarberoPct ? String(financials.comisionBarberoPct) : "0.00",
          comisionBarberoMonto: financials.comisionBarberoMonto ? String(financials.comisionBarberoMonto) : "0.00",
          anulado: false,
          notas: SEED_MARKER,
        })
        .returning();

      dayAtenciones.push(at);
      totalAtenciones++;
    }

    // — Gabote (rol barbero, 60%) —
    const isGaboteZeroDay = !gaboteZeroDayUsed && dayIdx === 10;
    if (isGaboteZeroDay) gaboteZeroDayUsed = true;
    const gaboteCount = isGaboteZeroDay ? 0 : randomInt(1, 3);

    for (let i = 0; i < gaboteCount; i++) {
      const isBarba = Math.random() < 0.25;
      const servicio = isBarba ? servCorteBarba : servCorte;
      const precio = isBarba ? precioBarba : precioCorte;

      // Edge case: Posnet crédito en día 2
      const usePosnetCredito = !posnetCreditoUsed && dayIdx === 2 && i === 0;
      if (usePosnetCredito) posnetCreditoUsed = true;
      const medioPago: MedioPago = usePosnetCredito
        ? mpPosnetCredito
        : pickRandom(allMediosPago);

      // Edge case: 2 atenciones con comisionBarberoMonto = null (día 3 y 5)
      const makeNullComision =
        (nullComisionCount === 0 && dayIdx === 3 && i === 0) ||
        (nullComisionCount === 1 && dayIdx === 5 && i === 0);
      if (makeNullComision) nullComisionCount++;

      const financials = calcAtencionFinancials(
        precio,
        precio,
        Number(medioPago.comisionPorcentaje),
        makeNullComision ? null : 60
      );

      // Edge case: Marciano con consumición (día 4)
      const useMarcianoClient =
        !marcianoConsumicionUsed && dayIdx === 4 && i === 0;
      const client: Cliente | null = useMarcianoClient
        ? marcianoClients[0]
        : Math.random() < 0.6
          ? pickRandom(allClients)
          : null;

      const [at] = await db
        .insert(schema.atenciones)
        .values({
          barberoId: gaboteBarbero.id,
          clientId: client?.id ?? null,
          servicioId: servicio.id,
          fecha,
          hora: `${randomInt(13, 19).toString().padStart(2, "0")}:00:00`,
          precioBase: precio.toString(),
          precioCobrado: precio.toString(),
          medioPagoId: medioPago.id,
          comisionMedioPagoPct: String(financials.comisionMedioPagoPct),
          comisionMedioPagoMonto: String(financials.comisionMedioPagoMonto),
          montoNeto: String(financials.montoNeto),
          comisionBarberoPct: makeNullComision ? "0.00" : String(financials.comisionBarberoPct),
          comisionBarberoMonto: makeNullComision ? "0.00" : String(financials.comisionBarberoMonto),
          anulado: false,
          notas: SEED_MARKER,
        })
        .returning();

      // Edge case: consumición Marciano
      if (useMarcianoClient) {
        await db.insert(schema.atencionesProductos).values({
          atencionId: at.id,
          productoId: productoBebida.id,
          cantidad: 1,
          precioUnitario: "0.00",
          esMarcianoIncluido: true,
          costoUnitarioSnapshot: productoBebida.costoCompra,
        });

        const existingUso = await db.query.marcianoBeneficiosUso.findFirst({
          where: (u, { and: andFn, eq: eqFn }) =>
            andFn(eqFn(u.clientId, marcianoClients[0].id), eqFn(u.mes, mes)),
        });
        if (existingUso) {
          await db
            .update(schema.marcianoBeneficiosUso)
            .set({ consumicionesUsadas: existingUso.consumicionesUsadas + 1 })
            .where(eq(schema.marcianoBeneficiosUso.id, existingUso.id));
        } else {
          await db.insert(schema.marcianoBeneficiosUso).values({
            clientId: marcianoClients[0].id,
            mes,
            cortesUsados: 0,
            consumicionesUsadas: 1,
          });
        }
        marcianoConsumicionUsed = true;
      }

      dayAtenciones.push(at);
      totalAtenciones++;
    }

    // — Ventas de productos (1-2 por día) —
    if (dayAtenciones.length > 0) {
      const ventaCount = randomInt(0, 2);
      for (let v = 0; v < ventaCount; v++) {
        const isConsumicion = Math.random() < 0.3;
        const producto: Producto = isConsumicion ? productoBebida : productoPomada;
        const medioPagoVenta: MedioPago = pickRandom([mpEfectivo, mpQR]);
        const precio = Number(producto.precioVenta);
        const parentAt: Atencion = pickRandom(dayAtenciones);

        await db.insert(schema.atencionesProductos).values({
          atencionId: parentAt.id,
          productoId: producto.id,
          cantidad: 1,
          precioUnitario: precio.toString(),
          esMarcianoIncluido: false,
          costoUnitarioSnapshot: producto.costoCompra,
        });

        dayVentas.push({
          productoId: producto.id,
          cantidad: 1,
          precioUnitario: precio,
          medioPagoId: medioPagoVenta.id,
        });
      }
    }

    // — Cierre diario —
    const cierreResumen = buildCierreResumen({
      fecha,
      atenciones: dayAtenciones.map((at) => ({
        barberoId: at.barberoId,
        precioCobrado: at.precioCobrado,
        comisionBarberoMonto: at.comisionBarberoMonto,
        comisionMedioPagoMonto: at.comisionMedioPagoMonto,
        montoNeto: at.montoNeto,
      })),
      barberos: barberosParaCierre,
      ventasProductos: dayVentas,
      productos: productosParaCierre,
      mediosPago: mediosPagoParaCierre,
    });

    const [cierre] = await db
      .insert(schema.cierresCaja)
      .values({
        fecha,
        totalBruto: cierreResumen.totales.totalBrutoDia.toFixed(2),
        totalComisionesMedios:
          cierreResumen.totales.totalComisionesMediosDia.toFixed(2),
        totalNeto: cierreResumen.totales.cajaNetaDia.toFixed(2),
        totalCortesBruto: cierreResumen.totales.totalServiciosBruto.toFixed(2),
        totalProductos: cierreResumen.totales.totalProductosBruto.toFixed(2),
        cantidadAtenciones: dayAtenciones.length,
        resumenBarberos: cierreResumen,
        cerradoPor: pinkyBarbero.id,
        cerradoEn: new Date(`${fecha}T22:00:00-03:00`),
      })
      .returning();

    if (dayAtenciones.length > 0) {
      await db
        .update(schema.atenciones)
        .set({ cierreCajaId: cierre.id })
        .where(inArray(schema.atenciones.id, dayAtenciones.map((a) => a.id)));
    }
  }

  console.log(
    `  ✓ ${workingDays.length} días procesados, ${totalAtenciones} atenciones creadas`
  );

  // ——————————————————————————————————
  // Gastos rápidos
  // ——————————————————————————————————
  console.log("\nCreando gastos...");

  const gastosData = [
    { descripcion: "Papel cuello extra", monto: "3500.00", tipo: "rapido" as const },
    { descripcion: "Alcohol en gel", monto: "2800.00", tipo: "rapido" as const },
    { descripcion: "Pomada de muestra", monto: "5000.00", tipo: "rapido" as const },
    { descripcion: "Limpieza semanal", monto: "8000.00", tipo: "rapido" as const },
    { descripcion: "Repuesto navajas", monto: "12000.00", tipo: "rapido" as const },
    { descripcion: "Bolsas y embalaje", monto: "1500.00", tipo: "rapido" as const },
    { descripcion: "Desengrasante máquinas", monto: "4200.00", tipo: "fijo" as const },
    { descripcion: "Mantenimiento silla", monto: "25000.00", tipo: "fijo" as const },
  ];

  for (let i = 0; i < gastosData.length; i++) {
    const gasto = gastosData[i];
    const fecha = workingDays[Math.min(i * 2, workingDays.length - 1)];
    await db.insert(schema.gastos).values({
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      fecha,
      tipo: gasto.tipo,
      notas: SEED_MARKER,
    });
  }
  console.log(`  ✓ ${gastosData.length} gastos creados`);

  // ——————————————————————————————————
  // Turnos (mix de estados)
  // ——————————————————————————————————
  console.log("\nCreando turnos...");

  const turnoEstados = [
    "confirmado", "confirmado", "confirmado", "confirmado", "confirmado", "confirmado",
    "completado", "completado", "completado", "completado",
    "pendiente", "pendiente", "pendiente",
    "cancelado", "cancelado",
  ] as const;

  let turnosCreados = 0;
  for (let i = 0; i < 15; i++) {
    const fecha = workingDays[i % workingDays.length];
    const barbero: Barbero = i % 3 === 0 ? gaboteBarbero : pinkyBarbero;
    const estado = turnoEstados[i];
    const client: Cliente = pickRandom(allClients);
    const hora = `${(9 + (i % 9)).toString().padStart(2, "0")}:00`;

    const result = await db
      .insert(schema.turnos)
      .values({
        barberoId: barbero.id,
        clienteNombre: client.name,
        clientId: client.id,
        fecha,
        horaInicio: hora,
        duracionMinutos: 60,
        servicioId: servCorte.id,
        estado,
        esMarcianoSnapshot: client.esMarciano,
        prioridadAbsoluta: client.esMarciano,
        notaCliente: SEED_MARKER,
      })
      .onConflictDoNothing()
      .returning();

    if (result.length > 0) turnosCreados++;
  }
  console.log(`  ✓ ${turnosCreados} turnos creados`);

  // ——————————————————————————————————
  // Marciano: beneficios de cortes usados
  // ——————————————————————————————————
  console.log("\nRegistrando beneficios Marciano...");

  const marcianoCortes = [2, 1, 1, 0, 0];
  for (let i = 0; i < marcianoClients.length; i++) {
    const cortesUsados = marcianoCortes[i];
    if (cortesUsados === 0) continue;

    const existing = await db.query.marcianoBeneficiosUso.findFirst({
      where: (u, { and: andFn, eq: eqFn }) =>
        andFn(eqFn(u.clientId, marcianoClients[i].id), eqFn(u.mes, mes)),
    });

    if (existing) {
      await db
        .update(schema.marcianoBeneficiosUso)
        .set({ cortesUsados: existing.cortesUsados + cortesUsados })
        .where(eq(schema.marcianoBeneficiosUso.id, existing.id));
    } else {
      await db.insert(schema.marcianoBeneficiosUso).values({
        clientId: marcianoClients[i].id,
        mes,
        cortesUsados,
        consumicionesUsadas: 0,
      });
    }
  }
  console.log(`  ✓ Beneficios Marciano registrados para ${mes}`);

  // ——————————————————————————————————
  // Resumen final
  // ——————————————————————————————————
  console.log("\n✓ Seed de actividad completado.");
  console.log(`  → ${allClients.length} clientes (5 Marciano, 15 regulares)`);
  console.log(`  → ${workingDays.length} cierres diarios (Marzo ${TEST_YEAR})`);
  console.log(`  → ${totalAtenciones} atenciones totales`);
  console.log(`  → ${gastosData.length} gastos`);
  console.log(`  → ${turnosCreados} turnos`);
  console.log("\nEdge cases incluidos:");
  console.log(`  ✓ Precio v1=$${PRECIO_CORTE_V1} → v2=$${PRECIO_CORTE_V2} (mitad del mes)`);
  console.log(`  ✓ ${nullComisionCount} atenciones con comisionBarberoMonto = null`);
  console.log(`  ✓ Posnet crédito (3.5%) usado: ${posnetCreditoUsed}`);
  console.log(`  ✓ Marciano con consumición: ${marcianoConsumicionUsed}`);
  console.log(`  ✓ Día sin atenciones Gabote: ${gaboteZeroDayUsed}`);
}

main().catch((err) => {
  console.error("Error en seed-activity:", err);
  process.exit(1);
});
