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
import { buildCierreResumen } from "@/lib/caja-finance";
import { getCajaActorContext } from "@/lib/caja-access";
import {
  crearAtencionDesdeInput,
  getFechaHoyArgentina,
  getQuickActionDefaultsForBarbero,
  resolveCajaActorBarberoId,
  hasCajaCerradaHoy,
  syncProductosAtencion,
  type ProductoSeleccionadoInput,
} from "@/lib/caja-atencion";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type CierreFormState = {
  error?: string;
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getFechaHoy(): string {
  return getFechaHoyArgentina();
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

// â”€â”€â”€ registrarAtencion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function registrarAtencion(
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  const actor = await getCajaActorContext();
  if (!actor) {
    return { error: "DebÃ©s iniciar sesiÃ³n para registrar atenciones." };
  }

  // Leer campos
  const barberoId = formData.get("barberoId") as string;
  const servicioId = formData.get("servicioId") as string;
  const clientIdRaw = (formData.get("clientId") as string | null) ?? "";
  const clientId = clientIdRaw.trim() || null;
  const medioPagoId = formData.get("medioPagoId") as string;
  const precioCobradoStr = formData.get("precioCobrado") as string;
  const adicionalesIds = formData.getAll("adicionalesIds") as string[]; // mÃºltiples
  const notas = formData.get("notas") as string | null;

  const productosSeleccionados = parseProductosSeleccionados(formData);

  // Validaciones
  const fieldErrors: AtencionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "SeleccionÃ¡ un barbero";
  if (!servicioId) fieldErrors.servicioId = "SeleccionÃ¡ un servicio";
  if (!medioPagoId) fieldErrors.medioPagoId = "SeleccionÃ¡ un medio de pago";
  if (precioCobradoStr === "" || precioCobradoStr === null || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }

  if (!actor.isAdmin) {
    if (!actor.barberoId) {
      return { error: "Tu usuario no tiene un barbero activo vinculado." };
    }
    if (barberoId && barberoId !== actor.barberoId) {
      fieldErrors.barberoId = "Solo podÃ©s registrar atenciones para tu perfil.";
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
    console.error("Error registrando atencion:", e);
    return {
      error: e instanceof Error ? e.message : "No se pudo registrar la atención. Intentá de nuevo.",
    };
  }

  revalidatePath("/caja");
  revalidatePath("/hoy");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  if (clientId) {
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
  }
  redirect("/caja");
}

// â”€â”€â”€ editarAtencion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AtencionRapidaState = {
  error?: string;
};

async function registrarAtencionRapidaInterna(
  medioPagoIdOverride?: string
): Promise<AtencionRapidaState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  if (!userId) {
    return { error: "DebÃƒÂ©s iniciar sesiÃƒÂ³n para registrar una atenciÃƒÂ³n." };
  }

  if (await hasCajaCerradaHoy()) {
    return { error: "La caja del dÃƒÂ­a ya fue cerrada. No se pueden registrar nuevas atenciones." };
  }

  const barberoId = await resolveCajaActorBarberoId(userId, userRole === "admin");
  if (!barberoId) {
    return { error: "No encontrÃƒÂ© un barbero activo vinculado para usar la acciÃƒÂ³n rÃƒÂ¡pida." };
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
    console.error("Error registrando atencion rapida:", error);
    return { error: "No se pudo registrar la atenciÃƒÂ³n rÃƒÂ¡pida. IntentÃƒÂ¡ de nuevo." };
  }

  revalidatePath("/caja");
  revalidatePath("/hoy");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
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

// Acción express: acepta servicioId + medioPagoId explícitos desde el panel de caja
export async function registrarAtencionExpressAction(
  prevState: AtencionRapidaState,
  formData: FormData
): Promise<AtencionRapidaState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  if (!userId) return { error: "Debés iniciar sesión para registrar una atención." };
  if (await hasCajaCerradaHoy()) return { error: "La caja del día ya fue cerrada." };

  const barberoId = await resolveCajaActorBarberoId(userId, userRole === "admin");
  if (!barberoId) return { error: "No encontré un barbero activo vinculado." };

  const servicioId = formData.get("servicioId") as string | null;
  const medioPagoId = formData.get("medioPagoId") as string | null;
  const precioCobradoStr = formData.get("precioCobrado") as string | null;

  if (!servicioId) return { error: "Seleccioná un servicio." };
  if (!medioPagoId) return { error: "Seleccioná un medio de pago." };

  const precioCobrado = Number(precioCobradoStr ?? 0);
  if (!precioCobradoStr || isNaN(precioCobrado) || precioCobrado <= 0) {
    return { error: "El precio del servicio no es válido." };
  }

  try {
    await crearAtencionDesdeInput({ barberoId, servicioId, medioPagoId, precioCobrado });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error registrando atencion express:", message);
    return { error: "No se pudo registrar la atención. Intentá de nuevo." };
  }

  revalidatePath("/caja");
  revalidatePath("/hoy");
  revalidatePath("/dashboard");
  redirect("/caja");
}

