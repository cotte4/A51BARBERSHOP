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
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  CAPITAL_MOVIMIENTO_TYPES,
  HANGAR_ASSET_CATEGORIAS,
  HANGAR_ASSET_ESTADOS_COMPRA,
  HANGAR_ASSET_PAYMENT_TYPES,
} from "@/lib/hangar";

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
    publicSlug: text("public_slug"),
    publicReservaActiva: boolean("public_reserva_activa").notNull().default(false),
    publicReservaPasswordHash: text("public_reserva_password_hash"),
    // Modelo de compensación
    tipoModelo: text("tipo_modelo").$type<"variable" | "hibrido" | "fijo">(),
    porcentajeComision: numeric("porcentaje_comision", {
      precision: 5,
      scale: 2,
    }),
    servicioDefectoId: uuid("servicio_defecto_id").references(() => servicios.id, { onDelete: "set null" }),
    medioPagoDefectoId: uuid("medio_pago_defecto_id").references(() => mediosPago.id, { onDelete: "set null" }),
    activo: boolean("activo").notNull().default(true),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    check("barberos_rol_check", sql`${table.rol} IN ('admin', 'barbero')`),
    check(
      "barberos_tipo_modelo_check",
      sql`${table.tipoModelo} IN ('variable', 'hibrido', 'fijo')`
    ),
    uniqueIndex("barberos_public_slug_idx").on(table.publicSlug),
  ]
);

// ————————————————————————————
// SERVICIOS Y PRECIOS
// ————————————————————————————
export const servicios = pgTable(
  "servicios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: text("nombre").notNull().unique(),
    precioBase: numeric("precio_base", { precision: 12, scale: 2 }),
    duracionMinutos: integer("duracion_minutos").notNull().default(60),
    activo: boolean("activo").notNull().default(true),
    ovnisValue: integer("ovnis_value").notNull().default(0),
  },
  (table) => [
    check(
      "servicios_duracion_minutos_check",
      sql`${table.duracionMinutos} IN (30, 45, 60)`
    ),
  ]
);

export const serviciosAdicionales = pgTable("servicios_adicionales", {
  id: uuid("id").defaultRandom().primaryKey(),
  servicioId: uuid("servicio_id").references(() => servicios.id),
  nombre: text("nombre").notNull(),
  precioExtra: numeric("precio_extra", { precision: 12, scale: 2 }),
},
(table) => [
  index("servicios_adicionales_servicio_id_idx").on(table.servicioId),
]);

export const serviciosPreciosHistorial = pgTable(
  "servicios_precios_historial",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    servicioId: uuid("servicio_id").references(() => servicios.id),
    precio: numeric("precio", { precision: 12, scale: 2 }),
    vigentaDesde: date("vigente_desde").notNull(),
    motivo: text("motivo"),
    creadoPor: uuid("creado_por").references(() => barberos.id, { onDelete: "set null" }),
  },
  (table) => [
    index("servicios_precios_historial_servicio_id_idx").on(table.servicioId),
  ]
);

// ————————————————————————————
// TEMPORADAS
// Note: this table is not referenced by any FK. It stores projection parameters
// used at query time (dashboard-queries.ts) but has no join enforcement.
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
export const mediosPago = pgTable(
  "medios_pago",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: text("nombre").notNull(),
    comisionPorcentaje: numeric("comision_porcentaje", {
      precision: 5,
      scale: 2,
    }).notNull().default("0"),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [
    uniqueIndex("medios_pago_nombre_idx").on(table.nombre),
  ]
);

// ————————————————————————————
// CAJA: ATENCIONES
// ————————————————————————————
export const atenciones = pgTable("atenciones", {
  id: uuid("id").defaultRandom().primaryKey(),
  barberoId: uuid("barbero_id").notNull().references(() => barberos.id),
  clientId: uuid("client_id").references(() => clients.id),
  servicioId: uuid("servicio_id").notNull().references(() => servicios.id),
  fecha: date("fecha").notNull(),
  hora: time("hora"),

  // Precios
  precioBase: numeric("precio_base", { precision: 12, scale: 2 }).notNull(),
  precioCobrado: numeric("precio_cobrado", { precision: 12, scale: 2 }).notNull(),

  // Medio de pago
  medioPagoId: uuid("medio_pago_id").notNull().references(() => mediosPago.id),
  comisionMedioPagoPct: numeric("comision_medio_pago_pct", {
    precision: 5,
    scale: 2,
  }).notNull(),
  comisionMedioPagoMonto: numeric("comision_medio_pago_monto", {
    precision: 12,
    scale: 2,
  }).notNull(),
  montoNeto: numeric("monto_neto", { precision: 12, scale: 2 }).notNull(),

  // Comisión del barbero
  comisionBarberoPct: numeric("comision_barbero_pct", {
    precision: 5,
    scale: 2,
  }).notNull(),
  comisionBarberoMonto: numeric("comision_barbero_monto", {
    precision: 12,
    scale: 2,
  }).notNull(),

  // Control
  anulado: boolean("anulado").notNull().default(false),
  motivoAnulacion: text("motivo_anulacion"),
  notas: text("notas"),
  cierreCajaId: uuid("cierre_caja_id").references(() => cierresCaja.id, { onDelete: "set null" }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
},
(table) => [
  // Tier 1 + Tier 3 checks for atenciones
  check("atenciones_precio_base_nonneg", sql`${table.precioBase} >= 0`),
  check("atenciones_precio_cobrado_nonneg", sql`${table.precioCobrado} >= 0`),
  check("atenciones_comision_medio_pago_monto_nonneg", sql`${table.comisionMedioPagoMonto} >= 0`),
  check("atenciones_comision_barbero_monto_nonneg", sql`${table.comisionBarberoMonto} >= 0`),
  check("atenciones_monto_neto_nonneg", sql`${table.montoNeto} >= 0`),
  check("atenciones_comision_medio_pago_pct_range", sql`${table.comisionMedioPagoPct} BETWEEN 0 AND 100`),
  check("atenciones_comision_barbero_pct_range", sql`${table.comisionBarberoPct} BETWEEN 0 AND 100`),
  check("atenciones_monto_neto_coherente", sql`ABS(${table.montoNeto} - (${table.precioCobrado} - ${table.comisionMedioPagoMonto})) <= 0.01`),
  index("atenciones_fecha_idx").on(table.fecha),
  index("atenciones_barbero_id_idx").on(table.barberoId),
  index("atenciones_client_id_idx").on(table.clientId),
  index("atenciones_cierre_caja_id_idx").on(table.cierreCajaId),
  index("atenciones_servicio_id_idx").on(table.servicioId),
  index("atenciones_medio_pago_id_idx").on(table.medioPagoId),
]);

export const atencionesAdicionales = pgTable("atenciones_adicionales", {
  id: uuid("id").defaultRandom().primaryKey(),
  atencionId: uuid("atencion_id").notNull().references(() => atenciones.id, { onDelete: "cascade" }),
  adicionalId: uuid("adicional_id").notNull().references(() => serviciosAdicionales.id),
  precioCobrado: numeric("precio_cobrado", { precision: 12, scale: 2 }).notNull(),
},
(table) => [
  index("atenciones_adicionales_atencion_id_idx").on(table.atencionId),
  index("atenciones_adicionales_adicional_id_idx").on(table.adicionalId),
]);

export const atencionesProductos = pgTable(
  "atenciones_productos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    atencionId: uuid("atencion_id")
      .notNull()
      .references(() => atenciones.id, { onDelete: "cascade" }),
    productoId: uuid("producto_id")
      .notNull()
      .references(() => productos.id),
    cantidad: integer("cantidad").notNull().default(1),
    precioUnitario: numeric("precio_unitario", { precision: 12, scale: 2 }).notNull(),
    esMarcianoIncluido: boolean("es_marciano_incluido").notNull().default(false),
    costoUnitarioSnapshot: numeric("costo_unitario_snapshot", {
      precision: 12,
      scale: 2,
    }),
  },
  (table) => [
    check("atenciones_productos_cantidad_check", sql`${table.cantidad} > 0`),
    index("atenciones_productos_atencion_idx").on(table.atencionId),
    index("atenciones_productos_producto_idx").on(table.productoId),
  ]
);

