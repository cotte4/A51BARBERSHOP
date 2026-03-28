import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  date,
  timestamp,
  integer,
  time,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ————————————————————————————
// BETTER AUTH TABLES
// ————————————————————————————
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // admin plugin fields
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ————————————————————————————
// BARBEROS
// ————————————————————————————
export const barberos = pgTable(
  "barberos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: text("nombre").notNull(),
    rol: text("rol").notNull(),
    // Modelo de compensación
    tipoModelo: text("tipo_modelo"),
    porcentajeComision: numeric("porcentaje_comision", {
      precision: 5,
      scale: 2,
    }),
    alquilerBancoMensual: numeric("alquiler_banco_mensual", {
      precision: 12,
      scale: 2,
    }),
    sueldoMinimoGarantizado: numeric("sueldo_minimo_garantizado", {
      precision: 12,
      scale: 2,
    }),
    activo: boolean("activo").default(true),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
    userId: text("user_id"),
  },
  (table) => [
    check("barberos_rol_check", sql`${table.rol} IN ('admin', 'barbero')`),
    check(
      "barberos_tipo_modelo_check",
      sql`${table.tipoModelo} IN ('variable', 'hibrido', 'fijo')`
    ),
  ]
);

// ————————————————————————————
// SERVICIOS Y PRECIOS
// ————————————————————————————
export const servicios = pgTable("servicios", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  precioBase: numeric("precio_base", { precision: 12, scale: 2 }),
  activo: boolean("activo").default(true),
});

export const serviciosAdicionales = pgTable("servicios_adicionales", {
  id: uuid("id").defaultRandom().primaryKey(),
  servicioId: uuid("servicio_id").references(() => servicios.id),
  nombre: text("nombre").notNull(),
  precioExtra: numeric("precio_extra", { precision: 12, scale: 2 }),
});

export const serviciosPreciosHistorial = pgTable(
  "servicios_precios_historial",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    servicioId: uuid("servicio_id").references(() => servicios.id),
    precio: numeric("precio", { precision: 12, scale: 2 }),
    vigenteDesdе: date("vigente_desde").notNull(),
    motivo: text("motivo"),
    creadoPor: uuid("creado_por").references(() => barberos.id),
  }
);

// ————————————————————————————
// TEMPORADAS
// ————————————————————————————
export const temporadas = pgTable("temporadas", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre"),
  fechaInicio: date("fecha_inicio"),
  fechaFin: date("fecha_fin"),
  cortesDiaProyectados: integer("cortes_dia_proyectados"),
  precioBaseProyectado: numeric("precio_base_proyectado", {
    precision: 12,
    scale: 2,
  }),
});

// ————————————————————————————
// MEDIOS DE PAGO
// ————————————————————————————
export const mediosPago = pgTable("medios_pago", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre"),
  comisionPorcentaje: numeric("comision_porcentaje", {
    precision: 5,
    scale: 2,
  }).default("0"),
  activo: boolean("activo").default(true),
});

// ————————————————————————————
// CAJA: ATENCIONES
// ————————————————————————————
export const atenciones = pgTable("atenciones", {
  id: uuid("id").defaultRandom().primaryKey(),
  barberoId: uuid("barbero_id").references(() => barberos.id),
  servicioId: uuid("servicio_id").references(() => servicios.id),
  fecha: date("fecha").notNull(),
  hora: time("hora", { withTimezone: true }),

  // Precios
  precioBase: numeric("precio_base", { precision: 12, scale: 2 }),
  precioCobrado: numeric("precio_cobrado", { precision: 12, scale: 2 }),

  // Medio de pago
  medioPagoId: uuid("medio_pago_id").references(() => mediosPago.id),
  comisionMedioPagoPct: numeric("comision_medio_pago_pct", {
    precision: 5,
    scale: 2,
  }),
  comisionMedioPagoMonto: numeric("comision_medio_pago_monto", {
    precision: 12,
    scale: 2,
  }),
  montoNeto: numeric("monto_neto", { precision: 12, scale: 2 }),

  // Comisión del barbero
  comisionBarberoPct: numeric("comision_barbero_pct", {
    precision: 5,
    scale: 2,
  }),
  comisionBarberoMonto: numeric("comision_barbero_monto", {
    precision: 12,
    scale: 2,
  }),

  // Control
  anulado: boolean("anulado").default(false),
  motivoAnulacion: text("motivo_anulacion"),
  notas: text("notas"),
  cierreCajaId: uuid("cierre_caja_id"), // FK se agrega después de cierres_caja
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

export const atencionesAdicionales = pgTable("atenciones_adicionales", {
  id: uuid("id").defaultRandom().primaryKey(),
  atencionId: uuid("atencion_id").references(() => atenciones.id),
  adicionalId: uuid("adicional_id").references(() => serviciosAdicionales.id),
  precioCobrado: numeric("precio_cobrado", { precision: 12, scale: 2 }),
});

// ————————————————————————————
// PRODUCTOS E INVENTARIO
// ————————————————————————————
export const productos = pgTable("productos", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  precioVenta: numeric("precio_venta", { precision: 12, scale: 2 }),
  costoCompra: numeric("costo_compra", { precision: 12, scale: 2 }),
  stockActual: integer("stock_actual").default(0),
  stockMinimo: integer("stock_minimo").default(5),
  activo: boolean("activo").default(true),
});

export const stockMovimientos = pgTable(
  "stock_movimientos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productoId: uuid("producto_id").references(() => productos.id),
    tipo: text("tipo").notNull(),
    cantidad: integer("cantidad"),
    precioUnitario: numeric("precio_unitario", { precision: 12, scale: 2 }),
    referenciaId: uuid("referencia_id"),
    notas: text("notas"),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      "stock_movimientos_tipo_check",
      sql`${table.tipo} IN ('entrada', 'venta', 'uso_interno', 'ajuste')`
    ),
  ]
);

