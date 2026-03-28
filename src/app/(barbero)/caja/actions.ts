"use server";

import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  barberos,
  servicios,
  mediosPago,
  serviciosAdicionales,
  cierresCaja,
  stockMovimientos,
  productos,
} from "@/db/schema";
import { eq, inArray, and, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Tipos ───────────────────────────────────────────

export type CierreFormState = {
  error?: string;
};

export type AtencionFormState = {
  error?: string;
  fieldErrors?: {
    barberoId?: string;
    servicioId?: string;
    medioPagoId?: string;
    precioCobrado?: string;
    motivoAnulacion?: string;
  };
};

// ─── Helpers ─────────────────────────────────────────

function getFechaHoy(): string {
  // Fecha en timezone Argentina (UTC-3)
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }); // formato YYYY-MM-DD
}

function getHoraAhora(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }); // formato HH:MM:SS
}

// ─── registrarAtencion ────────────────────────────────

export async function registrarAtencion(
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  // Leer campos
  const barberoId = formData.get("barberoId") as string;
  const servicioId = formData.get("servicioId") as string;
  const medioPagoId = formData.get("medioPagoId") as string;
  const precioCobradoStr = formData.get("precioCobrado") as string;
  const adicionalesIds = formData.getAll("adicionalesIds") as string[]; // múltiples
  const notas = formData.get("notas") as string | null;

  // Validaciones
  const fieldErrors: AtencionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "Seleccioná un barbero";
  if (!servicioId) fieldErrors.servicioId = "Seleccioná un servicio";
  if (!medioPagoId) fieldErrors.medioPagoId = "Seleccioná un medio de pago";
  if (precioCobradoStr === "" || precioCobradoStr === null || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verificar que no hay cierre para hoy
  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, getFechaHoy()))
    .limit(1);

  if (cierreExistente) {
    const d = new Date(getFechaHoy() + "T12:00:00");
    const fechaFormateada = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
    return { error: `La caja del ${fechaFormateada} ya fue cerrada. No se pueden registrar nuevas atenciones.` };
  }

  try {
    // Verificar que barbero, servicio y medio de pago existen
    const [barbero] = await db.select().from(barberos).where(eq(barberos.id, barberoId)).limit(1);
    const [medioPago] = await db.select().from(mediosPago).where(eq(mediosPago.id, medioPagoId)).limit(1);
    const [servicio] = await db.select().from(servicios).where(eq(servicios.id, servicioId)).limit(1);

    if (!barbero) return { fieldErrors: { barberoId: "Barbero no encontrado" } };
    if (!medioPago) return { fieldErrors: { medioPagoId: "Medio de pago no encontrado" } };
    if (!servicio) return { fieldErrors: { servicioId: "Servicio no encontrado" } };

    // Re-calcular server-side (no confiar en cliente)
    const precioCobrado = Number(precioCobradoStr);
    const comisionMpPct = Number(medioPago.comisionPorcentaje ?? 0);
    const comisionMpMonto = precioCobrado * comisionMpPct / 100;
    const montoNeto = precioCobrado - comisionMpMonto;
    const comisionBarberoPct = Number(barbero.porcentajeComision ?? 0);
    const comisionBarberoMonto = precioCobrado * comisionBarberoPct / 100;

    // Insertar atencion
    const [nuevaAtencion] = await db
      .insert(atenciones)
      .values({
        barberoId,
        servicioId,
        fecha: getFechaHoy(),
        hora: getHoraAhora(),
        precioBase: servicio.precioBase,
        precioCobrado: String(precioCobrado),
        medioPagoId,
        comisionMedioPagoPct: String(comisionMpPct),
        comisionMedioPagoMonto: String(comisionMpMonto.toFixed(2)),
        montoNeto: String(montoNeto.toFixed(2)),
        comisionBarberoPct: String(comisionBarberoPct),
        comisionBarberoMonto: String(comisionBarberoMonto.toFixed(2)),
        notas: notas?.trim() || null,
        anulado: false,
      })
      .returning();

    // Insertar adicionales
    if (adicionalesIds.length > 0) {
      const adicionalesData = await db
        .select()
        .from(serviciosAdicionales)
        .where(inArray(serviciosAdicionales.id, adicionalesIds));

      await db.insert(atencionesAdicionales).values(
        adicionalesData.map((a) => ({
          atencionId: nuevaAtencion.id,
          adicionalId: a.id,
          precioCobrado: a.precioExtra ?? "0",
        }))
      );
    }
  } catch (e) {
    console.error("Error registrando atencion:", e);
    return { error: "No se pudo registrar la atención. Intentá de nuevo." };
  }

  revalidatePath("/caja");
  redirect("/caja");
}