export async function editarAtencion(
  id: string,
  prevState: AtencionFormState,
  formData: FormData
): Promise<AtencionFormState> {
  const actor = await getCajaActorContext();
  if (!actor) {
    return { error: "DebÃ©s iniciar sesiÃ³n para editar atenciones." };
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

  if (!atencionExistente) return { error: "AtenciÃ³n no encontrada." };
  if (atencionExistente.anulado) return { error: "No se puede editar una atenciÃ³n anulada." };
  if (atencionExistente.fecha !== getFechaHoy()) {
    return { error: "Solo se pueden editar atenciones del dÃ­a de hoy." };
  }

  const fieldErrors: AtencionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "SeleccionÃ¡ un barbero";
  if (!servicioId) fieldErrors.servicioId = "SeleccionÃ¡ un servicio";
  if (!medioPagoId) fieldErrors.medioPagoId = "SeleccionÃ¡ un medio de pago";
  if (precioCobradoStr === "" || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }
  if (!actor.isAdmin) {
    if (!actor.barberoId) {
      return { error: "Tu usuario no tiene un barbero activo vinculado." };
    }
    if (atencionExistente.barberoId !== actor.barberoId) {
      return { error: "Solo podÃ©s editar atenciones de tu perfil." };
    }
    if (barberoId && barberoId !== actor.barberoId) {
      fieldErrors.barberoId = "Solo podÃ©s editar atenciones de tu perfil.";
    }
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
    // Verificar que la atenciÃ³n existe y es de hoy
    const [atencionExistente] = await db
      .select()
      .from(atenciones)
      .where(eq(atenciones.id, id))
      .limit(1);

    if (!atencionExistente) return { error: "AtenciÃ³n no encontrada." };
    if (atencionExistente.anulado) return { error: "No se puede editar una atenciÃ³n anulada." };
    if (atencionExistente.fecha !== getFechaHoy()) {
      return { error: "Solo se pueden editar atenciones del dÃ­a de hoy." };
    }

    const [barbero] = await db.select().from(barberos).where(eq(barberos.id, barberoId)).limit(1);
    const [medioPago] = await db.select().from(mediosPago).where(eq(mediosPago.id, medioPagoId)).limit(1);
    const [servicio] = await db.select().from(servicios).where(eq(servicios.id, servicioId)).limit(1);

    if (!barbero || !medioPago || !servicio) return { error: "Datos invÃ¡lidos." };

    const precioCobrado = Number(precioCobradoStr);
    const comisionMpPct = Number(medioPago.comisionPorcentaje ?? 0);
    const comisionMpMonto = precioCobrado * comisionMpPct / 100;
    const montoNeto = precioCobrado - comisionMpMonto;
    const comisionBarberoPct = Number(barbero.porcentajeComision ?? 0);
    const comisionBarberoMonto = precioCobrado * comisionBarberoPct / 100;

    await db.transaction(async (tx) => {
      await tx.update(atenciones).set({
        barberoId,
        clientId,
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
      error: e instanceof Error ? e.message : "No se pudo actualizar la atención. Intentá de nuevo.",
    };
  }

  revalidatePath("/caja");
  revalidatePath("/hoy");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  if (clientId) {
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
  }
  if (atencionExistente.clientId && atencionExistente.clientId !== clientId) {
    revalidatePath(`/clientes/${atencionExistente.clientId}`);
  }
  redirect("/caja");
}

// â”€â”€â”€ anularAtencion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    return { fieldErrors: { motivoAnulacion: "El motivo de anulaciÃ³n es requerido" } };
  }

  try {
    const [atencionExistente] = await db
      .select()
      .from(atenciones)
      .where(eq(atenciones.id, id))
      .limit(1);

    if (!atencionExistente) return { error: "AtenciÃ³n no encontrada." };
    if (atencionExistente.anulado) return { error: "Esta atenciÃ³n ya estÃ¡ anulada." };
    if (atencionExistente.fecha !== getFechaHoy()) {
      return { error: "Solo se pueden anular atenciones del dÃ­a de hoy." };
    }

    await db.update(atenciones).set({
      anulado: true,
      motivoAnulacion: motivoAnulacion.trim(),
    }).where(eq(atenciones.id, id));
  } catch (e) {
    console.error("Error anulando atencion:", e);
    return { error: "No se pudo anular la atenciÃ³n. IntentÃ¡ de nuevo." };
  }

  revalidatePath("/caja");
  revalidatePath("/hoy");
  return {}; // No redirect â€” el usuario sigue en la pÃ¡gina de caja
}

// â”€â”€â”€ cerrarCaja â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function cerrarCaja(
  prevState: CierreFormState,
  formData: FormData
): Promise<CierreFormState> {
  // 1. Verificar sesiÃ³n admin
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
    // 3. Traer todas las atenciones no anuladas del dÃ­a
    const atencionesDelDia = await db
      .select()
      .from(atenciones)
      .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

    const barberosList = await db.select().from(barberos);
    const mediosPagoList = await db.select().from(mediosPago);
    const cantidadAtenciones = atencionesDelDia.length;

    // 4. Calcular totales generales y caja neta real del dÃ­a
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

    // 5. Totales por medio de pago â€” servicios + productos
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
    const [barberoAdmin] = await db
      .select({ id: barberos.id })
      .from(barberos)
      .where(eq(barberos.userId, session!.user.id))
      .limit(1);

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
        cerradoPor: barberoAdmin?.id ?? null,
        cerradoEn: new Date(),
      })
      .returning();

    // 8. Vincular atenciones al cierre
    if (atencionesDelDia.length > 0) {
      await db
        .update(atenciones)
        .set({ cierreCajaId: nuevoCierre.id })
        .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));
    }
  } catch (e) {
    console.error("Error cerrando caja:", e);
    return { error: "No se pudo cerrar la caja. IntentÃ¡ de nuevo." };
  }

  revalidatePath("/caja");
  revalidatePath("/hoy");
  redirect(`/caja/cierre/${getFechaHoy()}`);
}

