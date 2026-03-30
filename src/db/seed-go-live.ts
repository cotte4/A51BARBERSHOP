/**
 * Seed pre go-live para A51 Barber.
 *
 * Objetivo:
 * - dejar configurada una base realista para mayo 2026
 * - poblar configuracion operativa minima
 * - preparar un escenario opcional de capacitacion
 *
 * Uso:
 *   npm run db:seed:golive
 *
 * Variables opcionales:
 *   A51_INCLUDE_TRAINING_SCENARIO=false  -> omite turnos/escenario de practica
 *   A51_GO_LIVE_REFERENCE_DATE=2026-05-04 -> fecha base para disponibilidad
 */

import "./load-env";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { normalizePhone } from "@/lib/phone";

const INCLUDE_TRAINING_SCENARIO =
  (process.env.A51_INCLUDE_TRAINING_SCENARIO ?? "true").toLowerCase() !== "false";

const GO_LIVE_REFERENCE_DATE = process.env.A51_GO_LIVE_REFERENCE_DATE ?? "2026-05-04";
const GO_LIVE_MONTH = GO_LIVE_REFERENCE_DATE.slice(0, 7);

type UserRecord = typeof schema.user.$inferSelect;

const BARBEROS_DATA = [
  {
    email: "pinky@a51barber.com",
    nombre: "Pinky",
    rol: "admin" as const,
    tipoModelo: "variable" as const,
    porcentajeComision: "100.00",
    alquilerBancoMensual: null,
    sueldoMinimoGarantizado: null,
  },
  {
    email: "gabote@a51barber.com",
    nombre: "Gabote",
    rol: "barbero" as const,
    tipoModelo: "variable" as const,
    porcentajeComision: "60.00",
    alquilerBancoMensual: null,
    sueldoMinimoGarantizado: null,
  },
] as const;

const SERVICIOS_DATA = [
  { nombre: "Corte", precioBase: "14000.00" },
  { nombre: "Corte y Barba", precioBase: "16000.00" },
] as const;

const ADICIONALES_DATA = [
  { servicio: "Corte", nombre: "Diseño", precioExtra: "2000.00" },
  { servicio: "Corte y Barba", nombre: "Diseño", precioExtra: "2000.00" },
] as const;

const MEDIOS_PAGO_DATA = [
  { nombre: "Efectivo", comisionPorcentaje: "0.00" },
  { nombre: "Transferencia", comisionPorcentaje: "0.00" },
  { nombre: "MP QR", comisionPorcentaje: "6.00" },
  { nombre: "Posnet débito", comisionPorcentaje: "1.50" },
  { nombre: "Posnet crédito", comisionPorcentaje: "3.50" },
] as const;

const PRODUCTOS_DATA = [
  {
    nombre: "Cera mate",
    descripcion: "Producto de styling para venta y uso de mostrador",
    precioVenta: "18000.00",
    costoCompra: "9000.00",
    stockActual: 8,
    stockMinimo: 2,
  },
  {
    nombre: "Pomada brillo",
    descripcion: "Pomada base agua",
    precioVenta: "18000.00",
    costoCompra: "9000.00",
    stockActual: 6,
    stockMinimo: 2,
  },
  {
    nombre: "Shampoo barber",
    descripcion: "Shampoo de mantenimiento",
    precioVenta: "22000.00",
    costoCompra: "11000.00",
    stockActual: 4,
    stockMinimo: 2,
  },
  {
    nombre: "Cafe",
    descripcion: "Consumicion para turnos / Marcianos",
    precioVenta: "2500.00",
    costoCompra: "1200.00",
    stockActual: 24,
    stockMinimo: 6,
  },
  {
    nombre: "Gaseosa",
    descripcion: "Consumicion de heladera",
    precioVenta: "3000.00",
    costoCompra: "1500.00",
    stockActual: 24,
    stockMinimo: 6,
  },
] as const;

