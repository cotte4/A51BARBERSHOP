/**
 * Importador de atenciones históricas desde un CSV exportado de Excel / Google Sheets.
 *
 * Carga las operaciones reales de la barbería (un corte por fila) a la tabla `atenciones`,
 * calculando comisiones con la MISMA lógica que la app (`calculateAtencionCommission`),
 * para que todo el reporting (mejor día, peor día, patrones semanales, por barbero, etc.)
 * funcione sobre datos reales.
 *
 * ── Cómo usar ──────────────────────────────────────────────────────────────
 *   1. En Google Sheets: Archivo → Descargar → CSV.
 *   2. Guardá el archivo en  scripts/import/atenciones.csv  (o pasá la ruta como 1er arg).
 *   3. Dry-run (NO escribe nada, solo valida y muestra el reporte):
 *        npm run import:atenciones
 *   4. Si el reporte se ve bien, commiteá a la base:
 *        npm run import:atenciones -- --commit
 *   5. (Opcional) reconstruir los cierres de caja diarios a partir de lo importado:
 *        npm run import:atenciones -- --commit --rebuild-cierres
 *
 * ── Columnas esperadas en el CSV ───────────────────────────────────────────
 * El header (primera fila) puede estar en español; el mapeo se configura en COLUMN_MAP.
 * Mínimas:  fecha, barbero, servicio, medio_pago, precio_cobrado
 * Opcionales: hora, precio_base, cliente, notas
 *
 * Si tus encabezados son distintos, NO renombres el Excel: ajustá COLUMN_MAP abajo.
 */

import "./load-env";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  cierresCaja,
  clients,
  mediosPago,
  servicios,
} from "@/db/schema";
import { calculateAtencionCommission } from "@/lib/finance/commission";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — ajustá esto a tu planilla
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapeo de "campo lógico" → posibles nombres de columna en tu CSV (case-insensitive,
 * sin acentos). Agregá variantes si tu header usa otras palabras.
 */
const COLUMN_MAP: Record<string, string[]> = {
  fecha: ["fecha", "dia", "date"],
  hora: ["hora", "time"],
  barbero: ["barbero", "barber", "peluquero"],
  servicio: ["servicio", "service", "corte"],
  medioPago: ["medio_pago", "medio de pago", "medio", "pago", "forma de pago"],
  precioCobrado: ["precio_cobrado", "precio cobrado", "precio", "monto", "importe", "total"],
  precioBase: ["precio_base", "precio base", "base"],
  cliente: ["cliente", "client", "nombre"],
  notas: ["notas", "nota", "obs", "observaciones", "comentario"],
};

/**
 * Alias de nombres → nombre canónico exacto que existe en la base de datos.
 * Usalo si en el Excel escribiste el nombre distinto a como está cargado en la app.
 * Ej: si en el Excel pusiste "efvo" pero el medio de pago se llama "Efectivo".
 */
const BARBERO_ALIASES: Record<string, string> = {
  // "pin": "Pinky",
};
const SERVICIO_ALIASES: Record<string, string> = {
  // "corte simple": "Corte",
};
const MEDIO_PAGO_ALIASES: Record<string, string> = {
  // "efvo": "Efectivo",
  // "mp": "Mercado Pago",
  // "transf": "Transferencia",
};

// ─────────────────────────────────────────────────────────────────────────────
// FLAGS
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const REBUILD_CIERRES = args.includes("--rebuild-cierres");
const FORCE = args.includes("--force");
const csvPathArg = args.find((a) => !a.startsWith("--"));
const CSV_PATH = resolve(process.cwd(), csvPathArg ?? "scripts/import/atenciones.csv");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .trim()
    .toLowerCase();
}

/** Parser de CSV mínimo con soporte de campos entre comillas y comas internas. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Parsea un monto en pesos tolerando $, espacios y separadores AR/US. */
function parseARS(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^0-9.,-]/g, "").trim();
  if (s === "" || s === "-") return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // El último separador es el decimal.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", "."); // formato AR: 14.000,50
    } else {
      s = s.replace(/,/g, ""); // formato US: 14,000.50
    }
  } else if (hasComma) {
    // Solo coma: decimal si hay exactamente 2 dígitos después, si no es separador de miles.
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length === 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  }
  // Solo punto: lo dejamos tal cual (asumimos decimal o entero).
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Normaliza una fecha a YYYY-MM-DD. Acepta YYYY-MM-DD y DD/MM/YYYY (o DD-MM-YYYY). */
function parseFecha(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** Normaliza hora a HH:MM:SS o null. */
function parseHora(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, h, mm, ss] = m;
  return `${h.padStart(2, "0")}:${mm}:${ss ?? "00"}`;
}