// â”€â”€â”€ registrarVentaProducto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  if (!productoId) fieldErrors.productoId = "SeleccionÃ¡ un producto";
  if (!cantidadStr || isNaN(Number(cantidadStr)) || Number(cantidadStr) < 1) {
    fieldErrors.cantidad = "La cantidad debe ser al menos 1";
  }
  if (precioCobradoStr === "" || precioCobradoStr === null || isNaN(Number(precioCobradoStr))) {
    fieldErrors.precioCobrado = "El precio es requerido";
  } else if (Number(precioCobradoStr) < 0) {
    fieldErrors.precioCobrado = "El precio no puede ser negativo";
  }
  if (!medioPagoId) fieldErrors.medioPagoId = "SeleccionÃ¡ un medio de pago";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Verificar sesiÃ³n
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: "DebÃ©s iniciar sesiÃ³n para realizar esta operaciÃ³n." };
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

  // Verificar que el producto exista, estÃ© activo y tenga stock suficiente
  const [producto] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, productoId))
    .limit(1);

  if (!producto) return { fieldErrors: { productoId: "Producto no encontrado" } };
  if (!producto.activo) return { fieldErrors: { productoId: "El producto no estÃ¡ activo" } };
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
    const costoUnitarioSnapshot = Number(producto.costoCompra ?? 0);
    await db.insert(stockMovimientos).values({
      productoId,
      tipo: "venta",
      cantidad: -cantidad,
      precioUnitario: String(precioUnitario.toFixed(2)),
      costoUnitarioSnapshot: String(costoUnitarioSnapshot.toFixed(2)),
      notas: medioPagoId,
    });
  } catch (e) {
    console.error("Error registrando venta de producto:", e);
    return { error: "No se pudo registrar la venta. IntentÃ¡ de nuevo." };
  }

  revalidatePath("/caja");
  revalidatePath("/hoy");
  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  redirect("/caja");
}
