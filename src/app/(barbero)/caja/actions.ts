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
import { eq, inArray, and, gte, lte } from "drizzle-orm";
import { buildCierreResumen } from "@/lib/caja-finance";
import { calculateAtencionCommission } from "@/lib/finance/commission";
import { assertCajaAbiertaOrThrow } from "@/lib/finance/closure-guard";
import { generarLiquidacionesDiariasParaFecha } from "@/lib/liquidaciones-service";
import {
  canManageCajaBarbero,
  getCajaActorContext,
  getCajaClosingBarberoIdForActor,
  hasCajaCerrada,
  hasCajaCerradaHoy,
  resolveCajaActorBarberoIdForActor,
} from "@/lib/dal/caja";
import {
  anularAtencionConReversion,
  crearAtencionDesdeInput,
  getFechaHoyArgentina,
  getQuickActionDefaultsForBarbero,
  registrarVentaProductoDesdeInput,
  syncMarcianoCorteUsoForAtencionChange,
  syncProductosAtencion,
  type ProductoSeleccionadoInput,
} from "@/lib/caja-atencion";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ———————————————————————————— Tipos ————————————————————————————

export type CierreFormState = {
  error?: string;
  fieldErrors?: {
    efectivoContado?: string;
  };
};

export type AtencionFormState = {
  error?: string;
  fieldErrors?: {
    barberoId?: string;
    clientId?: string;
    servicioId?: string;
    medioPagoId?: string;
    precioCobrado?: string;
    motivoAnulacion?: string;
  };
};

// ———————————————————————————— Helpers ————————————————————————————

function getFechaHoy(): string {
  return getFechaHoyArgentina();
}

function revalidateCajaViews(options?: {
  includeInventario?: boolean;
  includeDashboard?: boolean;
}) {
  revalidatePath("/caja");
  revalidatePath("/hoy");

  if (options?.includeInventario) {
    revalidatePath("/inventario");
  }

  if (options?.includeDashboard) {
    revalidatePath("/dashboard");
  }
}

function parseProductosSeleccionados(formData: FormData): ProductoSeleccionadoInput[] {
  const productosRaw = formData.get("productosSeleccionados");

  if (typeof productosRaw !== "string" || productosRaw.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(productosRaw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        productoId:
          typeof item?.id === "string"
            ? item.id
            : typeof item?.productoId === "string"
              ? item.productoId
              : "",
        cantidad: Number(item?.cantidad ?? 0),
        precioUnitario: Number(item?.precioUnitario ?? 0),
        esMarcianoIncluido: Boolean(item?.esMarcianoIncluido),
      }))
      .filter(
        (item) =>
          item.productoId &&
          Number.isFinite(item.cantidad) &&
          item.cantidad > 0 &&
          Number.isFinite(item.precioUnitario) &&
          item.precioUnitario >= 0
      );
  } catch (error) {
    console.error("No se pudo parsear productosSeleccionados", error);
    return [];
  }
}

// ———————————————————————————— registrarAtencion ————————————————————————————

