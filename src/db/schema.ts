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
    tipoModelo: text("tipo_modelo").$type<"variable" | "hibrido" | "fijo">(),
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
    servicioDefectoId: uuid("servicio_defecto_id").references(() => servicios.id),
    medioPagoDefectoId: uuid("medio_pago_defecto_id").references(() => mediosPago.id),
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
export const servicios = pgTable(
  "servicios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: text("nombre").notNull(),
    precioBase: numeric("precio_base", { precision: 12, scale: 2 }),
    duracionMinutos: integer("duracion_minutos").notNull().default(60),
    activo: boolean("activo").default(true),
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
  clientId: uuid("client_id").references(() => clients.id),
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
},
(table) => [
  index("atenciones_fecha_idx").on(table.fecha),
  index("atenciones_barbero_id_idx").on(table.barberoId),
  index("atenciones_client_id_idx").on(table.clientId),
]);

export const atencionesAdicionales = pgTable("atenciones_adicionales", {
  id: uuid("id").defaultRandom().primaryKey(),
  atencionId: uuid("atencion_id").references(() => atenciones.id),
  adicionalId: uuid("adicional_id").references(() => serviciosAdicionales.id),
  precioCobrado: numeric("precio_cobrado", { precision: 12, scale: 2 }),
});

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
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  precioVenta: numeric("precio_venta", { precision: 12, scale: 2 }),
  costoCompra: numeric("costo_compra", { precision: 12, scale: 2 }),
  stockActual: integer("stock_actual").default(0),
  stockMinimo: integer("stock_minimo").default(5),
  esConsumicion: boolean("es_consumicion").notNull().default(false),
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
    costoUnitarioSnapshot: numeric("costo_unitario_snapshot", { precision: 12, scale: 2 }),
    referenciaId: uuid("referencia_id"),
    notas: text("notas"),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      "stock_movimientos_tipo_check",
      sql`${table.tipo} IN ('entrada', 'venta', 'uso_interno', 'ajuste')`
    ),
    index("stock_movimientos_tipo_idx").on(table.tipo),
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
    tipo: text("tipo").default("fijo"),
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
},
(table) => [
  index("liquidaciones_barbero_id_idx").on(table.barberoId),
]);

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
  deudaUsd: numeric("deuda_usd", { precision: 10, scale: 2 }),
  tasaAnualUsd: numeric("tasa_anual_usd", { precision: 5, scale: 4 }),
  cantidadCuotasPactadas: integer("cantidad_cuotas_pactadas"),
});

export const repagoMemasCuotas = pgTable("repago_memas_cuotas", {
  id: uuid("id").defaultRandom().primaryKey(),
  numeroCuota: integer("numero_cuota"),
  fechaPago: date("fecha_pago"),
  montoPagado: numeric("monto_pagado", { precision: 12, scale: 2 }),
  comprobanteUrl: text("comprobante_url"),
  repagoId: uuid("repago_id").references(() => repagoMemas.id),
  capitalPagado: numeric("capital_pagado", { precision: 12, scale: 2 }),
  interesPagado: numeric("interes_pagado", { precision: 12, scale: 2 }),
  tcDia: numeric("tc_dia", { precision: 10, scale: 2 }),
  notas: text("notas"),
});

// ————————————————————————————
// CONFIGURACIÓN DEL NEGOCIO
// ————————————————————————————
export const configuracionNegocio = pgTable("configuracion_negocio", {
  id: uuid("id").primaryKey().defaultRandom(),
  presupuestoMensualGastos: integer("presupuesto_mensual_gastos")
    .notNull()
    .default(1956686),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow(),
  actualizadoPor: text("actualizado_por"),
});

// ————————————————————————————————————————————————————————
// CLIENTES / MARCIANOS
// ————————————————————————————————————————————————————————
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
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
      .references(() => user.id),
    createdByBarberoId: uuid("created_by_barbero_id").references(() => barberos.id),
    totalVisits: integer("total_visits").notNull().default(0),
    lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
    lastVisitBarberoId: uuid("last_visit_barbero_id").references(() => barberos.id),
    avgDaysBetweenVisits: numeric("avg_days_between_visits", {
      precision: 8,
      scale: 2,
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("clients_phone_normalized_idx").on(table.phoneNormalized),
    index("clients_name_idx").on(table.name),
    index("clients_last_visit_at_idx").on(table.lastVisitAt),
    index("clients_es_marciano_last_visit_at_idx").on(
      table.esMarciano,
      table.lastVisitAt
    ),
    index("clients_created_by_barbero_id_idx").on(table.createdByBarberoId),
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
      sql`${table.duracionMinutos} IN (45, 60)`
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

export const pantallaVotes = pgTable(
  "pantalla_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => pantallaEvents.id, { onDelete: "cascade" }),
    deviceKeyHash: text("device_key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pantalla_votes_event_id_idx").on(table.eventId),
    uniqueIndex("pantalla_votes_event_device_key_idx").on(
      table.eventId,
      table.deviceKeyHash
    ),
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
      .notNull()
      .references(() => barberos.id),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    barberNotes: text("barber_notes"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    photoUrls: text("photo_urls").array().notNull().default(sql`'{}'::text[]`),
    propinaEstrellas: integer("propina_estrellas").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
      .notNull()
      .references(() => user.id),
    changedByBarberoId: uuid("changed_by_barbero_id").references(() => barberos.id),
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
  (table) => [uniqueIndex("marciano_beneficios_uso_client_mes_idx").on(table.clientId, table.mes)]
);

export const clientBriefingCache = pgTable(
  "client_briefing_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    viewerScope: text("viewer_scope").notNull(),
    viewerBarberoId: uuid("viewer_barbero_id").references(() => barberos.id),
    cacheKey: text("cache_key").notNull(),
    briefingText: text("briefing_text").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "client_briefing_cache_scope_check",
      sql`${table.viewerScope} IN ('admin', 'barbero')`
    ),
    index("client_briefing_cache_client_scope_idx").on(
      table.clientId,
      table.viewerScope,
      table.viewerBarberoId
    ),
  ]
);