// ─── editarAtencion ───────────────────────────────────

export async function editarAtencion(
  id: string,
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  const barberoId = formData.get("barberoId") as string;
  const servicioId = formData.get("servicioId") as string;
  const medioPagoId = formData.get("medioPagoId") as string;
  const precioCobradoStr = formData.get("precioCobrado") as string;
  const adicionalesIds = formData.getAll("adicionalesIds") as string[];
  const notas = formData.get("notas") as string | null;

  const fieldErrors: AtencionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "Seleccioná un barbero";
  if (!servicioId) fieldErrors.servicioId = "Seleccioná un servicio";
  if (!medioPagoId) fieldErrors.medioPagoId = "Seleccioná un medio de pago";
  if (precioCobradoStr === "" || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verificar que no hay cierre para hoy
  const [cierreExistenteEditar] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, getFechaHoy()))
    .limit(1);

  if (cierreExistenteEditar) {
    const d = new Date(getFechaHoy() + "T12:00:00");
    const fechaFormateada = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
    return { error: `La caja del ${fechaFormateada} ya fue cerrada. No se pueden registrar nuevas atenciones.` };
  }

  try {
    // Verificar que la atención existe y es de hoy
    const [atencionExistente] = await db
      .select()
      .from(atenciones)
      .where(eq(atenciones.id, id))
      .limit(1);

    if (!atencionExistente) return { error: "Atención no encontrada." };
    if (atencionExistente.anulado) return { error: "No se puede editar una atención anulada." };
    if (atencionExistente.fecha !== getFechaHoy()) {
      return { error: "Solo se pueden editar atenciones del día de hoy." };
    }

    const [barbero] = await db.select().from(barberos).where(eq(barberos.id, barberoId)).limit(1);
    const [medioPago] = await db.select().from(mediosPago).where(eq(mediosPago.id, medioPagoId)).limit(1);
    const [servicio] = await db.select().from(servicios).where(eq(servicios.id, servicioId)).limit(1);

    if (!barbero || !medioPago || !servicio) return { error: "Datos inválidos." };

    const precioCobrado = Number(precioCobradoStr);
    const comisionMpPct = Number(medioPago.comisionPorcentaje ?? 0);
    const comisionMpMonto = precioCobrado * comisionMpPct / 100;
    const montoNeto = precioCobrado - comisionMpMonto;
    const comisionBarberoPct = Number(barbero.porcentajeComision ?? 0);
    const comisionBarberoMonto = precioCobrado * comisionBarberoPct / 100;

    await db.update(atenciones).set({
      barberoId,
      servicioId,
      precioCobrado: String(precioCobrado),
      precioBase: servicio.precioBase,
      medioPagoId,
      comisionMedioPagoPct: String(comisionMpPct),
      comisionMedioPagoMonto: String(comisionMpMonto.toFixed(2)),
      montoNeto: String(montoNeto.toFixed(2)),
      comisionBarberoPct: String(comisionBarberoPct),
      comisionBarberoMonto: String(comisionBarberoMonto.toFixed(2)),
      notas: notas?.trim() || null,
    }).where(eq(atenciones.id, id));

    // Re-insertar adicionales
    await db.delete(atencionesAdicionales).where(eq(atencionesAdicionales.atencionId, id));

    if (adicionalesIds.length > 0) {
      const adicionalesData = await db
        .select()
        .from(serviciosAdicionales)
        .where(inArray(serviciosAdicionales.id, adicionalesIds));

      await db.insert(atencionesAdicionales).values(
        adicionalesData.map((a) => ({
          atencionId: id,
          adicionalId: a.id,
          precioCobrado: a.precioExtra ?? "0",
        }))
      );
    }
  } catch (e) {
    console.error("Error editando atencion:", e);
    return { error: "No se pudo actualizar la atención. Intentá de nuevo." };
  }

  revalidatePath("/caja");
  redirect("/caja");
}

// ─── anularAtencion ───────────────────────────────────

export async function anularAtencion(
  id: string,
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  // Verificar que el usuario es admin
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return { error: "Solo el administrador puede anular atenciones." };
  }

  const motivoAnulacion = formData.get("motivoAnulacion") as string;
  if (!motivoAnulacion || motivoAnulacion.trim() === "") {
    return { fieldErrors: { motivoAnulacion: "El motivo de anulación es requerido" } };
  }

  try {
    const [atencionExistente] = await db
      .select()
      .from(atenciones)
      .where(eq(atenciones.id, id))
      .limit(1);

    if (!atencionExistente) return { error: "Atención no encontrada." };
    if (atencionExistente.anulado) return { error: "Esta atención ya está anulada." };
    if (atencionExistente.fecha !== getFechaHoy()) {
      return { error: "Solo se pueden anular atenciones del día de hoy." };
    }

    await db.update(atenciones).set({
      anulado: true,
      motivoAnulacion: motivoAnulacion.trim(),
    }).where(eq(atenciones.id, id));
  } catch (e) {
    console.error("Error anulando atencion:", e);
    return { error: "No se pudo anular la atención. Intentá de nuevo." };
  }

  revalidatePath("/caja");
  return {}; // No redirect — el usuario sigue en la página de caja
}