const GASTOS_FIJOS_DATA = [
  {
    categoria: "Locación",
    color: "#f59e0b",
    descripcion: "Alquiler",
    monto: "1200000.00",
    fecha: "2026-05-01",
    frecuencia: "mensual" as const,
    notas: "Monto base pre go-live. Confirmar contra contrato real.",
  },
  {
    categoria: "Servicios",
    color: "#0ea5e9",
    descripcion: "Internet",
    monto: "45000.00",
    fecha: "2026-05-01",
    frecuencia: "mensual" as const,
    notas: "Monto base pre go-live. Ajustar si cambia el proveedor.",
  },
  {
    categoria: "Servicios",
    color: "#0ea5e9",
    descripcion: "Luz",
    monto: "180000.00",
    fecha: "2026-05-01",
    frecuencia: "mensual" as const,
    notas: "Estimacion inicial para testing pre go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Filo de navajas",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Alcohol",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Papel cuello",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Gel de afeitar",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Desinfectante 5 en 1",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Kit basico (comprar x2 cada vez)",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Gastos de limpieza iniciales",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
  {
    categoria: "Operación",
    color: "#22c55e",
    descripcion: "Gastos de limpieza periodicos",
    monto: "0.00",
    fecha: GO_LIVE_REFERENCE_DATE,
    frecuencia: "mensual" as const,
    notas: "Completar monto real antes del go-live.",
  },
] as const;

const CLIENTES_DATA = [
  {
    name: "Tomi M.",
    phoneRaw: "+54 9 223 512-3401",
    esMarciano: true,
    marcianoDesde: "2026-05-01T10:00:00.000Z",
    tags: ["marciano", "vip", "corte-clasico"],
    notes: "Cliente sanitizado para entrenamiento. Prefiere turno de media mañana.",
    createdByEmail: "pinky@a51barber.com",
  },
  {
    name: "Bruno R.",
    phoneRaw: "+54 9 223 511-2299",
    esMarciano: false,
    marcianoDesde: null,
    tags: ["fade", "barba"],
    notes: "Cliente sanitizado. Suele pedir corte y barba.",
    createdByEmail: "gabote@a51barber.com",
  },
  {
    name: "Lucas P.",
    phoneRaw: "+54 9 223 530-1188",
    esMarciano: false,
    marcianoDesde: null,
    tags: ["turno-tarde"],
    notes: "Cliente sanitizado. Prefiere horarios despues de las 17.",
    createdByEmail: "pinky@a51barber.com",
  },
  {
    name: "Nacho G.",
    phoneRaw: "+54 9 223 540-0087",
    esMarciano: false,
    marcianoDesde: null,
    tags: ["cliente-nuevo"],
    notes: "Cliente sanitizado creado para pruebas de reserva publica.",
    createdByEmail: "gabote@a51barber.com",
  },
] as const;

const DISPONIBILIDAD_DATA = [
  { fecha: "2026-05-04", horaInicio: "10:00", duracionMinutos: 45 },
  { fecha: "2026-05-04", horaInicio: "10:45", duracionMinutos: 45 },
  { fecha: "2026-05-04", horaInicio: "11:30", duracionMinutos: 60 },
  { fecha: "2026-05-05", horaInicio: "16:00", duracionMinutos: 45 },
  { fecha: "2026-05-05", horaInicio: "16:45", duracionMinutos: 45 },
  { fecha: "2026-05-05", horaInicio: "17:30", duracionMinutos: 60 },
  { fecha: "2026-05-06", horaInicio: "10:00", duracionMinutos: 45 },
  { fecha: "2026-05-06", horaInicio: "10:45", duracionMinutos: 45 },
  { fecha: "2026-05-06", horaInicio: "11:30", duracionMinutos: 60 },
] as const;

async function main() {
  console.log("=== Seed go-live A51 Barber ===");
  console.log(`Fecha de referencia: ${GO_LIVE_REFERENCE_DATE}`);
  console.log(`Escenario de capacitacion: ${INCLUDE_TRAINING_SCENARIO ? "si" : "no"}\n`);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  const usersByEmail = await loadRequiredUsers();
  const barberosByEmail = await seedBarberos(usersByEmail);
  const serviciosByName = await seedServicios(barberosByEmail);
  await seedAdicionales(serviciosByName);
  const mediosByName = await seedMediosPago();
  await seedDefaultsBarberos(barberosByEmail, serviciosByName, mediosByName);
  await seedTemporada(barberosByEmail);
  await seedCategoriasYGastos();
  await seedConfiguracionNegocio();
  const productosByName = await seedProductos();
  const clientsByPhone = await seedClients(usersByEmail, barberosByEmail);
  await seedMarcianos(clientsByPhone);
  await seedDisponibilidad(barberosByEmail);

  if (INCLUDE_TRAINING_SCENARIO) {
    await seedTrainingScenario(barberosByEmail, clientsByPhone, productosByName);
  }

  console.log("\n=== Seed go-live completado ===");
  console.log("Base operativa creada/actualizada:");
  console.log("- barberos y defaults");
  console.log("- servicios, adicionales y medios de pago");
  console.log("- gastos fijos base y presupuesto");
  console.log("- productos iniciales");
  console.log("- clientes sanitizados y Marciano base");
  console.log("- disponibilidad de Pinky");
  console.log(`- escenario de capacitacion ${INCLUDE_TRAINING_SCENARIO ? "incluido" : "omitido"}`);
}

async function loadRequiredUsers() {
  const usersByEmail = new Map<string, UserRecord>();

  for (const barber of BARBEROS_DATA) {
    const user = await db.query.user.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.email, barber.email),
    });

    if (!user) {
      throw new Error(
        `No existe el usuario ${barber.email}. Corre primero src/db/setup-prod-users.ts`
      );
    }

    usersByEmail.set(barber.email, user);
  }

  return usersByEmail;
}