function fmtARS(n: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

type ResolvedRow = {
  line: number;
  fecha: string;
  hora: string | null;
  barberoId: string;
  servicioId: string;
  medioPagoId: string;
  clientId: string | null;
  precioCobrado: number;
  precioBase: number;
  comisionMedioPagoPct: number;
  comisionBarberoPct: number;
  notas: string | null;
};

async function main() {
  console.log(`\n📥 Importador de atenciones — A51 Barber`);
  console.log(`   Archivo: ${CSV_PATH}`);
  console.log(`   Modo:    ${COMMIT ? "COMMIT (escribe en la base)" : "DRY-RUN (solo valida)"}\n`);

  let text: string;
  try {
    text = readFileSync(CSV_PATH, "utf8");
  } catch {
    console.error(`❌ No pude leer el CSV en: ${CSV_PATH}`);
    console.error(`   Exportá tu planilla a CSV y guardala ahí, o pasá la ruta como argumento.`);
    process.exit(1);
  }

  const rows = parseCSV(text);
  if (rows.length < 2) {
    console.error("❌ El CSV no tiene filas de datos.");
    process.exit(1);
  }

  // Resolver columnas
  const header = rows[0].map(normalize);
  const colIndex: Record<string, number> = {};
  for (const [field, candidates] of Object.entries(COLUMN_MAP)) {
    const idx = header.findIndex((h) => candidates.map(normalize).includes(h));
    if (idx !== -1) colIndex[field] = idx;
  }

  const required = ["fecha", "barbero", "servicio", "medioPago", "precioCobrado"];
  const missing = required.filter((f) => colIndex[f] === undefined);
  if (missing.length > 0) {
    console.error(`❌ Faltan columnas requeridas: ${missing.join(", ")}`);
    console.error(`   Encabezados detectados: ${rows[0].join(" | ")}`);
    console.error(`   Ajustá COLUMN_MAP en scripts/import-atenciones.ts si tu header usa otros nombres.`);
    process.exit(1);
  }

  // Cargar master data de la base
  const [barberosDb, serviciosDb, mediosDb, clientsDb] = await Promise.all([
    db.select().from(barberos),
    db.select().from(servicios),
    db.select().from(mediosPago),
    db.select({ id: clients.id, name: clients.name }).from(clients),
  ]);

  const barberoByName = new Map(barberosDb.map((b) => [normalize(b.nombre), b]));
  const servicioByName = new Map(serviciosDb.map((s) => [normalize(s.nombre), s]));
  const medioByName = new Map(mediosDb.map((m) => [normalize(m.nombre), m]));
  const clientByName = new Map(clientsDb.map((c) => [normalize(c.name), c]));

  function resolveName<T>(
    raw: string,
    map: Map<string, T>,
    aliases: Record<string, string>
  ): T | undefined {
    const n = normalize(raw);
    const aliasTarget = aliases[n];
    if (aliasTarget) return map.get(normalize(aliasTarget));
    return map.get(n);
  }

  const resolved: ResolvedRow[] = [];
  const errors: string[] = [];
  const unmatched = { barberos: new Set<string>(), servicios: new Set<string>(), medios: new Set<string>() };

  const get = (row: string[], field: string): string =>
    colIndex[field] !== undefined ? (row[colIndex[field]] ?? "").trim() : "";

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;

    const fechaRaw = get(row, "fecha");
    const fecha = parseFecha(fechaRaw);
    if (!fecha) {
      errors.push(`L${line}: fecha inválida "${fechaRaw}"`);
      continue;
    }

    const barbero = resolveName(get(row, "barbero"), barberoByName, BARBERO_ALIASES);
    const servicio = resolveName(get(row, "servicio"), servicioByName, SERVICIO_ALIASES);
    const medio = resolveName(get(row, "medioPago"), medioByName, MEDIO_PAGO_ALIASES);

    if (!barbero) unmatched.barberos.add(get(row, "barbero"));
    if (!servicio) unmatched.servicios.add(get(row, "servicio"));
    if (!medio) unmatched.medios.add(get(row, "medioPago"));
    if (!barbero || !servicio || !medio) continue;

    const precioCobrado = parseARS(get(row, "precioCobrado"));
    if (precioCobrado === null || precioCobrado < 0) {
      errors.push(`L${line}: precio_cobrado inválido "${get(row, "precioCobrado")}"`);
      continue;
    }

    const precioBaseCsv = colIndex.precioBase !== undefined ? parseARS(get(row, "precioBase")) : null;
    const precioBase =
      precioBaseCsv ??
      (servicio.precioBase !== null ? Number(servicio.precioBase) : precioCobrado);

    // Cliente es opcional; solo se vincula si el nombre matchea uno existente.
    const clienteRaw = get(row, "cliente");
    const cliente = clienteRaw ? clientByName.get(normalize(clienteRaw)) : undefined;

    resolved.push({
      line,
      fecha,
      hora: parseHora(get(row, "hora")),
      barberoId: barbero.id,
      servicioId: servicio.id,
      medioPagoId: medio.id,
      clientId: cliente?.id ?? null,
      precioCobrado,
      precioBase,
      comisionMedioPagoPct: Number(medio.comisionPorcentaje ?? 0),
      comisionBarberoPct: Number(barbero.porcentajeComision ?? 0),
      notas: get(row, "notas") || null,
    });
  }

  // ── Reporte ────────────────────────────────────────────────────────────────
  const totalData = rows.length - 1;
  console.log(`📊 Filas de datos: ${totalData}`);
  console.log(`   ✅ Resueltas: ${resolved.length}`);
  console.log(`   ⚠️  Saltadas:  ${totalData - resolved.length}\n`);

  const reportUnmatched = (label: string, set: Set<string>, hint: string) => {
    if (set.size > 0) {
      console.log(`⚠️  ${label} sin match en la base (${set.size}):`);
      for (const v of set) console.log(`      "${v}"`);
      console.log(`   → ${hint}\n`);
    }
  };
  reportUnmatched("Barberos", unmatched.barberos, "Cargalos en la app o agregá un alias en BARBERO_ALIASES.");
  reportUnmatched("Servicios", unmatched.servicios, "Cargalos en la app o agregá un alias en SERVICIO_ALIASES.");
  reportUnmatched("Medios de pago", unmatched.medios, "Cargalos en la app o agregá un alias en MEDIO_PAGO_ALIASES.");

  if (errors.length > 0) {
    console.log(`❌ Errores de parseo (${errors.length}):`);
    for (const e of errors.slice(0, 30)) console.log(`      ${e}`);
    if (errors.length > 30) console.log(`      ... y ${errors.length - 30} más`);
    console.log();
  }

  if (resolved.length === 0) {
    console.log("Nada para importar. Corregí los problemas de arriba y volvé a correr.");
    process.exit(1);
  }

  // Resumen por fecha + totales (vista previa del análisis que vas a poder hacer)
  const fechas = resolved.map((r) => r.fecha).sort();
  const minFecha = fechas[0];
  const maxFecha = fechas[fechas.length - 1];
  const totalBruto = resolved.reduce((s, r) => s + r.precioCobrado, 0);
  console.log(`📅 Rango de fechas: ${minFecha} → ${maxFecha}`);
  console.log(`💰 Total bruto a importar: ${fmtARS(totalBruto)}`);
  console.log(`🧮 Cortes a importar: ${resolved.length}\n`);

  // Muestra de las primeras filas resueltas para que verifiques el parseo
  console.log("🔍 Muestra (primeras 5 filas resueltas):");
  for (const r of resolved.slice(0, 5)) {
    const comm = calculateAtencionCommission({
      precioCobrado: r.precioCobrado,
      comisionMedioPagoPct: r.comisionMedioPagoPct,
      comisionBarberoPct: r.comisionBarberoPct,
      servicioPrecioBase: r.precioBase,
    });
    console.log(
      `   ${r.fecha} ${r.hora ?? "--:--"} | cobrado ${fmtARS(r.precioCobrado)} | ` +
        `neto ${fmtARS(comm.montoNeto)} | comBarbero ${fmtARS(comm.comisionBarberoMonto)}`
    );
  }
  console.log();

  // ── Guardas de seguridad ─────────────────────────────────────────────────
  if (!COMMIT) {
    console.log("✅ DRY-RUN OK. Nada se escribió en la base.");
    console.log("   Para importar de verdad:  npm run import:atenciones -- --commit");
    process.exit(0);
  }

  // Chequeo de doble importación: ¿ya hay atenciones en el rango de fechas?
  const yaExisten = await db
    .select({ id: atenciones.id, fecha: atenciones.fecha })
    .from(atenciones)
    .where(and(gte(atenciones.fecha, minFecha), lte(atenciones.fecha, maxFecha)));
  if (yaExisten.length > 0 && !FORCE) {
    console.error(
      `❌ Ya hay ${yaExisten.length} atenciones entre ${minFecha} y ${maxFecha}.`
    );
    console.error(
      `   Importar de nuevo las duplicaría. Si estás seguro, agregá --force.`
    );
    process.exit(1);
  }

  // Insertar en lote dentro de una transacción
  console.log(`✍️  Insertando ${resolved.length} atenciones...`);
  const values = resolved.map((r) => {
    const comm = calculateAtencionCommission({
      precioCobrado: r.precioCobrado,
      comisionMedioPagoPct: r.comisionMedioPagoPct,
      comisionBarberoPct: r.comisionBarberoPct,
      servicioPrecioBase: r.precioBase,
    });
    return {
      barberoId: r.barberoId,
      clientId: r.clientId,
      servicioId: r.servicioId,
      fecha: r.fecha,
      hora: r.hora,
      precioBase: r.precioBase.toFixed(2),
      precioCobrado: r.precioCobrado.toFixed(2),
      medioPagoId: r.medioPagoId,
      comisionMedioPagoPct: comm.comisionMedioPagoPct.toFixed(2),
      comisionMedioPagoMonto: comm.comisionMedioPagoMonto.toFixed(2),
      montoNeto: comm.montoNeto.toFixed(2),
      comisionBarberoPct: comm.comisionBarberoPct.toFixed(2),
      comisionBarberoMonto: comm.comisionBarberoMonto.toFixed(2),
      notas: r.notas,
      anulado: false,
    };
  });

  await db.transaction(async (tx) => {
    const BATCH = 500;
    for (let i = 0; i < values.length; i += BATCH) {
      await tx.insert(atenciones).values(values.slice(i, i + BATCH));
    }
  });
  console.log(`✅ Importadas ${values.length} atenciones.\n`);

  if (REBUILD_CIERRES) {
    await rebuildCierres(minFecha, maxFecha);
  } else {
    console.log("ℹ️  No se reconstruyeron cierres de caja. Para hacerlo, agregá --rebuild-cierres.");
  }

  process.exit(0);
}