export async function registrarAtencion(
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  const actor = await getCajaActorContext();
  if (!actor) {
    return { error: "Debes iniciar sesión para registrar atenciones." };
  }

  // Leer campos
  const barberoId = formData.get("barberoId") as string;
  const servicioId = formData.get("servicioId") as string;
  const clientIdRaw = (formData.get("clientId") as string | null) ?? "";
  const clientId = clientIdRaw.trim() || null;
  const medioPagoId = formData.get("medioPagoId") as string;
  const precioCobradoStr = formData.get("precioCobrado") as string;
  const adicionalesIds = formData.getAll("adicionalesIds") as string[]; // multiples
  const notas = formData.get("notas") as string | null;

  const productosSeleccionados = parseProductosSeleccionados(formData);

  // Validaciones
  const fieldErrors: AtencionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "Selecciona un barbero";
  if (!servicioId) fieldErrors.servicioId = "Selecciona un servicio";
  if (!medioPagoId) fieldErrors.medioPagoId = "Selecciona un medio de pago";
  if (precioCobradoStr === "" || precioCobradoStr === null || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }

  if (!actor.isAdmin) {
    if (!actor.barberoId) {
      return { error: "Tu usuario no tiene un barbero activo vinculado." };
    }
    if (barberoId && !canManageCajaBarbero(actor, barberoId)) {
      fieldErrors.barberoId = "Solo podés registrar atenciones para tu perfil.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verificar que no hay cierre para hoy
  if (await hasCajaCerradaHoy()) {
    const d = new Date(getFechaHoy() + "T12:00:00");
    const fechaFormateada = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
    return { error: `La caja del ${fechaFormateada} ya fue cerrada. No se pueden registrar nuevas atenciones.` };
  }

  try {
    await crearAtencionDesdeInput({
      barberoId,
      clientId,
      servicioId,
      medioPagoId,
      precioCobrado: Number(precioCobradoStr),
      adicionalesIds,
      productos: productosSeleccionados,
      notas,
    });
  } catch (e) {
    console.error("Error registrando atención:", e);
    return {
      error: e instanceof Error ? e.message : "No se pudo registrar la atención. Intenta de nuevo.",
    };
  }

  revalidateCajaViews({ includeInventario: true, includeDashboard: true });
  if (clientId) {
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
  }
  redirect("/caja");
}

// ———————————————————————————— editarAtencion ————————————————————————————

export type AtencionRapidaState = {
  error?: string;
};

async function registrarAtencionRapidaInterna(
  medioPagoIdOverride?: string
): Promise<AtencionRapidaState> {
  const actor = await getCajaActorContext();

  if (!actor) {
    return { error: "Debes iniciar sesión para registrar una atención." };
  }

  if (await hasCajaCerradaHoy()) {
    return { error: "La caja del día ya fue cerrada. No se pueden registrar nuevas atenciones." };
  }

  const barberoId = await resolveCajaActorBarberoIdForActor(actor);
  if (!barberoId) {
    return { error: "No encontré un barbero activo vinculado para usar la acción rápida." };
  }

  const defaults = await getQuickActionDefaultsForBarbero(barberoId);
  if (!defaults) {
    return { error: "Faltan el servicio o medio de pago por defecto del barbero." };
  }

  try {
    await crearAtencionDesdeInput({
      barberoId,
      servicioId: defaults.servicioId,
      medioPagoId: medioPagoIdOverride ?? defaults.medioPagoId,
      precioCobrado: defaults.precioBase,
    });
  } catch (error) {
    console.error("Error registrando atención rápida:", error);
    return { error: "No se pudo registrar la atención rápida. Intenta de nuevo." };
  }

  revalidateCajaViews({ includeInventario: true, includeDashboard: true });
  redirect("/caja");
}

export async function registrarAtencionRapidaAction(
  prevState: AtencionRapidaState
): Promise<AtencionRapidaState> {
  return registrarAtencionRapidaInterna();
}

export async function registrarAtencionRapidaSeleccionadaAction(
  prevState: AtencionRapidaState,
  formData: FormData
): Promise<AtencionRapidaState> {
  const medioPagoId = (formData.get("medioPagoId") as string | null) || undefined;
  return registrarAtencionRapidaInterna(medioPagoId);
}

export async function registrarAtencionRapidaConMedioAction(
  medioPagoId: string,
  prevState: AtencionRapidaState
): Promise<AtencionRapidaState> {
  return registrarAtencionRapidaInterna(medioPagoId);
}

function sanitizeReturnTo(value: string | null): string {
  if (value && value.startsWith("/")) return value;
  return "/caja";
}

// Accion express: acepta servicioId + medioPagoId explicitos desde el panel de caja
export async function registrarAtencionExpressAction(
  prevState: AtencionRapidaState,
  formData: FormData
): Promise<AtencionRapidaState> {
  const actor = await getCajaActorContext();

  if (!actor) return { error: "Debes iniciar sesión para registrar una atención." };
  if (await hasCajaCerradaHoy()) return { error: "La caja del día ya fue cerrada." };

  const barberoId = await resolveCajaActorBarberoIdForActor(actor);
  if (!barberoId) return { error: "No encontré un barbero activo vinculado." };

  const servicioId = formData.get("servicioId") as string | null;
  const medioPagoId = formData.get("medioPagoId") as string | null;
  const precioCobradoStr = formData.get("precioCobrado") as string | null;
  const returnTo = formData.get("returnTo") as string | null;

  if (!servicioId) return { error: "Selecciona un servicio." };
  if (!medioPagoId) return { error: "Selecciona un medio de pago." };

  const precioCobrado = Number(precioCobradoStr ?? 0);
  if (!precioCobradoStr || isNaN(precioCobrado) || precioCobrado <= 0) {
    return { error: "El precio del servicio no es válido." };
  }

  try {
    await crearAtencionDesdeInput({ barberoId, servicioId, medioPagoId, precioCobrado });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error registrando atención express:", message);
    return { error: "No se pudo registrar la atención. Intenta de nuevo." };
  }

  revalidateCajaViews({ includeDashboard: true });
  redirect(sanitizeReturnTo(returnTo));
}

export async function editarAtencion(
  id: string,
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  const actor = await getCajaActorContext();
  if (!actor) {
    return { error: "Debes iniciar sesión para editar atenciones." };
  }

  const barberoId = formData.get("barberoId") as string;
  const servicioId = formData.get("servicioId") as string;
  const clientIdRaw = (formData.get("clientId") as string | null) ?? "";
  const clientId = clientIdRaw.trim() || null;
  const medioPagoId = formData.get("medioPagoId") as string;
  const precioCobradoStr = formData.get("precioCobrado") as string;
  const adicionalesIds = formData.getAll("adicionalesIds") as string[];
  const productosSeleccionados = parseProductosSeleccionados(formData);
  const notas = formData.get("notas") as string | null;

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

  const fieldErrors: AtencionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "Selecciona un barbero";
  if (!servicioId) fieldErrors.servicioId = "Selecciona un servicio";
  if (!medioPagoId) fieldErrors.medioPagoId = "Selecciona un medio de pago";
  if (precioCobradoStr === "" || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }
  if (!actor.isAdmin) {
    if (!actor.barberoId) {
      return { error: "Tu usuario no tiene un barbero activo vinculado." };
    }
    if (!canManageCajaBarbero(actor, atencionExistente.barberoId)) {
      return { error: "Solo podés editar atenciones de tu perfil." };
    }
    if (barberoId && !canManageCajaBarbero(actor, barberoId)) {
      fieldErrors.barberoId = "Solo podés editar atenciones de tu perfil.";
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verificar que no hay cierre para hoy
  if (await hasCajaCerrada(getFechaHoy())) {
    const d = new Date(getFechaHoy() + "T12:00:00");
    const fechaFormateada = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
    return { error: `La caja del ${fechaFormateada} ya fue cerrada. No se pueden registrar nuevas atenciones.` };
  }

  try {
    // Verificar que la atencion existe y es de hoy
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
    const servicePrecioBase = servicio.precioBase ?? String(precioCobrado);
    const commission = calculateAtencionCommission({
      precioCobrado,
      comisionMedioPagoPct: Number(medioPago.comisionPorcentaje ?? 0),
      comisionBarberoPct: Number(barbero.porcentajeComision ?? 0),
      servicioPrecioBase: Number(servicePrecioBase),
    });

    await db.transaction(async (tx) => {
      await tx.update(atenciones).set({
        barberoId,
        clientId,
        servicioId,
        precioCobrado: String(precioCobrado),
        precioBase: servicePrecioBase,
        medioPagoId,
        comisionMedioPagoPct: String(commission.comisionMedioPagoPct),
        comisionMedioPagoMonto: String(commission.comisionMedioPagoMonto.toFixed(2)),
        montoNeto: String(commission.montoNeto.toFixed(2)),
        comisionBarberoPct: String(commission.comisionBarberoPct),
        comisionBarberoMonto: String(commission.comisionBarberoMonto.toFixed(2)),
        notas: notas?.trim() || null,
      }).where(eq(atenciones.id, id));

      await syncMarcianoCorteUsoForAtencionChange({
        tx,
        fecha: atencionExistente.fecha,
        previousClientId: atencionExistente.clientId,
        nextClientId: clientId,
      });

      await tx.delete(atencionesAdicionales).where(eq(atencionesAdicionales.atencionId, id));

      if (adicionalesIds.length > 0) {
        const adicionalesData = await tx
          .select()
          .from(serviciosAdicionales)
          .where(inArray(serviciosAdicionales.id, adicionalesIds));

        await tx.insert(atencionesAdicionales).values(
          adicionalesData.map((a) => ({
            atencionId: id,
            adicionalId: a.id,
            precioCobrado: a.precioExtra ?? "0",
          }))
        );
      }

      await syncProductosAtencion({
        tx,
        atencionId: id,
        clientId,
        medioPagoId,
        productosSeleccionados,
      });
    });
  } catch (e) {
    console.error("Error editando atencion:", e);
    return {
      error: e instanceof Error ? e.message : "No se pudo actualizar la atencion. Intenta de nuevo.",
    };
  }

  revalidateCajaViews({ includeInventario: true, includeDashboard: true });
  if (clientId) {
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
  }
  if (atencionExistente.clientId && atencionExistente.clientId !== clientId) {
    revalidatePath(`/clientes/${atencionExistente.clientId}`);
  }
  redirect("/caja");
}

// ———————————————————————————— anularAtencion ————————————————————————————

export async function anularAtencion(
  id: string,
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  // Verificar que el usuario es admin
  const actor = await getCajaActorContext();
  if (!actor?.isAdmin) {
    return { error: "Solo el administrador puede anular atenciones." };
  }

  const motivoAnulacion = formData.get("motivoAnulacion") as string;
  if (!motivoAnulacion || motivoAnulacion.trim() === "") {
    return { fieldErrors: { motivoAnulacion: "El motivo de anulacion es requerido" } };
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
    await assertCajaAbiertaOrThrow(atencionExistente.fecha);

    await anularAtencionConReversion({
      atencionId: id,
      motivoAnulacion,
    });
  } catch (e) {
    console.error("Error anulando atencion:", e);
    return { error: "No se pudo anular la atención. Intenta de nuevo." };
  }

  revalidateCajaViews();
  return {}; // No redirect: el usuario sigue en la pagina de caja
}

// ———————————————————————————— cerrarCaja ————————————————————————————

export async function cerrarCaja(
  prevState: CierreFormState,
  formData: FormData
): Promise<CierreFormState> {
  // 1. Verificar sesion admin
  const actor = await getCajaActorContext();
  if (!actor?.isAdmin) {
    return { error: "Solo el administrador puede cerrar la caja." };
  }

  // 1b. El conteo de efectivo es el paso 1 obligatorio del wizard: sin el, no se cierra.
  const efectivoContadoRaw = formData.get("efectivoContado");
  const efectivoContadoStr = typeof efectivoContadoRaw === "string" ? efectivoContadoRaw.trim() : "";
  if (efectivoContadoStr === "" || isNaN(Number(efectivoContadoStr))) {
    return {
      error: "Contá el efectivo físico antes de cerrar.",
      fieldErrors: { efectivoContado: "Ingresá el efectivo contado." },
    };
  }
  const efectivoContadoNum = Number(efectivoContadoStr);
  if (efectivoContadoNum < 0) {
    return {
      error: "El efectivo contado no puede ser negativo.",
      fieldErrors: { efectivoContado: "El monto no puede ser negativo." },
    };
  }

  const fechaHoy = getFechaHoy();

  // 2. Verificar que no existe cierre para hoy
  if (await hasCajaCerrada(fechaHoy)) {
    const d = new Date(fechaHoy + "T12:00:00");
    const fechaFormateada = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
    return { error: `La caja del ${fechaFormateada} ya fue cerrada.` };
  }

  try {
    // 3. Traer todas las atenciones no anuladas del dia
    const atencionesDelDia = await db
      .select()
      .from(atenciones)
      .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

    const barberosList = await db.select().from(barberos);
    const mediosPagoList = await db.select().from(mediosPago);
    const cantidadAtenciones = atencionesDelDia.length;

    // 4. Calcular totales generales y caja neta real del dia
    const fechaHoyDate = new Date(fechaHoy + "T00:00:00-03:00");
    const finDia = new Date(fechaHoy + "T23:59:59-03:00");
    const ventasProductos = await db.select().from(stockMovimientos)
      .where(and(
        eq(stockMovimientos.tipo, "venta"),
        gte(stockMovimientos.fecha, fechaHoyDate),
        lte(stockMovimientos.fecha, finDia)
      ));
    const productosList = ventasProductos.length > 0 ? await db.select().from(productos) : [];

    const cierreResumen = buildCierreResumen({
      fecha: fechaHoy,
      atenciones: atencionesDelDia,
      barberos: barberosList,
      ventasProductos: ventasProductos.map((venta) => ({
        productoId: venta.productoId,
        cantidad: venta.cantidad,
        precioUnitario: venta.precioUnitario,
        medioPagoId: venta.notas,
      })),
      productos: productosList,
      mediosPago: mediosPagoList,
    });

    const totalBruto = cierreResumen.totales.totalBrutoDia;
    const totalComisionesMedios = cierreResumen.totales.totalComisionesMediosDia;
    const totalNeto = cierreResumen.totales.cajaNetaDia;

    // 5. Totales por medio de pago: servicios + productos
    const mediosPagoMap = new Map(mediosPagoList.map(m => [m.id, m]));

    // Acumular por nombre de medio de pago
    const totalesPorMedio: Record<string, number> = {};
    for (const a of atencionesDelDia) {
      if (!a.medioPagoId) continue;
      const mp = mediosPagoMap.get(a.medioPagoId);
      const nombre = (mp?.nombre ?? "otro").toLowerCase();
      totalesPorMedio[nombre] = (totalesPorMedio[nombre] ?? 0) + Number(a.precioCobrado ?? 0);
    }
    for (const venta of ventasProductos) {
      if (!venta.notas) continue;
      const mp = mediosPagoMap.get(venta.notas);
      const nombre = (mp?.nombre ?? "otro").toLowerCase();
      const totalVenta = Math.abs(Number(venta.cantidad ?? 0)) * Number(venta.precioUnitario ?? 0);
      totalesPorMedio[nombre] = (totalesPorMedio[nombre] ?? 0) + totalVenta;
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

    // 6. Obtener barbero del admin que cierra (para cerradoPor)
    const barberoAdminId = await getCajaClosingBarberoIdForActor(actor);
    if (!barberoAdminId) {
      return { error: "No se encontró un barbero asociado a tu cuenta. Contacta al administrador." };
    }

    // 7. Insertar cierre
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
        totalCortesBruto: String(cierreResumen.totales.totalServiciosBruto.toFixed(2)),
        totalProductos: String(cierreResumen.totales.totalProductosBruto.toFixed(2)),
        resumenBarberos: cierreResumen,
        cantidadAtenciones,
        cerradoPor: barberoAdminId,
        cerradoEn: new Date(),
        efectivoContado: String(efectivoContadoNum.toFixed(2)),
      })
      .returning();

    // 8. Vincular atenciones al cierre
    if (atencionesDelDia.length > 0) {
      await db
        .update(atenciones)
        .set({ cierreCajaId: nuevoCierre.id })
        .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));
    }

    await generarLiquidacionesDiariasParaFecha({
      fecha: fechaHoy,
      notas: `Auto-liquidacion diaria desde cierre ${fechaHoy}.`,
    });
  } catch (e) {
    console.error("Error cerrando caja:", e);
    return { error: "No se pudo cerrar la caja. Intenta de nuevo." };
  }

  revalidateCajaViews();
  redirect(`/caja/cierre/${getFechaHoy()}`);
}

// ———————————————————————————— registrarVentaProducto ————————————————————————————

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
  if (!productoId) fieldErrors.productoId = "Selecciona un producto";
  if (!cantidadStr || isNaN(Number(cantidadStr)) || Number(cantidadStr) < 1) {
    fieldErrors.cantidad = "La cantidad debe ser al menos 1";
  }
  if (precioCobradoStr === "" || precioCobradoStr === null || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }
  if (!medioPagoId) fieldErrors.medioPagoId = "Selecciona un medio de pago";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verificar sesión
  const actor = await getCajaActorContext();
  if (!actor) {
    return { error: "Debes iniciar sesión para realizar esta operación." };
  }
  if (!actor.isAdmin && !actor.barberoId) {
    return { error: "Tu usuario no tiene un barbero activo vinculado." };
  }

  // Verificar que no hay cierre para hoy
  const fechaHoy = getFechaHoy();
  if (await hasCajaCerrada(fechaHoy)) {
    return { error: "La caja ya fue cerrada. No se pueden registrar nuevas ventas." };
  }

  const cantidad = parseInt(cantidadStr, 10);
  const precioCobrado = Number(precioCobradoStr);

  try {
    const result = await registrarVentaProductoDesdeInput({
      productoId,
      cantidad,
      precioCobrado,
      medioPagoId,
    });

    if (!result.ok) {
      return {
        error: result.error,
        fieldErrors: result.fieldErrors,
      };
    }
  } catch (e) {
    console.error("Error registrando venta de producto:", e);
    return { error: "No se pudo registrar la venta. Intenta de nuevo." };
  }

  revalidateCajaViews({ includeInventario: true });
  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  redirect("/caja");
}