async function seedBarberos(usersByEmail: Map<string, UserRecord>) {
  const barberosByEmail = new Map<string, typeof schema.barberos.$inferSelect>();

  console.log("1. Barberos...");

  for (const barber of BARBEROS_DATA) {
    const user = usersByEmail.get(barber.email)!;
    let record = await db.query.barberos.findFirst({
      where: (table, { eq: whereEq, or }) =>
        or(whereEq(table.userId, user.id), whereEq(table.nombre, barber.nombre)),
    });

    if (!record) {
      [record] = await db
        .insert(schema.barberos)
        .values({
          nombre: barber.nombre,
          rol: barber.rol,
          tipoModelo: barber.tipoModelo,
          porcentajeComision: barber.porcentajeComision,
          alquilerBancoMensual: barber.alquilerBancoMensual,
          sueldoMinimoGarantizado: barber.sueldoMinimoGarantizado,
          activo: true,
          userId: user.id,
        })
        .returning();
      console.log(`  ✓ ${barber.nombre} creado`);
    } else {
      [record] = await db
        .update(schema.barberos)
        .set({
          nombre: barber.nombre,
          rol: barber.rol,
          tipoModelo: barber.tipoModelo,
          porcentajeComision: barber.porcentajeComision,
          alquilerBancoMensual: barber.alquilerBancoMensual,
          sueldoMinimoGarantizado: barber.sueldoMinimoGarantizado,
          activo: true,
          userId: user.id,
        })
        .where(eq(schema.barberos.id, record.id))
        .returning();
      console.log(`  - ${barber.nombre} actualizado`);
    }

    barberosByEmail.set(barber.email, record);
  }

  return barberosByEmail;
}

async function seedServicios(barberosByEmail: Map<string, typeof schema.barberos.$inferSelect>) {
  console.log("\n2. Servicios...");

  const serviciosByName = new Map<string, typeof schema.servicios.$inferSelect>();
  const pinky = barberosByEmail.get("pinky@a51barber.com");

  if (!pinky) {
    throw new Error("No se pudo resolver a Pinky para crear historial de precios.");
  }

  for (const servicio of SERVICIOS_DATA) {
    let record = await db.query.servicios.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.nombre, servicio.nombre),
    });

    if (!record) {
      [record] = await db
        .insert(schema.servicios)
        .values({
          nombre: servicio.nombre,
          precioBase: servicio.precioBase,
          activo: true,
        })
        .returning();
      console.log(`  ✓ ${servicio.nombre} creado`);
    } else {
      [record] = await db
        .update(schema.servicios)
        .set({
          precioBase: servicio.precioBase,
          activo: true,
        })
        .where(eq(schema.servicios.id, record.id))
        .returning();
      console.log(`  - ${servicio.nombre} actualizado`);
    }

    const historial = await db.query.serviciosPreciosHistorial.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(
          whereEq(table.servicioId, record.id),
          whereEq(table.precio, servicio.precioBase),
          whereEq(table.vigenteDesdе, "2026-05-01")
        ),
    });

    if (!historial) {
      await db.insert(schema.serviciosPreciosHistorial).values({
        servicioId: record.id,
        precio: servicio.precioBase,
        vigenteDesdе: "2026-05-01",
        motivo: "Precio base go-live mayo 2026",
        creadoPor: pinky.id,
      });
      console.log(`    + historial mayo 2026 para ${servicio.nombre}`);
    }

    serviciosByName.set(servicio.nombre, record);
  }

  return serviciosByName;
}