// ————————————————————————————
// PRODUCTOS E INVENTARIO
// ————————————————————————————
export const productos = pgTable("productos", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  precioVenta: numeric("precio_venta", { precision: 12, scale: 2 }),
  costoCompra: numeric("costo_compra", { precision: 12, scale: 2 }),
  stockActual: integer("stock_actual").default(0),
  stockMinimo: integer("stock_minimo").default(5),
  esConsumicion: boolean("es_consumicion").notNull().default(false),
  activo: boolean("activo").default(true),
  ovnisValue: integer("ovnis_value").notNull().default(0),
});

export const stockMovimientos = pgTable(
  "stock_movimientos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productoId: uuid("producto_id").references(() => productos.id),
    tipo: text("tipo").notNull(),
    cantidad: integer("cantidad"),
    precioUnitario: numeric("precio_unitario", { precision: 12, scale: 2 }),
    costoUnitarioSnapshot: numeric("costo_unitario_snapshot", { precision: 12, scale: 2 }),
    // Polymorphic reference — referenciaType disambiguates the target
    // ('atencion' | 'atenciones_producto' | 'stock_movimiento' | null).
    // 'stock_movimiento' es usado por las reversiones de ventas sueltas de
    // producto: referenciaId apunta al id del movimiento de venta original.
    referenciaId: uuid("referencia_id"),
    referenciaType: text("referencia_type"),
    notas: text("notas"),
    // Nullable: 'entrada' / 'ajuste' / 'uso_interno' movimientos don't have a payment method.
    medioPagoId: uuid("medio_pago_id").references(() => mediosPago.id),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      "stock_movimientos_tipo_check",
      sql`${table.tipo} IN ('entrada', 'venta', 'uso_interno', 'ajuste')`
    ),
    check(
      "stock_movimientos_referencia_type_check",
      sql`${table.referenciaType} IS NULL OR ${table.referenciaType} IN ('atencion', 'atenciones_producto', 'stock_movimiento')`
    ),
    index("stock_movimientos_tipo_idx").on(table.tipo),
    index("stock_movimientos_producto_id_idx").on(table.productoId),
    index("stock_movimientos_medio_pago_id_idx").on(table.medioPagoId),
  ]
);

// ————————————————————————————
// CIERRE DE CAJA DIARIO
// ————————————————————————————
// Note: cierres_caja hardcodes the 4 current payment methods as columns instead of
// a child table. This is intentional for simplicity — if payment methods change,
// a schema migration will be needed to add columns. medios_pago remains the source
// of truth for available methods; these totals are a snapshot per close.
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
  totalBruto: numeric("total_bruto", { precision: 12, scale: 2 }).notNull(),
  totalComisionesMedios: numeric("total_comisiones_medios", {
    precision: 12,
    scale: 2,
  }).notNull(),
  totalNeto: numeric("total_neto", { precision: 12, scale: 2 }).notNull(),

  // Desglose por origen
  totalCortesBruto: numeric("total_cortes_bruto", { precision: 12, scale: 2 }),
  totalProductos: numeric("total_productos", { precision: 12, scale: 2 }),

  // Por barbero (snapshot del cierre)
  resumenBarberos: jsonb("resumen_barberos"),

  // Control
  cantidadAtenciones: integer("cantidad_atenciones"),
  cerradoPor: uuid("cerrado_por").references(() => barberos.id, { onDelete: "set null" }),
  cerradoEn: timestamp("cerrado_en", { withTimezone: true }).notNull(),

  // Efectivo contado fisicamente por el barbero al momento del cierre (paso 1 del wizard).
  // Nullable: los cierres historicos previos a este campo no tienen conteo registrado.
  efectivoContado: numeric("efectivo_contado", { precision: 12, scale: 2 }),
},
(table) => [
  // Tier 1 + Tier 3 checks for cierres_caja
  check("cierres_caja_total_bruto_nonneg", sql`${table.totalBruto} >= 0`),
  check("cierres_caja_total_neto_nonneg", sql`${table.totalNeto} >= 0`),
  check("cierres_caja_total_comisiones_medios_nonneg", sql`${table.totalComisionesMedios} >= 0`),
  check("cierres_caja_total_neto_coherente", sql`${table.totalNeto} = ${table.totalBruto} - ${table.totalComisionesMedios}`),
  check("cierres_caja_comisiones_lte_bruto", sql`${table.totalComisionesMedios} <= ${table.totalBruto}`),
]);

