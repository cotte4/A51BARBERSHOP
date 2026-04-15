export const runtime = "nodejs";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  servicios,
  mediosPago,
  stockMovimientos,
  productos,
} from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

function fechasDelMes(mes: number, anio: number): { inicio: string; fin: string } {
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fin };
}

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

/** Formato DD/MM/YYYY a partir de un string ISO YYYY-MM-DD */
function formatFecha(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Convierte un timestamp o Date a fecha local Argentina en formato DD/MM/YYYY */
function formatTimestamp(ts: Date | string | null): string {
  if (!ts) return "";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Escapa un campo CSV: encierra en comillas si contiene coma, comilla o salto de línea */
function csvField(val: string | number): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes: mesParam } = await params;

  // Solo admin
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") {
    return new Response("Forbidden", { status: 403 });
  }

  // Parsear mes: espera formato YYYY-MM
  const parts = mesParam.split("-");
  if (parts.length !== 2) {
    return new Response("Formato de mes inválido. Usar YYYY-MM", { status: 400 });
  }
  const anio = parseInt(parts[0]!, 10);
  const mes = parseInt(parts[1]!, 10);

  if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12 || anio < 2020 || anio > 2100) {
    return new Response("Mes o año fuera de rango", { status: 400 });
  }

  const { inicio, fin } = fechasDelMes(mes, anio);

  // ——— Servicios (atenciones) del mes ———
  const atencionesMes = await db
    .select({
      fecha: atenciones.fecha,
      precioCobrado: atenciones.precioCobrado,
      comisionMedioPagoMonto: atenciones.comisionMedioPagoMonto,
      montoNeto: atenciones.montoNeto,
      barberoId: atenciones.barberoId,
      servicioId: atenciones.servicioId,
      medioPagoId: atenciones.medioPagoId,
    })
    .from(atenciones)
    .where(
      and(
        gte(atenciones.fecha, inicio),
        lte(atenciones.fecha, fin),
        eq(atenciones.anulado, false)
      )
    );

  // Mapas auxiliares
  const [listaBarberos, listaServicios, listaMedios] = await Promise.all([
    db.select({ id: barberos.id, nombre: barberos.nombre }).from(barberos),
    db.select({ id: servicios.id, nombre: servicios.nombre }).from(servicios),
    db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago),
  ]);

  const barberosMap = new Map(listaBarberos.map((b) => [b.id, b.nombre]));
  const serviciosMap = new Map(listaServicios.map((s) => [s.id, s.nombre]));
  const mediosMap = new Map(listaMedios.map((m) => [m.id, m.nombre]));

  // ——— Ventas de producto del mes ———
  const ventasMes = await db
    .select({
      fecha: stockMovimientos.fecha,
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
    (await db.select({ id: productos.id, nombre: productos.nombre }).from(productos)).map((p) => [
      p.id,
      p.nombre,
    ])
  );

  // ——— Construir filas ———
  type CsvRow = {
    fechaISO: string; // para ordenar
    fecha: string;
    tipo: string;
    descripcion: string;
    barbero: string;
    precio_final: number;
    medio_de_pago: string;
    comision_mp: number;
    neto_casa: number;
  };

  const rows: CsvRow[] = [];

  for (const a of atencionesMes) {
    const precioFinal = toNum(a.precioCobrado);
    const comisionMp = toNum(a.comisionMedioPagoMonto);
    const netoCasa = precioFinal - comisionMp;

    rows.push({
      fechaISO: a.fecha,
      fecha: formatFecha(a.fecha),
      tipo: "servicio",
      descripcion: a.servicioId ? (serviciosMap.get(a.servicioId) ?? "Servicio") : "Servicio",
      barbero: a.barberoId ? (barberosMap.get(a.barberoId) ?? "") : "",
      precio_final: precioFinal,
      medio_de_pago: a.medioPagoId ? (mediosMap.get(a.medioPagoId) ?? "") : "",
      comision_mp: comisionMp,
      neto_casa: netoCasa,
    });
  }

  for (const v of ventasMes) {
    const cant = Math.abs(Number(v.cantidad ?? 1));
    const precio = toNum(v.precioUnitario) * cant;
    const fechaStr = formatTimestamp(v.fecha);
    const fechaISO =
      v.fecha instanceof Date
        ? v.fecha.toISOString().slice(0, 10)
        : String(v.fecha).slice(0, 10);

    rows.push({
      fechaISO,
      fecha: fechaStr,
      tipo: "producto",
      descripcion: v.productoId ? (productosMap.get(v.productoId) ?? "Producto") : "Producto",
      barbero: "",
      precio_final: precio,
      medio_de_pago: "",
      comision_mp: 0,
      neto_casa: precio,
    });
  }

  // Ordenar por fecha ASC
  rows.sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));

  // ——— Generar CSV ———
  const HEADER = "fecha,tipo,descripcion,barbero,precio_final,medio_de_pago,comision_mp,neto_casa";

  const lines = rows.map((r) =>
    [
      csvField(r.fecha),
      csvField(r.tipo),
      csvField(r.descripcion),
      csvField(r.barbero),
      r.precio_final.toFixed(2),
      csvField(r.medio_de_pago),
      r.comision_mp.toFixed(2),
      r.neto_casa.toFixed(2),
    ].join(",")
  );

  const csv = [HEADER, ...lines].join("\r\n");
  const filename = `a51-transacciones-${mesParam}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