async function seedAdicionales(serviciosByName: Map<string, typeof schema.servicios.$inferSelect>) {
  console.log("\n3. Adicionales...");

  for (const adicional of ADICIONALES_DATA) {
    const servicio = serviciosByName.get(adicional.servicio);

    if (!servicio) {
      throw new Error(`Servicio no encontrado para adicional: ${adicional.servicio}`);
    }

    let record = await db.query.serviciosAdicionales.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(
          whereEq(table.servicioId, servicio.id),
          whereEq(table.nombre, adicional.nombre)
        ),
    });

    if (!record) {
      await db.insert(schema.serviciosAdicionales).values({
        servicioId: servicio.id,
        nombre: adicional.nombre,
        precioExtra: adicional.precioExtra,
      });
      console.log(`  ✓ ${adicional.nombre} para ${adicional.servicio}`);
    } else {
      await db
        .update(schema.serviciosAdicionales)
        .set({ precioExtra: adicional.precioExtra })
        .where(eq(schema.serviciosAdicionales.id, record.id));
      console.log(`  - ${adicional.nombre} para ${adicional.servicio} actualizado`);
    }
  }
}

async function seedMediosPago() {
  console.log("\n4. Medios de pago...");

  const mediosByName = new Map<string, typeof schema.mediosPago.$inferSelect>();

  for (const medio of MEDIOS_PAGO_DATA) {
    let record = await db.query.mediosPago.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.nombre, medio.nombre),
    });

    if (!record) {
      [record] = await db
        .insert(schema.mediosPago)
        .values({
          nombre: medio.nombre,
          comisionPorcentaje: medio.comisionPorcentaje,
          activo: true,
        })
        .returning();
      console.log(`  ✓ ${medio.nombre}`);
    } else {
      [record] = await db
        .update(schema.mediosPago)
        .set({
          comisionPorcentaje: medio.comisionPorcentaje,
          activo: true,
        })
        .where(eq(schema.mediosPago.id, record.id))
        .returning();
      console.log(`  - ${medio.nombre} actualizado`);
    }

    mediosByName.set(medio.nombre, record);
  }

  return mediosByName;
}

async function seedDefaultsBarberos(
  barberosByEmail: Map<string, typeof schema.barberos.$inferSelect>,
  serviciosByName: Map<string, typeof schema.servicios.$inferSelect>,
  mediosByName: Map<string, typeof schema.mediosPago.$inferSelect>
) {
  console.log("\n5. Defaults de caja...");

  const defaults = [
    {
      email: "pinky@a51barber.com",
      servicio: "Corte",
      medio: "Efectivo",
    },
    {
      email: "gabote@a51barber.com",
      servicio: "Corte",
      medio: "Transferencia",
    },
  ] as const;

  for (const config of defaults) {
    const barbero = barberosByEmail.get(config.email);
    const servicio = serviciosByName.get(config.servicio);
    const medio = mediosByName.get(config.medio);

    if (!barbero || !servicio || !medio) {
      throw new Error(`No se pudieron resolver defaults para ${config.email}`);
    }

    await db
      .update(schema.barberos)
      .set({
        servicioDefectoId: servicio.id,
        medioPagoDefectoId: medio.id,
      })
      .where(eq(schema.barberos.id, barbero.id));

    console.log(`  ✓ ${barbero.nombre}: ${config.servicio} + ${config.medio}`);
  }
}