// ————————————————————————————
// GASTOS FIJOS
// ————————————————————————————
export const categoriasGasto = pgTable("categorias_gasto", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre"),
  color: text("color"),
  activo: boolean("activo").notNull().default(true),
});

// Note: gastos has two category fields. categoriaId (FK) is used for fixed expenses
// via the form UI. categoriaVisual (free text) is used for gastos_rapidos entries
// that may not map to a categoria. Always query both when displaying; treat
// categoriaId as canonical when both are set.
export const gastos = pgTable(
  "gastos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoriaId: uuid("categoria_id").references(() => categoriasGasto.id),
    descripcion: text("descripcion"),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    fecha: date("fecha").notNull(),
    tipo: text("tipo").notNull().default("fijo"),
    categoriaVisual: text("categoria_visual"),
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
    check("gastos_tipo_check", sql`${table.tipo} IN ('fijo', 'rapido')`),
    index("gastos_fecha_idx").on(table.fecha),
    index("gastos_tipo_fecha_idx").on(table.tipo, table.fecha),
  ]
);

// ————————————————————————————
// LIQUIDACIONES MENSUALES
// ————————————————————————————
export const liquidaciones = pgTable("liquidaciones", {
  id: uuid("id").defaultRandom().primaryKey(),
  barberoId: uuid("barbero_id").notNull().references(() => barberos.id),
  periodoInicio: date("periodo_inicio").notNull(),
  periodoFin: date("periodo_fin").notNull(),

  totalCortes: integer("total_cortes"),
  totalBrutoCortes: numeric("total_bruto_cortes", { precision: 12, scale: 2 }),
  totalComisionCalculada: numeric("total_comision_calculada", {
    precision: 12,
    scale: 2,
  }),

  montoAPagar: numeric("monto_a_pagar", { precision: 12, scale: 2 }),

  pagado: boolean("pagado").notNull().default(false),
  fechaPago: date("fecha_pago"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
},
(table) => [
  // Tier 1 + Tier 3 checks for liquidaciones
  check("liquidaciones_total_bruto_cortes_nonneg", sql`${table.totalBrutoCortes} >= 0`),
  check("liquidaciones_total_comision_calculada_nonneg", sql`${table.totalComisionCalculada} >= 0`),
  check("liquidaciones_monto_a_pagar_nonneg", sql`${table.montoAPagar} >= 0`),
  check("liquidaciones_monto_a_pagar_lte_bruto", sql`${table.montoAPagar} <= ${table.totalBrutoCortes}`),
  check("liquidaciones_pagado_fecha_coherente", sql`(${table.pagado} = true AND ${table.fechaPago} IS NOT NULL) OR (${table.pagado} = false AND ${table.fechaPago} IS NULL)`),
  index("liquidaciones_barbero_id_idx").on(table.barberoId),
  uniqueIndex("liquidaciones_barbero_periodo_idx").on(table.barberoId, table.periodoInicio, table.periodoFin),
]);

// ————————————————————————————
// REPAGO A MEMAS
// ————————————————————————————
// Note: cuotasPagadas and saldoPendiente are stored derived values. They can be
// computed from repago_memas_cuotas but are cached here for read performance.
// Keep in sync when inserting cuota rows or they will drift.
export const repagoMemas = pgTable("repago_memas", {
  id: uuid("id").defaultRandom().primaryKey(),
  valorLlaveTotal: numeric("valor_llave_total", { precision: 12, scale: 2 }),
  cuotaMensual: numeric("cuota_mensual", { precision: 12, scale: 2 }),
  cuotasPagadas: integer("cuotas_pagadas").default(0),
  saldoPendiente: numeric("saldo_pendiente", { precision: 12, scale: 2 }),
  fechaInicio: date("fecha_inicio"),
  pagadoCompleto: boolean("pagado_completo").default(false),
  deudaUsd: numeric("deuda_usd", { precision: 10, scale: 2 }),
  tasaAnualUsd: numeric("tasa_anual_usd", { precision: 5, scale: 4 }),
  cantidadCuotasPactadas: integer("cantidad_cuotas_pactadas"),
});

export const repagoMemasCuotas = pgTable("repago_memas_cuotas", {
  id: uuid("id").defaultRandom().primaryKey(),
  numeroCuota: integer("numero_cuota").notNull(),
  fechaPago: date("fecha_pago"),
  montoPagado: numeric("monto_pagado", { precision: 12, scale: 2 }),
  comprobanteUrl: text("comprobante_url"),
  repagoId: uuid("repago_id").notNull().references(() => repagoMemas.id, { onDelete: "cascade" }),
  capitalPagado: numeric("capital_pagado", { precision: 12, scale: 2 }),
  interesPagado: numeric("interes_pagado", { precision: 12, scale: 2 }),
  tcDia: numeric("tc_dia", { precision: 10, scale: 2 }),
  notas: text("notas"),
},
(table) => [
  // Índice NO único: los pagos parciales generan varias filas por cuota
  index("repago_memas_cuotas_repago_numero_idx").on(table.repagoId, table.numeroCuota),
]);

// ————————————————————————————
// CONFIGURACIÓN DEL NEGOCIO
// ————————————————————————————
export const configuracionNegocio = pgTable("configuracion_negocio", {
  id: uuid("id").primaryKey().defaultRandom(),
  presupuestoMensualGastos: numeric("presupuesto_mensual_gastos", { precision: 12, scale: 2 })
    .notNull()
    .default("1956686.00"),
  tcReferencia: numeric("tc_referencia", { precision: 10, scale: 2 }).default("1400.00"),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow(),
  actualizadoPor: text("actualizado_por"),
  jukeboxEnabled: boolean("jukebox_enabled").notNull().default(true),
  jukeboxAutoApprove: boolean("jukebox_auto_approve").notNull().default(false),
});

// ————————————————————————————————————————————————————————
// CLIENTES / MARCIANOS
// ————————————————————————————————————————————————————————
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phoneRaw: text("phone_raw"),
    phoneNormalized: text("phone_normalized"),
    avatarUrl: text("avatar_url"),
    esMarciano: boolean("es_marciano").notNull().default(false),
    marcianoDesde: timestamp("marciano_desde", { withTimezone: true }),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    preferences: jsonb("preferences"),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    createdByBarberoId: uuid("created_by_barbero_id").references(() => barberos.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    totalVisits: integer("total_visits").notNull().default(0),
    lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
    lastVisitBarberoId: uuid("last_visit_barbero_id").references(() => barberos.id, { onDelete: "set null" }),
    avgDaysBetweenVisits: numeric("avg_days_between_visits", {
      precision: 8,
      scale: 2,
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    faceShape: text("face_shape"),
    styleProfile: jsonb("style_profile").$type<import("@/lib/types").StyleProfile>(),
    styleCompletedAt: timestamp("style_completed_at", { withTimezone: true }),
    favoriteColor: text("favorite_color"),
    styleAnalysis: jsonb("style_analysis").$type<import("@/lib/types").StyleAnalysis>(),
    avatarStatus: text("avatar_status").notNull().default("idle"),
    avatarPredictionId: text("avatar_prediction_id"),
    avatarRequestedAt: timestamp("avatar_requested_at", { withTimezone: true }),
    avatarErrorMessage: text("avatar_error_message"),
    publicCardSlug: text("public_card_slug").unique(),
  },
  (table) => [
    uniqueIndex("clients_email_idx").on(table.email),
    uniqueIndex("clients_phone_normalized_idx").on(table.phoneNormalized),
    uniqueIndex("clients_user_id_idx").on(table.userId),
    index("clients_name_idx").on(table.name),
    index("clients_last_visit_at_idx").on(table.lastVisitAt),
    index("clients_es_marciano_last_visit_at_idx").on(
      table.esMarciano,
      table.lastVisitAt
    ),
    index("clients_created_by_barbero_id_idx").on(table.createdByBarberoId),
    check("clients_face_shape_check",
      sql`${table.faceShape} IN ('oval', 'cuadrado', 'redondo', 'corazon', 'diamante', 'alien') OR ${table.faceShape} IS NULL`
    ),
    check("clients_avatar_status_check",
      sql`${table.avatarStatus} IN ('idle', 'processing', 'ready', 'failed')`
    ),
  ]
);

export const turnos = pgTable(
  "turnos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barberoId: uuid("barbero_id")
      .notNull()
      .references(() => barberos.id),
    clienteNombre: text("cliente_nombre").notNull(),
    clienteTelefonoRaw: text("cliente_telefono_raw"),
    clienteTelefonoNormalizado: text("cliente_telefono_normalizado"),
    clientId: uuid("client_id").references(() => clients.id),
    fecha: date("fecha").notNull(),
    horaInicio: time("hora_inicio").notNull(),
    duracionMinutos: integer("duracion_minutos").notNull(),
    servicioId: uuid("servicio_id").references(() => servicios.id),
    precioEsperado: numeric("precio_esperado", { precision: 12, scale: 2 }),
    estado: text("estado").notNull().default("pendiente"),
    notaCliente: text("nota_cliente"),
    sugerenciaCancion: text("sugerencia_cancion"),
    spotifyTrackUri: text("spotify_track_uri"),
    motivoCancelacion: text("motivo_cancelacion"),
    esMarcianoSnapshot: boolean("es_marciano_snapshot").notNull().default(false),
    prioridadAbsoluta: boolean("prioridad_absoluta").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "turnos_estado_check",
      sql`${table.estado} IN ('pendiente', 'confirmado', 'completado', 'cancelado')`
    ),
    check(
      "turnos_duracion_minutos_check",
      sql`${table.duracionMinutos} IN (30, 45, 60)`
    ),
    index("turnos_barbero_fecha_idx").on(table.barberoId, table.fecha),
    index("turnos_estado_fecha_idx").on(table.estado, table.fecha),
    index("turnos_cliente_telefono_normalizado_idx").on(table.clienteTelefonoNormalizado),
    index("turnos_client_id_idx").on(table.clientId),
    index("turnos_servicio_id_idx").on(table.servicioId),
    uniqueIndex("turnos_slot_activo_unico_idx")
      .on(table.barberoId, table.fecha, table.horaInicio)
      .where(sql`${table.estado} IN ('pendiente', 'confirmado')`),
  ]
);