// ─── cerrarCaja ───────────────────────────────────────

export async function cerrarCaja(
  prevState: CierreFormState,
  formData: FormData
): Promise<CierreFormState> {
  // 1. Verificar sesión admin
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return { error: "Solo el administrador puede cerrar la caja." };
  }

  const fechaHoy = getFechaHoy();

  // 2. Verificar que no existe cierre para hoy
  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) {
    const d = new Date(fechaHoy + "T12:00:00");
    const fechaFormateada = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
    return { error: `La caja del ${fechaFormateada} ya fue cerrada.` };
  }

  try {
    // 3. Traer todas las atenciones no anuladas del día
    const atencionesDelDia = await db
      .select()
      .from(atenciones)
      .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

    // 4. Calcular totales generales
    const totalBruto = atencionesDelDia.reduce((sum, a) => sum + Number(a.precioCobrado ?? 0), 0);
    const totalComisionesMedios = atencionesDelDia.reduce((sum, a) => sum + Number(a.comisionMedioPagoMonto ?? 0), 0);
    const totalNeto = atencionesDelDia.reduce((sum, a) => sum + Number(a.montoNeto ?? 0), 0);
    const cantidadAtenciones = atencionesDelDia.length;

    // 5. Totales por medio de pago — necesitamos los nombres de medios de pago
    const mediosPagoList = await db.select().from(mediosPago);
    const mediosPagoMap = new Map(mediosPagoList.map(m => [m.id, m]));

    // Acumular por nombre de medio de pago
    const totalesPorMedio: Record<string, number> = {};
    for (const a of atencionesDelDia) {
      if (!a.medioPagoId) continue;
      const mp = mediosPagoMap.get(a.medioPagoId);
      const nombre = (mp?.nombre ?? "otro").toLowerCase();
      totalesPorMedio[nombre] = (totalesPorMedio[nombre] ?? 0) + Number(a.precioCobrado ?? 0);
    }

    // Mapear a campos del schema
    const totalEfectivo = totalesPorMedio["efectivo"] ?? 0;
    const totalTransferencia = totalesPorMedio["transferencia"] ?? 0;
    // MP: cualquier medio que contenga "mercado" o "mp" o "link"
    const totalMp = Object.entries(totalesPorMedio)
      .filter(([k]) => k.includes("mercado") || k.includes(" mp") || k === "mp" || k.includes("link"))
      .reduce((sum, [, v]) => sum + v, 0);
    // Posnet: cualquier medio que contenga "posnet"
    const totalPosnet = Object.entries(totalesPorMedio)
      .filter(([k]) => k.includes("posnet"))
      .reduce((sum, [, v]) => sum + v, 0);

    // 6. Resumen por barbero
    const barberosMap = new Map((await db.select().from(barberos)).map(b => [b.id, b]));
    const resumenBarberos: Record<string, {
      nombre: string;
      cortes: number;
      totalBruto: number;
      comisionCalculada: number;
      alquilerBancoDiario: number;
    }> = {};

    for (const a of atencionesDelDia) {
      if (!a.barberoId) continue;
      const barbero = barberosMap.get(a.barberoId);
      if (!barbero) continue;
      if (!resumenBarberos[a.barberoId]) {
        resumenBarberos[a.barberoId] = {
          nombre: barbero.nombre,
          cortes: 0,
          totalBruto: 0,
          comisionCalculada: 0,
          alquilerBancoDiario: barbero.tipoModelo === "hibrido"
            ? Number(barbero.alquilerBancoMensual ?? 0) / 30
            : 0,
        };
      }
      resumenBarberos[a.barberoId].cortes += 1;
      resumenBarberos[a.barberoId].totalBruto += Number(a.precioCobrado ?? 0);
      resumenBarberos[a.barberoId].comisionCalculada += Number(a.comisionBarberoMonto ?? 0);
    }

    // 7. Calcular total productos vendidos en el día
    const fechaHoyDate = new Date(fechaHoy + "T00:00:00-03:00");
    const finDia = new Date(fechaHoy + "T23:59:59-03:00");
    const ventasProductos = await db.select().from(stockMovimientos)
      .where(and(
        eq(stockMovimientos.tipo, "venta"),
        gte(stockMovimientos.fecha, fechaHoyDate),
        lte(stockMovimientos.fecha, finDia)
      ));
    const totalProdVenta = ventasProductos.reduce(
      (sum, v) => sum + Math.abs(Number(v.cantidad ?? 0)) * Number(v.precioUnitario ?? 0),
      0
    );

    // 9. Obtener barbero del admin que cierra (para cerradoPor)
    const [barberoAdmin] = await db
      .select({ id: barberos.id })
      .from(barberos)
      .where(eq(barberos.userId, session!.user.id))
      .limit(1);

    // 10. Insertar cierre
    const [nuevoCierre] = await db
      .insert(cierresCaja)
      .values({
        fecha: fechaHoy,
        totalEfectivo: String(totalEfectivo.toFixed(2)),
        totalMp: String(totalMp.toFixed(2)),
        totalTransferencia: String(totalTransferencia.toFixed(2)),
        totalPosnet: String(totalPosnet.toFixed(2)),
        totalBruto: String(totalBruto.toFixed(2)),
        totalComisionesMedios: String(totalComisionesMedios.toFixed(2)),
        totalNeto: String(totalNeto.toFixed(2)),
        totalCortesBruto: String(totalBruto.toFixed(2)),
        totalProductos: String(totalProdVenta.toFixed(2)),
        resumenBarberos,
        cantidadAtenciones,
        cerradoPor: barberoAdmin?.id ?? null,
        cerradoEn: new Date(),
      })
      .returning();

    // 11. Vincular atenciones al cierre
    if (atencionesDelDia.length > 0) {
      await db
        .update(atenciones)
        .set({ cierreCajaId: nuevoCierre.id })
        .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));
    }
  } catch (e) {
    console.error("Error cerrando caja:", e);
    return { error: "No se pudo cerrar la caja. Intentá de nuevo." };
  }

  revalidatePath("/caja");
  redirect(`/caja/cierre/${getFechaHoy()}`);
}