/**
 * Reconstruye los cierres_caja diarios agregando las atenciones NO anuladas por fecha.
 * Hace upsert por fecha (borra el cierre previo de esa fecha y lo recrea).
 */
async function rebuildCierres(minFecha: string, maxFecha: string) {
  console.log(`🧾 Reconstruyendo cierres de caja ${minFecha} → ${maxFecha}...`);

  const all = await db
    .select()
    .from(atenciones);

  const enRango = all.filter((a) => a.fecha >= minFecha && a.fecha <= maxFecha && !a.anulado);
  const porFecha = new Map<string, typeof enRango>();
  for (const a of enRango) {
    const list = porFecha.get(a.fecha) ?? [];
    list.push(a);
    porFecha.set(a.fecha, list);
  }

  // Para clasificar por medio de pago necesitamos el nombre del medio.
  const mediosDb = await db.select().from(mediosPago);
  const medioNombreById = new Map(mediosDb.map((m) => [m.id, normalize(m.nombre)]));

  let count = 0;
  for (const [fecha, list] of porFecha) {
    let totalBruto = 0;
    let totalComisiones = 0;
    let totalEfectivo = 0;
    let totalMp = 0;
    let totalTransferencia = 0;
    let totalPosnet = 0;

    for (const a of list) {
      const bruto = Number(a.precioCobrado);
      const com = Number(a.comisionMedioPagoMonto);
      totalBruto += bruto;
      totalComisiones += com;
      const medio = medioNombreById.get(a.medioPagoId) ?? "";
      if (medio.includes("efectivo")) totalEfectivo += bruto;
      else if (medio.includes("mercado") || medio === "mp") totalMp += bruto;
      else if (medio.includes("transfer")) totalTransferencia += bruto;
      else if (medio.includes("posnet") || medio.includes("debito") || medio.includes("credito") || medio.includes("tarjeta"))
        totalPosnet += bruto;
    }

    const totalNeto = totalBruto - totalComisiones;

    await db.transaction(async (tx) => {
      await tx.delete(cierresCaja).where(eq(cierresCaja.fecha, fecha));
      await tx.insert(cierresCaja).values({
        fecha,
        totalEfectivo: totalEfectivo.toFixed(2),
        totalMp: totalMp.toFixed(2),
        totalTransferencia: totalTransferencia.toFixed(2),
        totalPosnet: totalPosnet.toFixed(2),
        totalBruto: totalBruto.toFixed(2),
        totalComisionesMedios: totalComisiones.toFixed(2),
        totalNeto: totalNeto.toFixed(2),
        totalCortesBruto: totalBruto.toFixed(2),
        totalProductos: "0.00",
        cantidadAtenciones: list.length,
        cerradoEn: new Date(),
      });
    });
    count++;
  }
  console.log(`✅ Reconstruidos ${count} cierres de caja.\n`);
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