async function seedTemporada(barberosByEmail: Map<string, typeof schema.barberos.$inferSelect>) {
  console.log("\n6. Temporada...");

  const temporada = await db.query.temporadas.findFirst({
    where: (table, { eq: whereEq }) => whereEq(table.nombre, "Otoño 2026"),
  });

  if (!temporada) {
    await db.insert(schema.temporadas).values({
      nombre: "Otoño 2026",
      fechaInicio: "2026-05-01",
      fechaFin: "2026-06-30",
      cortesDiaProyectados: 15,
      precioBaseProyectado: "14000.00",
    });
    console.log("  ✓ Otoño 2026 creada");
  } else {
    await db
      .update(schema.temporadas)
      .set({
        fechaInicio: "2026-05-01",
        fechaFin: "2026-06-30",
        cortesDiaProyectados: 15,
        precioBaseProyectado: "14000.00",
      })
      .where(eq(schema.temporadas.id, temporada.id));
    console.log("  - Otoño 2026 actualizada");
  }

  const repago = await db.query.repagoMemas.findFirst();
  if (!repago) {
    await db.insert(schema.repagoMemas).values({
      valorLlaveTotal: "2384571.00",
      cuotaMensual: "400000.00",
      cuotasPagadas: 0,
      saldoPendiente: "2384571.00",
      fechaInicio: "2026-05-01",
      pagadoCompleto: false,
      deudaUsd: "1500.00",
      tasaAnualUsd: "0.1000",
      cantidadCuotasPactadas: 12,
    });
    console.log("  ✓ repago Memas inicial");
  }
}

async function seedCategoriasYGastos() {
  console.log("\n7. Gastos y categorias...");

  const categoriaIds = new Map<string, string>();

  for (const gasto of GASTOS_FIJOS_DATA) {
    if (!categoriaIds.has(gasto.categoria)) {
      let categoria = await db.query.categoriasGasto.findFirst({
        where: (table, { eq: whereEq }) => whereEq(table.nombre, gasto.categoria),
      });

      if (!categoria) {
        [categoria] = await db
          .insert(schema.categoriasGasto)
          .values({
            nombre: gasto.categoria,
            color: gasto.color,
          })
          .returning();
        console.log(`  ✓ categoria ${gasto.categoria}`);
      } else {
        await db
          .update(schema.categoriasGasto)
          .set({ color: gasto.color })
          .where(eq(schema.categoriasGasto.id, categoria.id));
      }

      categoriaIds.set(gasto.categoria, categoria.id);
    }

    let gastoDb = await db.query.gastos.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.descripcion, gasto.descripcion),
    });

    if (!gastoDb) {
      await db.insert(schema.gastos).values({
        categoriaId: categoriaIds.get(gasto.categoria)!,
        descripcion: gasto.descripcion,
        monto: gasto.monto,
        fecha: gasto.fecha,
        tipo: "fijo",
        esRecurrente: true,
        frecuencia: gasto.frecuencia,
        notas: gasto.notas,
      });
      console.log(`  ✓ gasto ${gasto.descripcion}`);
    } else {
      await db
        .update(schema.gastos)
        .set({
          categoriaId: categoriaIds.get(gasto.categoria)!,
          monto: gasto.monto,
          fecha: gasto.fecha,
          tipo: "fijo",
          esRecurrente: true,
          frecuencia: gasto.frecuencia,
          notas: gasto.notas,
        })
        .where(eq(schema.gastos.id, gastoDb.id));
      console.log(`  - gasto ${gasto.descripcion} actualizado`);
    }
  }
}

async function seedConfiguracionNegocio() {
  console.log("\n8. Configuracion de negocio...");

  const presupuestoMensualGastos = 1956686;
  const existing = await db.query.configuracionNegocio.findFirst();

  if (!existing) {
    await db.insert(schema.configuracionNegocio).values({
      presupuestoMensualGastos,
      actualizadoPor: "seed-go-live",
    });
    console.log("  ✓ configuracion creada");
  } else {
    await db
      .update(schema.configuracionNegocio)
      .set({
        presupuestoMensualGastos,
        actualizadoPor: "seed-go-live",
      })
      .where(eq(schema.configuracionNegocio.id, existing.id));
    console.log("  - configuracion actualizada");
  }
}

async function seedProductos() {
  console.log("\n9. Productos...");

  const productosByName = new Map<string, typeof schema.productos.$inferSelect>();

  for (const product of PRODUCTOS_DATA) {
    let record = await db.query.productos.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.nombre, product.nombre),
    });

    if (!record) {
      [record] = await db
        .insert(schema.productos)
        .values({
          nombre: product.nombre,
          descripcion: product.descripcion,
          precioVenta: product.precioVenta,
          costoCompra: product.costoCompra,
          stockActual: product.stockActual,
          stockMinimo: product.stockMinimo,
          activo: true,
        })
        .returning();

      await db.insert(schema.stockMovimientos).values({
        productoId: record.id,
        tipo: "entrada",
        cantidad: product.stockActual,
        precioUnitario: product.costoCompra,
        costoUnitarioSnapshot: product.costoCompra,
        notas: "Stock inicial go-live",
      });

      console.log(`  ✓ ${product.nombre} creado con stock inicial`);
    } else {
      [record] = await db
        .update(schema.productos)
        .set({
          descripcion: product.descripcion,
          precioVenta: product.precioVenta,
          costoCompra: product.costoCompra,
          stockMinimo: product.stockMinimo,
          activo: true,
        })
        .where(eq(schema.productos.id, record.id))
        .returning();
      console.log(`  - ${product.nombre} actualizado`);
    }

    productosByName.set(product.nombre, record);
  }

  return productosByName;
}