export const turnosExtras = pgTable(
  "turnos_extras",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turnoId: uuid("turno_id")
      .notNull()
      .references(() => turnos.id, { onDelete: "cascade" }),
    productoId: uuid("producto_id")
      .notNull()
      .references(() => productos.id),
    cantidad: integer("cantidad").notNull().default(1),
  },
  (table) => [
    check("turnos_extras_cantidad_check", sql`${table.cantidad} > 0`),
    index("turnos_extras_turno_idx").on(table.turnoId),
  ]
);

export const turnoNotificationEvents = pgTable(
  "turno_notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turnoId: uuid("turno_id")
      .notNull()
      .references(() => turnos.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    targetEmail: text("target_email"),
    providerStatus: text("provider_status").notNull().default("queued"),
    providerMessage: text("provider_message"),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "turno_notification_events_event_type_check",
      sql`${table.eventType} IN ('turno_confirmado','turno_cancelado')`
    ),
    check(
      "turno_notification_events_provider_status_check",
      sql`${table.providerStatus} IN ('queued','sent','skipped','failed')`
    ),
    index("turno_notification_events_turno_created_idx").on(table.turnoId, table.createdAt),
  ]
);

export const turnosDisponibilidad = pgTable(
  "turnos_disponibilidad",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barberoId: uuid("barbero_id")
      .notNull()
      .references(() => barberos.id),
    fecha: date("fecha").notNull(),
    horaInicio: time("hora_inicio").notNull(),
    duracionMinutos: integer("duracion_minutos").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "turnos_disponibilidad_duracion_minutos_check",
      sql`${table.duracionMinutos} IN (30, 45, 60)`
    ),
    uniqueIndex("turnos_disponibilidad_slot_unico_idx").on(
      table.barberoId,
      table.fecha,
      table.horaInicio
    ),
    index("turnos_disponibilidad_barbero_fecha_idx").on(table.barberoId, table.fecha),
  ]
);

export const turnosReservaIntentos = pgTable(
  "turnos_reserva_intentos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("turnos_reserva_intentos_ip_created_idx").on(table.ipHash, table.createdAt)]
);

export const pantallaEvents = pgTable(
  "pantalla_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turnoId: uuid("turno_id")
      .notNull()
      .references(() => turnos.id, { onDelete: "cascade" }),
    cancion: text("cancion").notNull(),
    clienteNombre: text("cliente_nombre").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pantalla_events_created_at_idx").on(table.createdAt),
    index("pantalla_events_turno_id_idx").on(table.turnoId),
  ]
);