// ————————————————————————————
// CIERRE DE CAJA DIARIO
// ————————————————————————————
export const cierresCaja = pgTable("cierres_caja", {
  id: uuid("id").defaultRandom().primaryKey(),
  fecha: date("fecha").unique().notNull(),

  // Totales por medio de pago
  totalEfectivo: numeric("total_efectivo", { precision: 12, scale: 2 }).default(
    "0"
  ),
  totalMp: numeric("total_mp", { precision: 12, scale: 2 }).default("0"),
  totalTransferencia: numeric("total_transferencia", {
    precision: 12,
    scale: 2,
  }).default("0"),
  totalPosnet: numeric("total_posnet", { precision: 12, scale: 2 }).default(
    "0"
  ),

  // Totales generales
  totalBruto: numeric("total_bruto", { precision: 12, scale: 2 }),
  totalComisionesMedios: numeric("total_comisiones_medios", {
    precision: 12,
    scale: 2,
  }),
  totalNeto: numeric("total_neto", { precision: 12, scale: 2 }),

  // Desglose por origen
  totalCortesBruto: numeric("total_cortes_bruto", { precision: 12, scale: 2 }),
  totalProductos: numeric("total_productos", { precision: 12, scale: 2 }),

  // Por barbero (snapshot del cierre)
  resumenBarberos: jsonb("resumen_barberos"),

  // Control
  cantidadAtenciones: integer("cantidad_atenciones"),
  cerradoPor: uuid("cerrado_por").references(() => barberos.id),
  cerradoEn: timestamp("cerrado_en", { withTimezone: true }),
});

// ————————————————————————————
// GASTOS FIJOS
// ————————————————————————————
export const categoriasGasto = pgTable("categorias_gasto", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre"),
  color: text("color"),
});

export const gastos = pgTable(
  "gastos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoriaId: uuid("categoria_id").references(() => categoriasGasto.id),
    descripcion: text("descripcion"),
    monto: numeric("monto", { precision: 12, scale: 2 }),
    fecha: date("fecha"),
    esRecurrente: boolean("es_recurrente").default(false),
    frecuencia: text("frecuencia"),
    comprobanteUrl: text("comprobante_url"),
    notas: text("notas"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      "gastos_frecuencia_check",
      sql`${table.frecuencia} IN ('mensual', 'trimestral', 'anual', 'unica')`
    ),
  ]
);

// ————————————————————————————
// LIQUIDACIONES MENSUALES
// ————————————————————————————
export const liquidaciones = pgTable("liquidaciones", {
  id: uuid("id").defaultRandom().primaryKey(),
  barberoId: uuid("barbero_id").references(() => barberos.id),
  periodoInicio: date("periodo_inicio"),
  periodoFin: date("periodo_fin"),

  totalCortes: integer("total_cortes"),
  totalBrutoCortes: numeric("total_bruto_cortes", { precision: 12, scale: 2 }),
  totalComisionCalculada: numeric("total_comision_calculada", {
    precision: 12,
    scale: 2,
  }),
  sueldoMinimo: numeric("sueldo_minimo", { precision: 12, scale: 2 }),
  alquilerBancoCobrado: numeric("alquiler_banco_cobrado", {
    precision: 12,
    scale: 2,
  }),

  montoAPagar: numeric("monto_a_pagar", { precision: 12, scale: 2 }),

  pagado: boolean("pagado").default(false),
  fechaPago: date("fecha_pago"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

// ————————————————————————————
// REPAGO A MEMAS
// ————————————————————————————
export const repagoMemas = pgTable("repago_memas", {
  id: uuid("id").defaultRandom().primaryKey(),
  valorLlaveTotal: numeric("valor_llave_total", { precision: 12, scale: 2 }),
  cuotaMensual: numeric("cuota_mensual", { precision: 12, scale: 2 }),
  cuotasPagadas: integer("cuotas_pagadas").default(0),
  saldoPendiente: numeric("saldo_pendiente", { precision: 12, scale: 2 }),
  fechaInicio: date("fecha_inicio"),
  pagadoCompleto: boolean("pagado_completo").default(false),
});

export const repagoMemasCuotas = pgTable("repago_memas_cuotas", {
  id: uuid("id").defaultRandom().primaryKey(),
  numeroCuota: integer("numero_cuota"),
  fechaPago: date("fecha_pago"),
  montoPagado: numeric("monto_pagado", { precision: 12, scale: 2 }),
  comprobanteUrl: text("comprobante_url"),
});