async function seedClients(
  usersByEmail: Map<string, UserRecord>,
  barberosByEmail: Map<string, typeof schema.barberos.$inferSelect>
) {
  console.log("\n10. Clientes...");

  const clientsByPhone = new Map<string, typeof schema.clients.$inferSelect>();

  for (const client of CLIENTES_DATA) {
    const phoneNormalized = normalizePhone(client.phoneRaw);

    if (!phoneNormalized) {
      throw new Error(`No se pudo normalizar el telefono de ${client.name}`);
    }

    const user = usersByEmail.get(client.createdByEmail);
    const barbero = barberosByEmail.get(client.createdByEmail);

    if (!user || !barbero) {
      throw new Error(`No se pudo resolver creador para ${client.name}`);
    }

    let record = await db.query.clients.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.phoneNormalized, phoneNormalized),
    });

    const payload = {
      name: client.name,
      phoneRaw: client.phoneRaw,
      phoneNormalized,
      esMarciano: client.esMarciano,
      marcianoDesde: client.marcianoDesde ? new Date(client.marcianoDesde) : null,
      tags: [...client.tags],
      notes: client.notes,
      createdByUserId: user.id,
      createdByBarberoId: barbero.id,
    };

    if (!record) {
      [record] = await db.insert(schema.clients).values(payload).returning();
      console.log(`  ✓ ${client.name}`);
    } else {
      [record] = await db
        .update(schema.clients)
        .set({
          ...payload,
          archivedAt: null,
        })
        .where(eq(schema.clients.id, record.id))
        .returning();
      console.log(`  - ${client.name} actualizado`);
    }

    clientsByPhone.set(phoneNormalized, record);
  }

  return clientsByPhone;
}

async function seedMarcianos(clientsByPhone: Map<string, typeof schema.clients.$inferSelect>) {
  console.log("\n11. Marcianos...");

  const tomi = clientsByPhone.get(normalizePhone("+54 9 223 512-3401")!);

  if (!tomi) {
    throw new Error("No se pudo resolver el cliente Marciano base.");
  }

  let usage = await db.query.marcianoBeneficiosUso.findFirst({
    where: (table, { and: whereAnd, eq: whereEq }) =>
      whereAnd(whereEq(table.clientId, tomi.id), whereEq(table.mes, GO_LIVE_MONTH)),
  });

  if (!usage) {
    await db.insert(schema.marcianoBeneficiosUso).values({
      clientId: tomi.id,
      mes: GO_LIVE_MONTH,
      cortesUsados: 0,
      consumicionesUsadas: 0,
      sorteosParticipados: 0,
    });
    console.log(`  ✓ beneficio mensual ${GO_LIVE_MONTH} creado para ${tomi.name}`);
  } else {
    console.log(`  - beneficio mensual ${GO_LIVE_MONTH} ya existia`);
  }
}

async function seedDisponibilidad(
  barberosByEmail: Map<string, typeof schema.barberos.$inferSelect>
) {
  console.log("\n12. Disponibilidad de turnos...");

  const pinky = barberosByEmail.get("pinky@a51barber.com");

  if (!pinky) {
    throw new Error("No se pudo resolver a Pinky para disponibilidad.");
  }

  for (const slot of DISPONIBILIDAD_DATA) {
    let record = await db.query.turnosDisponibilidad.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(
          whereEq(table.barberoId, pinky.id),
          whereEq(table.fecha, slot.fecha),
          whereEq(table.horaInicio, slot.horaInicio)
        ),
    });

    if (!record) {
      await db.insert(schema.turnosDisponibilidad).values({
        barberoId: pinky.id,
        fecha: slot.fecha,
        horaInicio: slot.horaInicio,
        duracionMinutos: slot.duracionMinutos,
      });
      console.log(`  ✓ slot ${slot.fecha} ${slot.horaInicio}`);
    } else {
      await db
        .update(schema.turnosDisponibilidad)
        .set({ duracionMinutos: slot.duracionMinutos })
        .where(eq(schema.turnosDisponibilidad.id, record.id));
    }
  }
}