export const visitLogs = pgTable(
  "visit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
    createdByBarberoId: uuid("created_by_barbero_id")
      .references(() => barberos.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id")
      .references(() => user.id, { onDelete: "set null" }),
    barberNotes: text("barber_notes"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    photoUrls: text("photo_urls").array().notNull().default(sql`'{}'::text[]`),
    propinaEstrellas: integer("propina_estrellas").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    corteNombre: text("corte_nombre"),
  },
  (table) => [
    check(
      "visit_logs_propina_estrellas_check",
      sql`${table.propinaEstrellas} >= 0 AND ${table.propinaEstrellas} <= 5`
    ),
    index("visit_logs_client_visited_at_idx").on(table.clientId, table.visitedAt),
    index("visit_logs_created_by_barbero_id_idx").on(table.createdByBarberoId),
    index("visit_logs_tags_idx").using("gin", table.tags),
  ]
);

export const clientProfileEvents = pgTable(
  "client_profile_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    fieldName: text("field_name").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changedByUserId: text("changed_by_user_id")
      .references(() => user.id, { onDelete: "set null" }),
    changedByBarberoId: uuid("changed_by_barbero_id").references(() => barberos.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("client_profile_events_client_created_at_idx").on(table.clientId, table.createdAt)]
);

export const marcianoBeneficiosUso = pgTable(
  "marciano_beneficios_uso",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    mes: text("mes").notNull(),
    cortesUsados: integer("cortes_usados").notNull().default(0),
    consumicionesUsadas: integer("consumiciones_usadas").notNull().default(0),
    sorteosParticipados: integer("sorteos_participados").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("marciano_beneficios_uso_client_mes_idx").on(table.clientId, table.mes),
    check("marciano_beneficios_uso_mes_format", sql`${table.mes} ~ '^\\d{4}-\\d{2}$'`),
  ]
);

export const internalBugReports = pgTable(
  "internal_bug_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: text("status").notNull().default("new"),
    severity: text("severity").notNull().default("medium"),
    summary: text("summary").notNull(),
    expectedBehavior: text("expected_behavior").notNull(),
    actualBehavior: text("actual_behavior").notNull(),
    pathname: text("pathname").notNull(),
    actionName: text("action_name"),
    reporterRole: text("reporter_role").notNull(),
    reporterUserId: text("reporter_user_id").notNull(),
    clientVersion: text("client_version"),
    sessionHash: text("session_hash"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "internal_bug_reports_status_check",
      sql`${table.status} IN ('new','triaged','fixed','verified','closed')`
    ),
    check(
      "internal_bug_reports_severity_check",
      sql`${table.severity} IN ('low','medium','high','critical')`
    ),
    index("internal_bug_reports_status_idx").on(table.status, table.createdAt),
    index("internal_bug_reports_path_idx").on(table.pathname),
  ]
);

export const internalSupportIntakes = pgTable(
  "internal_support_intakes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    intakeType: text("intake_type").notNull(),
    title: text("title").notNull(),
    problem: text("problem").notNull(),
    proposal: text("proposal"),
    impact: text("impact"),
    urgency: text("urgency").notNull().default("media"),
    pathname: text("pathname").notNull(),
    reporterRole: text("reporter_role").notNull(),
    reporterUserId: text("reporter_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "internal_support_intakes_type_check",
      sql`${table.intakeType} IN ('feature_request','implementation_idea')`
    ),
    check(
      "internal_support_intakes_urgency_check",
      sql`${table.urgency} IN ('baja','media','alta','critica')`
    ),
    index("internal_support_intakes_type_created_idx").on(table.intakeType, table.createdAt),
  ]
);

export const retentionFollowups = pgTable(
  "retention_followups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pendiente"),
    notes: text("notes"),
    lastManagedAt: timestamp("last_managed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "retention_followups_status_check",
      sql`${table.status} IN ('pendiente','contactado','reagendado')`
    ),
    uniqueIndex("retention_followups_client_id_idx").on(table.clientId),
    index("retention_followups_status_last_managed_idx").on(table.status, table.lastManagedAt),
  ]
);

export const internalBugDeliveryEvents = pgTable(
  "internal_bug_delivery_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bugReportId: uuid("bug_report_id")
      .notNull()
      .references(() => internalBugReports.id, { onDelete: "cascade" }),
    destination: text("destination").notNull(),
    status: text("status").notNull().default("queued"),
    responseCode: integer("response_code"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "internal_bug_delivery_events_status_check",
      sql`${table.status} IN ('queued','sent','failed','skipped')`
    ),
    index("internal_bug_delivery_events_bug_created_idx").on(table.bugReportId, table.createdAt),
  ]
);

export const goLiveReadiness = pgTable(
  "go_live_readiness",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: text("scope").notNull().default("default"),
    checklistSnapshot: jsonb("checklist_snapshot").notNull().default(sql`'[]'::jsonb`),
    signedOffAt: timestamp("signed_off_at", { withTimezone: true }),
    signedOffByUserId: text("signed_off_by_user_id"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("go_live_readiness_scope_idx").on(table.scope)]
);

export const clientBriefingCache = pgTable(
  "client_briefing_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    viewerScope: text("viewer_scope").notNull(),
    viewerBarberoId: uuid("viewer_barbero_id").references(() => barberos.id, { onDelete: "set null" }),
    cacheKey: text("cache_key").notNull(),
    briefingText: text("briefing_text").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "client_briefing_cache_scope_check",
      sql`${table.viewerScope} IN ('admin', 'barbero')`
    ),
    uniqueIndex("client_briefing_cache_client_scope_idx").on(
      table.clientId,
      table.viewerScope,
      table.viewerBarberoId
    ),
  ]
);

// ----------------------------------------------------------------------------
// SISTEMA MUSICAL V3
// ----------------------------------------------------------------------------
export const musicProviderConnections = pgTable(
  "music_provider_connections",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("disconnected"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "music_provider_connections_status_check",
      sql`${table.status} IN ('connected', 'disconnected', 'error')`
    ),
    index("music_provider_connections_provider_idx").on(table.provider),
  ]
);