// ─── registrarVentaProducto ───────────────────────────

export type VentaProductoFormState = {
  error?: string;
  fieldErrors?: {
    productoId?: string;
    cantidad?: string;
    precioCobrado?: string;
    medioPagoId?: string;
  };
};

export async function registrarVentaProducto(
  prevState: VentaProductoFormState,
  formData: FormData
): Promise<VentaProductoFormState> {
  // Leer campos
  const productoId = formData.get("productoId") as string;
  const cantidadStr = formData.get("cantidad") as string;
  const precioCobradoStr = formData.get("precioCobrado") as string;
  const medioPagoId = formData.get("medioPagoId") as string;

  // Validaciones
  const fieldErrors: VentaProductoFormState["fieldErrors"] = {};
  if (!productoId) fieldErrors.productoId = "Seleccioná un producto";
  if (!cantidadStr || isNaN(Number(cantidadStr)) || Number(cantidadStr) < 1) {
    fieldErrors.cantidad = "La cantidad debe ser al menos 1";
  }
  if (precioCobradoStr === "" || precioCobradoStr === null || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }
  if (!medioPagoId) fieldErrors.medioPagoId = "Seleccioná un medio de pago";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verificar sesión
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: "Debés iniciar sesión para realizar esta operación." };
  }

  // Verificar que no hay cierre para hoy
  const fechaHoy = getFechaHoy();
  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) {
    return { error: "La caja ya fue cerrada. No se pueden registrar nuevas ventas." };
  }

  const cantidad = parseInt(cantidadStr, 10);
  const precioCobrado = Number(precioCobradoStr);

  // Verificar que el producto exista, esté activo y tenga stock suficiente
  const [producto] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, productoId))
    .limit(1);

  if (!producto) return { fieldErrors: { productoId: "Producto no encontrado" } };
  if (!producto.activo) return { fieldErrors: { productoId: "El producto no está activo" } };
  if ((producto.stockActual ?? 0) < cantidad) {
    return { error: `Sin stock disponible. Stock actual: ${producto.stockActual ?? 0}` };
  }

  try {
    // Decrementar stock
    await db
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} - ${cantidad}` })
      .where(eq(productos.id, productoId));

    // Insertar movimiento de stock
    const precioUnitario = precioCobrado / cantidad;
    await db.insert(stockMovimientos).values({
      productoId,
      tipo: "venta",
      cantidad: -cantidad,
      precioUnitario: String(precioUnitario.toFixed(2)),
      notas: medioPagoId,
    });
  } catch (e) {
    console.error("Error registrando venta de producto:", e);
    return { error: "No se pudo registrar la venta. Intentá de nuevo." };
  }

  revalidatePath("/caja");
  revalidatePath("/inventario");
  redirect("/caja");
}