async function seedTrainingScenario(
  barberosByEmail: Map<string, typeof schema.barberos.$inferSelect>,
  clientsByPhone: Map<string, typeof schema.clients.$inferSelect>,
  productosByName: Map<string, typeof schema.productos.$inferSelect>
) {
  console.log("\n13. Escenario de capacitacion...");

  const pinky = barberosByEmail.get("pinky@a51barber.com");
  const tomi = clientsByPhone.get(normalizePhone("+54 9 223 512-3401")!);
  const nacho = clientsByPhone.get(normalizePhone("+54 9 223 540-0087")!);
  const cafe = productosByName.get("Cafe");
  const gaseosa = productosByName.get("Gaseosa");

  if (!pinky || !tomi || !nacho || !cafe || !gaseosa) {
    throw new Error("No se pudo resolver el escenario de capacitacion.");
  }

  const scenarios = [
    {
      cliente: tomi,
      fecha: "2026-05-04",
      horaInicio: "10:00",
      duracionMinutos: 45,
      estado: "confirmado" as const,
      notaCliente: "Quiero mantener el corte clasico.",
      sugerenciaCancion: "Rock nacional tranquilo",
      esMarcianoSnapshot: true,
      extras: [{ productoId: cafe.id, cantidad: 1 }],
    },
    {
      cliente: nacho,
      fecha: "2026-05-05",
      horaInicio: "16:00",
      duracionMinutos: 45,
      estado: "pendiente" as const,
      notaCliente: "Primera vez en la barber.",
      sugerenciaCancion: "Trap argentino",
      esMarcianoSnapshot: false,
      extras: [{ productoId: gaseosa.id, cantidad: 1 }],
    },
  ];

  for (const scenario of scenarios) {
    let turno = await db.query.turnos.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(
          whereEq(table.barberoId, pinky.id),
          whereEq(table.fecha, scenario.fecha),
          whereEq(table.horaInicio, scenario.horaInicio),
          whereEq(table.clienteNombre, scenario.cliente.name)
        ),
    });

    const payload = {
      barberoId: pinky.id,
      clienteNombre: scenario.cliente.name,
      clienteTelefonoRaw: scenario.cliente.phoneRaw,
      clienteTelefonoNormalizado: scenario.cliente.phoneNormalized,
      clientId: scenario.cliente.id,
      fecha: scenario.fecha,
      horaInicio: scenario.horaInicio,
      duracionMinutos: scenario.duracionMinutos,
      estado: scenario.estado,
      notaCliente: scenario.notaCliente,
      sugerenciaCancion: scenario.sugerenciaCancion,
      motivoCancelacion: null,
      esMarcianoSnapshot: scenario.esMarcianoSnapshot,
    };

    if (!turno) {
      [turno] = await db.insert(schema.turnos).values(payload).returning();
      console.log(`  ✓ turno ${scenario.estado} ${scenario.fecha} ${scenario.horaInicio}`);
    } else {
      [turno] = await db
        .update(schema.turnos)
        .set(payload)
        .where(eq(schema.turnos.id, turno.id))
        .returning();
      console.log(`  - turno ${scenario.fecha} ${scenario.horaInicio} actualizado`);
    }

    for (const extra of scenario.extras) {
      const existingExtra = await db.query.turnosExtras.findFirst({
        where: (table, { and: whereAnd, eq: whereEq }) =>
          whereAnd(
            whereEq(table.turnoId, turno.id),
            whereEq(table.productoId, extra.productoId)
          ),
      });

      if (!existingExtra) {
        await db.insert(schema.turnosExtras).values({
          turnoId: turno.id,
          productoId: extra.productoId,
          cantidad: extra.cantidad,
        });
      } else if (existingExtra.cantidad !== extra.cantidad) {
        await db
          .update(schema.turnosExtras)
          .set({ cantidad: extra.cantidad })
          .where(eq(schema.turnosExtras.id, existingExtra.id));
      }
    }
  }
}

main().catch((error) => {
  console.error("\nError en seed-go-live:", error);
  process.exit(1);
});