export const musicPlayers = pgTable(
  "music_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    providerPlayerId: text("provider_player_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("missing"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    isDefault: boolean("is_default").notNull().default(false),
    isExpectedLocalPlayer: boolean("is_expected_local_player").notNull().default(false),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "music_players_status_check",
      sql`${table.status} IN ('ready', 'missing', 'error')`
    ),
    uniqueIndex("music_players_provider_player_id_idx").on(
      table.provider,
      table.providerPlayerId
    ),
    index("music_players_expected_idx").on(table.isExpectedLocalPlayer),
  ]
);

export const musicModeState = pgTable(
  "music_mode_state",
  {
    id: text("id").primaryKey(),
    activeMode: text("active_mode").notNull().default("auto"),
    manualOwnerBarberoId: uuid("manual_owner_barbero_id").references(() => barberos.id, { onDelete: "set null" }),
    manualOwnerUserId: text("manual_owner_user_id").references(() => user.id, { onDelete: "set null" }),
    pendingContextRef: text("pending_context_ref"),
    pendingContextLabel: text("pending_context_label"),
    jamEnabled: boolean("jam_enabled").notNull().default(false),
    autoEnabled: boolean("auto_enabled").notNull().default(true),
    runtimeState: text("runtime_state").notNull().default("offline"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    check(
      "music_mode_state_active_mode_check",
      sql`${table.activeMode} IN ('auto', 'dj', 'jam')`
    ),
    check(
      "music_mode_state_runtime_state_check",
      sql`${table.runtimeState} IN ('ready', 'degraded', 'offline')`
    ),
    check("music_mode_state_singleton", sql`${table.id} = 'singleton'`),
  ]
);

export const musicScheduleRules = pgTable(
  "music_schedule_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dayMask: text("day_mask").array().notNull().default(sql`'{}'::text[]`),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    providerPlaylistRef: text("provider_playlist_ref").notNull(),
    label: text("label").notNull(),
    priority: integer("priority").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("music_schedule_rules_enabled_idx").on(table.enabled, table.priority),
  ]
);

export const musicQueueSessions = pgTable(
  "music_queue_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mode: text("mode").notNull(),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    check(
      "music_queue_sessions_mode_check",
      sql`${table.mode} IN ('dj', 'jam')`
    ),
    check(
      "music_queue_sessions_status_check",
      sql`${table.status} IN ('active', 'ended')`
    ),
  ]
);

export const musicQueueItems = pgTable(
  "music_queue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => musicQueueSessions.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    ownerBarberoId: uuid("owner_barbero_id").references(() => barberos.id, { onDelete: "set null" }),
    providerTrackRef: text("provider_track_ref").notNull(),
    displayTitle: text("display_title").notNull(),
    displayArtist: text("display_artist"),
    state: text("state").notNull().default("queued"),
    positionHint: integer("position_hint").notNull().default(0),
    requiresPlayer: boolean("requires_player").notNull().default(true),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    playedAt: timestamp("played_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "music_queue_items_source_type_check",
      sql`${table.sourceType} IN ('dj', 'jam', 'system')`
    ),
    check(
      "music_queue_items_state_check",
      sql`${table.state} IN ('queued', 'dispatched', 'played', 'skipped')`
    ),
    index("music_queue_items_session_position_idx").on(table.sessionId, table.positionHint),
    index("music_queue_items_owner_idx").on(table.ownerBarberoId),
  ]
);

export const musicRuntimeStatus = pgTable(
  "music_runtime_status",
  {
    id: text("id").primaryKey(),
    providerStatus: text("provider_status").notNull().default("disconnected"),
    playerStatus: text("player_status").notNull().default("missing"),
    activePlayerId: uuid("active_player_id").references(() => musicPlayers.id, { onDelete: "set null" }),
    lastPlayerSeenAt: timestamp("last_player_seen_at", { withTimezone: true }),
    lastPlaybackAttemptAt: timestamp("last_playback_attempt_at", { withTimezone: true }),
    lastPlaybackSuccessAt: timestamp("last_playback_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    degradedReason: text("degraded_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "music_runtime_status_provider_status_check",
      sql`${table.providerStatus} IN ('connected', 'disconnected', 'error')`
    ),
    check(
      "music_runtime_status_player_status_check",
      sql`${table.playerStatus} IN ('ready', 'missing', 'error')`
    ),
    check("music_runtime_status_singleton", sql`${table.id} = 'singleton'`),
  ]
);

export const musicAutoResumeState = pgTable(
  "music_auto_resume_state",
  {
    id: text("id").primaryKey(),
    resumeMode: text("resume_mode").notNull().default("auto"),
    resumeContextRef: text("resume_context_ref"),
    resumeContextLabel: text("resume_context_label"),
    interruptionSource: text("interruption_source"),
    interruptionTrackRef: text("interruption_track_ref"),
    resumePending: boolean("resume_pending").notNull().default(false),
    interruptedAt: timestamp("interrupted_at", { withTimezone: true }),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
    resumeAttempts: integer("resume_attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "music_auto_resume_state_resume_mode_check",
      sql`${table.resumeMode} IN ('auto','dj','jam')`
    ),
    check("music_auto_resume_state_singleton", sql`${table.id} = 'singleton'`),
    index("music_auto_resume_state_pending_idx").on(table.resumePending, table.updatedAt),
  ]
);

export const marcianoCutsConfig = pgTable("marciano_cuts_config", {
  faceShape: text("face_shape").primaryKey(),
  cuts: jsonb("cuts").$type<string[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const musicEvents = pgTable(
  "music_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("music_events_type_created_idx").on(table.eventType, table.createdAt)]
);

// ————————————————————————————
// MÓDULO ASESOR FINANCIERO
// ————————————————————————————
export const costosFijosNegocio = pgTable("costos_fijos_negocio", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  montoMensual: numeric("monto_mensual", { precision: 12, scale: 2 }), // nullable — referencia; valores reales en costos_fijos_valores
  categoria: text("categoria").notNull(),
  notas: text("notas"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const costosFijosValores = pgTable(
  "costos_fijos_valores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    costoId: uuid("costo_id")
      .notNull()
      .references(() => costosFijosNegocio.id, { onDelete: "cascade" }),
    mes: text("mes").notNull(), // formato YYYY-MM
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("costos_fijos_valores_costo_mes_idx").on(table.costoId, table.mes),
    index("costos_fijos_valores_mes_idx").on(table.mes),
    check("costos_fijos_valores_mes_format", sql`${table.mes} ~ '^\\d{4}-\\d{2}$'`),
  ]
);

export const capitalMovimientos = pgTable(
  "capital_movimientos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fecha: date("fecha").notNull(),
    tipo: text("tipo").notNull(),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    descripcion: text("descripcion"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "capital_movimientos_tipo_check",
      sql`${table.tipo} IN (${sql.raw(CAPITAL_MOVIMIENTO_TYPES.map((item) => `'${item}'`).join(", "))})`
    ),
    index("capital_movimientos_fecha_idx").on(table.fecha),
  ]
);

// ————————————————————————————
// HISTORIAL DE CORTES DEL BARBERO
// ————————————————————————————
export const barberCutsLog = pgTable(
  "barber_cuts_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barberoId: uuid("barbero_id")
      .notNull()
      .references(() => barberos.id, { onDelete: "cascade" }),
    fecha: date("fecha").notNull(),
    servicioNombre: text("servicio_nombre").notNull(),
    clienteNombre: text("cliente_nombre"),
    fotoUrl: text("foto_url"),
    notas: text("notas"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("barber_cuts_log_barbero_fecha_idx").on(table.barberoId, table.fecha),
  ]
);

// ————————————————————————————
// PORTFOLIO DEL BARBERO
// ————————————————————————————
export const barberoPortfolioItems = pgTable(
  "barbero_portfolio_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barberoId: uuid("barbero_id")
      .notNull()
      .references(() => barberos.id, { onDelete: "cascade" }),
    fotoUrl: text("foto_url").notNull(),
    caption: text("caption"),
    orden: integer("orden").notNull().default(0),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("portfolio_barbero_idx").on(table.barberoId),
  ]
);

// ————————————————————————————
// JUKEBOX SOCIAL
// ————————————————————————————
export const jukeboxProposals = pgTable(
  "jukebox_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    youtubeVideoId: text("youtube_video_id").notNull(),
    videoTitle: text("video_title").notNull(),
    channelTitle: text("channel_title").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    durationSeconds: integer("duration_seconds"),
    proposedByName: text("proposed_by_name").notNull(),
    deviceKeyHash: text("device_key_hash").notNull(),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<"pending" | "approved" | "rejected" | "played">(),
    autoApproved: boolean("auto_approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("jukebox_proposals_status_idx").on(table.status),
    index("jukebox_proposals_created_at_idx").on(table.createdAt),
    index("jukebox_proposals_device_idx").on(table.deviceKeyHash, table.createdAt),
  ]
);

export const jukeboxQueue = pgTable(
  "jukebox_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => jukeboxProposals.id, { onDelete: "cascade" }),
    positionHint: integer("position_hint").notNull(),
    state: text("state")
      .notNull()
      .default("queued")
      .$type<"queued" | "playing" | "played" | "skipped">(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jukebox_queue_state_idx").on(table.state),
    index("jukebox_queue_position_idx").on(table.positionHint),
  ]
);

// ————————————————————————————
// ACTIVOS DEL LOCAL
// ————————————————————————————
export const barberShopAssets = pgTable("barber_shop_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  categoria: text("categoria")
    .notNull()
    .$type<(typeof HANGAR_ASSET_CATEGORIAS)[number]>(),
  precioCompra: numeric("precio_compra", { precision: 12, scale: 2 }),
  precioObjetivo: numeric("precio_objetivo", { precision: 12, scale: 2 }),
  fechaCompra: date("fecha_compra"),
  fechaPrimerPago: date("fecha_primer_pago"),
  fechaPagoCompleto: date("fecha_pago_completo"),
  proveedor: text("proveedor"),
  marca: text("marca"),
  modelo: text("modelo"),
  fotoUrl: text("foto_url"),
  comprobanteUrl: text("comprobante_url"),
  notas: text("notas"),
  estado: text("estado")
    .notNull()
    .default("activo")
    .$type<"activo" | "dado_de_baja">(),
  estadoCompra: text("estado_compra")
    .notNull()
    .default("pagado")
    .$type<(typeof HANGAR_ASSET_ESTADOS_COMPRA)[number]>(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("barber_shop_assets_categoria_idx").on(table.categoria),
  index("barber_shop_assets_estado_compra_idx").on(table.estadoCompra),
  check(
    "barber_shop_assets_estado_compra_check",
    sql`${table.estadoCompra} IN (${sql.raw(HANGAR_ASSET_ESTADOS_COMPRA.map((item) => `'${item}'`).join(", "))})`
  ),
]);

export const barberShopAssetPayments = pgTable("barber_shop_asset_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => barberShopAssets.id, { onDelete: "cascade" }),
  capitalMovimientoId: uuid("capital_movimiento_id").references(() => capitalMovimientos.id),
  tipo: text("tipo")
    .notNull()
    .$type<(typeof HANGAR_ASSET_PAYMENT_TYPES)[number]>(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  fecha: date("fecha").notNull(),
  descripcion: text("descripcion"),
  comprobanteUrl: text("comprobante_url"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("barber_shop_asset_payments_asset_idx").on(table.assetId),
  uniqueIndex("barber_shop_asset_payments_capital_movimiento_idx").on(table.capitalMovimientoId),
  check(
    "barber_shop_asset_payments_tipo_check",
    sql`${table.tipo} IN (${sql.raw(HANGAR_ASSET_PAYMENT_TYPES.map((item) => `'${item}'`).join(", "))})`
  ),
]);

// ————————————————————————————
// ECONOMÍA DE OVNIS
// ————————————————————————————

export const ovnisBalance = pgTable(
  "ovnis_balance",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clients.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    pendingBalance: integer("pending_balance").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("ovnis_balance_non_negative", sql`${table.balance} >= 0 AND ${table.pendingBalance} >= 0`),
  ]
);

export const ovnisPendingCredits = pgTable(
  "ovnis_pending_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    atencionId: uuid("atencion_id")
      .notNull()
      .references(() => atenciones.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    description: text("description").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ovnis_pending_credits_atencion_id_idx").on(table.atencionId),
    index("ovnis_pending_credits_client_unredeemed_idx").on(table.clientId, table.redeemedAt),
    check("ovnis_pending_credits_amount_positive", sql`${table.amount} > 0`),
  ]
);

export const ovnisTransactions = pgTable(
  "ovnis_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    relatedClientId: uuid("related_client_id").references(() => clients.id, { onDelete: "set null" }),
    relatedAtencionId: uuid("related_atencion_id").references(() => atenciones.id, { onDelete: "set null" }),
    relatedBetId: uuid("related_bet_id").references(() => ovnisBets.id, { onDelete: "set null" }),
    relatedRedemptionId: uuid("related_redemption_id").references(() => ovnisRedemptions.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "ovnis_transactions_type_check",
      sql`${table.type} IN ('welcome','atencion','ruleta','redemption','redemption_refund','donation_sent','donation_received','bet_lock','bet_unlock','bet_win','bet_refund','bet_burn','admin_adjust')`
    ),
    check("ovnis_transactions_amount_nonzero", sql`${table.amount} <> 0`),
    uniqueIndex("ovnis_transactions_idempotency_key_idx").on(table.idempotencyKey),
    index("ovnis_transactions_client_id_idx").on(table.clientId),
    index("ovnis_transactions_created_at_idx").on(table.createdAt),
  ]
);

export const ovnisRedemptionItems = pgTable(
  "ovnis_redemption_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: text("label").notNull(),
    type: text("type").notNull(),
    costOvnis: integer("cost_ovnis").notNull(),
    value: integer("value").notNull().default(0),
    productoId: uuid("producto_id").references(() => productos.id, { onDelete: "set null" }),
    activo: boolean("activo").notNull().default(true),
    stock: integer("stock"),
  },
  (table) => [
    check("ovnis_redemption_items_type_check", sql`${table.type} IN ('consumicion','descuento_pct','descuento_fijo','producto')`),
    check("ovnis_redemption_items_cost_positive", sql`${table.costOvnis} > 0`),
    check("ovnis_redemption_items_stock_nonneg", sql`${table.stock} IS NULL OR ${table.stock} >= 0`),
  ]
);

export const ovnisRedemptions = pgTable(
  "ovnis_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => ovnisRedemptionItems.id, { onDelete: "restrict" }),
    costOvnis: integer("cost_ovnis").notNull(),
    status: text("status").notNull().default("pending"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveredByBarberoId: uuid("delivered_by_barbero_id").references(() => barberos.id, { onDelete: "set null" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByUserId: text("cancelled_by_user_id").references(() => user.id, { onDelete: "set null" }),
    cancelReason: text("cancel_reason"),
    notas: text("notas"),
  },
  (table) => [
    check("ovnis_redemptions_status_check", sql`${table.status} IN ('pending','delivered','cancelled')`),
    index("ovnis_redemptions_client_id_idx").on(table.clientId),
    index("ovnis_redemptions_status_idx").on(table.status),
  ]
);

export const ovnisRuletaPrizes = pgTable(
  "ovnis_ruleta_prizes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: text("label").notNull(),
    type: text("type").notNull(),
    ovnisAmount: integer("ovnis_amount").notNull().default(0),
    redemptionItemId: uuid("redemption_item_id").references(() => ovnisRedemptionItems.id, { onDelete: "restrict" }),
    weight: integer("weight").notNull().default(1),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [
    check("ovnis_ruleta_prizes_type_check", sql`${table.type} IN ('ovnis','redemption_item','nada')`),
    check("ovnis_ruleta_prizes_weight_positive", sql`${table.weight} > 0`),
    check(
      "ovnis_ruleta_prizes_type_consistency",
      sql`(${table.type} = 'ovnis' AND ${table.ovnisAmount} > 0 AND ${table.redemptionItemId} IS NULL) OR
          (${table.type} = 'redemption_item' AND ${table.redemptionItemId} IS NOT NULL) OR
          (${table.type} = 'nada')`
    ),
  ]
);

// One spin per client ever — this is the "bienvenida" welcome spin, not a monthly lottery.
// sorteosParticipados in marciano_beneficios_uso tracks a separate monthly draw system.
export const ovnisRuletaSpins = pgTable("ovnis_ruleta_spins", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "restrict" }),
  prizeId: uuid("prize_id")
    .notNull()
    .references(() => ovnisRuletaPrizes.id, { onDelete: "restrict" }),
  spunAt: timestamp("spun_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ovnisGames = pgTable(
  "ovnis_games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: text("nombre").notNull(),
    type: text("type").notNull(),
    externalUrl: text("external_url"),
    descripcion: text("descripcion"),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [
    check("ovnis_games_type_check", sql`${table.type} IN ('physical','digital')`),
  ]
);

export const ovnisBets = pgTable(
  "ovnis_bets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => ovnisGames.id, { onDelete: "restrict" }),
    challengerId: uuid("challenger_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    opponentId: uuid("opponent_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    status: text("status").notNull().default("pending"),
    challengerClaim: text("challenger_claim"),
    opponentClaim: text("opponent_claim"),
    claimAttempts: integer("claim_attempts").notNull().default(0),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acceptanceExpiresAt: timestamp("acceptance_expires_at", { withTimezone: true }).notNull(),
    playExpiresAt: timestamp("play_expires_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "ovnis_bets_status_check",
      sql`${table.status} IN ('pending','accepted','disputed','challenger_won','opponent_won','refunded','cancelled','rejected','both_lost','stale_burned')`
    ),
    check("ovnis_bets_claim_check", sql`${table.challengerClaim} IS NULL OR ${table.challengerClaim} IN ('won','lost','forfeit')`),
    check("ovnis_bets_opp_claim_check", sql`${table.opponentClaim} IS NULL OR ${table.opponentClaim} IN ('won','lost','forfeit')`),
    check("ovnis_bets_claim_attempts_max", sql`${table.claimAttempts} >= 0 AND ${table.claimAttempts} <= 3`),
    check("ovnis_bets_amount_positive", sql`${table.amount} > 0`),
    check("ovnis_bets_distinct_players", sql`${table.challengerId} <> ${table.opponentId}`),
    index("ovnis_bets_status_idx").on(table.status),
    index("ovnis_bets_challenger_idx").on(table.challengerId),
    index("ovnis_bets_opponent_idx").on(table.opponentId),
    index("ovnis_bets_acceptance_expiry_idx").on(table.acceptanceExpiresAt),
    index("ovnis_bets_play_expiry_idx").on(table.playExpiresAt),
  ]
);
