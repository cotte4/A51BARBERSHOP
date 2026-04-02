CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atenciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid,
	"servicio_id" uuid,
	"fecha" date NOT NULL,
	"hora" time with time zone,
	"precio_base" numeric(12, 2),
	"precio_cobrado" numeric(12, 2),
	"medio_pago_id" uuid,
	"comision_medio_pago_pct" numeric(5, 2),
	"comision_medio_pago_monto" numeric(12, 2),
	"monto_neto" numeric(12, 2),
	"comision_barbero_pct" numeric(5, 2),
	"comision_barbero_monto" numeric(12, 2),
	"anulado" boolean DEFAULT false,
	"motivo_anulacion" text,
	"notas" text,
	"cierre_caja_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "atenciones_adicionales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atencion_id" uuid,
	"adicional_id" uuid,
	"precio_cobrado" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "atenciones_productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atencion_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"costo_unitario_snapshot" numeric(12, 2),
	CONSTRAINT "atenciones_productos_cantidad_check" CHECK ("atenciones_productos"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "barberos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"rol" text NOT NULL,
	"tipo_modelo" text,
	"porcentaje_comision" numeric(5, 2),
	"alquiler_banco_mensual" numeric(12, 2),
	"sueldo_minimo_garantizado" numeric(12, 2),
	"servicio_defecto_id" uuid,
	"medio_pago_defecto_id" uuid,
	"activo" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now(),
	"user_id" text,
	CONSTRAINT "barberos_rol_check" CHECK ("barberos"."rol" IN ('admin', 'barbero')),
	CONSTRAINT "barberos_tipo_modelo_check" CHECK ("barberos"."tipo_modelo" IN ('variable', 'hibrido', 'fijo'))
);
--> statement-breakpoint
CREATE TABLE "categorias_gasto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "cierres_caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" date NOT NULL,
	"total_efectivo" numeric(12, 2) DEFAULT '0',
	"total_mp" numeric(12, 2) DEFAULT '0',
	"total_transferencia" numeric(12, 2) DEFAULT '0',
	"total_posnet" numeric(12, 2) DEFAULT '0',
	"total_bruto" numeric(12, 2),
	"total_comisiones_medios" numeric(12, 2),
	"total_neto" numeric(12, 2),
	"total_cortes_bruto" numeric(12, 2),
	"total_productos" numeric(12, 2),
	"resumen_barberos" jsonb,
	"cantidad_atenciones" integer,
	"cerrado_por" uuid,
	"cerrado_en" timestamp with time zone,
	CONSTRAINT "cierres_caja_fecha_unique" UNIQUE("fecha")
);
--> statement-breakpoint
CREATE TABLE "client_briefing_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"viewer_scope" text NOT NULL,
	"viewer_barbero_id" uuid,
	"cache_key" text NOT NULL,
	"briefing_text" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_briefing_cache_scope_check" CHECK ("client_briefing_cache"."viewer_scope" IN ('admin', 'barbero'))
);
--> statement-breakpoint
CREATE TABLE "client_profile_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by_user_id" text NOT NULL,
	"changed_by_barbero_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_raw" text,
	"phone_normalized" text,
	"avatar_url" text,
	"es_marciano" boolean DEFAULT false NOT NULL,
	"marciano_desde" timestamp with time zone,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"preferences" jsonb,
	"notes" text,
	"created_by_user_id" text NOT NULL,
	"created_by_barbero_id" uuid,
	"total_visits" integer DEFAULT 0 NOT NULL,
	"last_visit_at" timestamp with time zone,
	"last_visit_barbero_id" uuid,
	"avg_days_between_visits" numeric(8, 2),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracion_negocio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presupuesto_mensual_gastos" integer DEFAULT 1956686 NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now(),
	"actualizado_por" text
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid,
	"descripcion" text,
	"monto" numeric(12, 2),
	"fecha" date,
	"tipo" text DEFAULT 'fijo',
	"categoria_visual" text,
	"es_recurrente" boolean DEFAULT false,
	"frecuencia" text,
	"comprobante_url" text,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "gastos_frecuencia_check" CHECK ("gastos"."frecuencia" IN ('mensual', 'trimestral', 'anual', 'unica')),
	CONSTRAINT "gastos_tipo_check" CHECK ("gastos"."tipo" IN ('fijo', 'rapido'))
);
--> statement-breakpoint
CREATE TABLE "liquidaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid,
	"periodo_inicio" date,
	"periodo_fin" date,
	"total_cortes" integer,
	"total_bruto_cortes" numeric(12, 2),
	"total_comision_calculada" numeric(12, 2),
	"sueldo_minimo" numeric(12, 2),
	"alquiler_banco_cobrado" numeric(12, 2),
	"monto_a_pagar" numeric(12, 2),
	"pagado" boolean DEFAULT false,
	"fecha_pago" date,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marciano_beneficios_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"mes" text NOT NULL,
	"cortes_usados" integer DEFAULT 0 NOT NULL,
	"consumiciones_usadas" integer DEFAULT 0 NOT NULL,
	"sorteos_participados" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medios_pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text,
	"comision_porcentaje" numeric(5, 2) DEFAULT '0',
	"activo" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"precio_venta" numeric(12, 2),
	"costo_compra" numeric(12, 2),
	"stock_actual" integer DEFAULT 0,
	"stock_minimo" integer DEFAULT 5,
	"activo" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "repago_memas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"valor_llave_total" numeric(12, 2),
	"cuota_mensual" numeric(12, 2),
	"cuotas_pagadas" integer DEFAULT 0,
	"saldo_pendiente" numeric(12, 2),
	"fecha_inicio" date,
	"pagado_completo" boolean DEFAULT false,
	"deuda_usd" numeric(10, 2),
	"tasa_anual_usd" numeric(5, 4),
	"cantidad_cuotas_pactadas" integer
);
--> statement-breakpoint
CREATE TABLE "repago_memas_cuotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_cuota" integer,
	"fecha_pago" date,
	"monto_pagado" numeric(12, 2),
	"comprobante_url" text,
	"repago_id" uuid,
	"capital_pagado" numeric(12, 2),
	"interes_pagado" numeric(12, 2),
	"tc_dia" numeric(10, 2),
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"precio_base" numeric(12, 2),
	"activo" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "servicios_adicionales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" uuid,
	"nombre" text NOT NULL,
	"precio_extra" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "servicios_precios_historial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio_id" uuid,
	"precio" numeric(12, 2),
	"vigente_desde" date NOT NULL,
	"motivo" text,
	"creado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stock_movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid,
	"tipo" text NOT NULL,
	"cantidad" integer,
	"precio_unitario" numeric(12, 2),
	"costo_unitario_snapshot" numeric(12, 2),
	"referencia_id" uuid,
	"notas" text,
	"fecha" timestamp with time zone DEFAULT now(),
	CONSTRAINT "stock_movimientos_tipo_check" CHECK ("stock_movimientos"."tipo" IN ('entrada', 'venta', 'uso_interno', 'ajuste'))
);
--> statement-breakpoint
CREATE TABLE "temporadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text,
	"fecha_inicio" date,
	"fecha_fin" date,
	"cortes_dia_proyectados" integer,
	"precio_base_proyectado" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "turnos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid NOT NULL,
	"cliente_nombre" text NOT NULL,
	"cliente_telefono_raw" text,
	"cliente_telefono_normalizado" text,
	"client_id" uuid,
	"fecha" date NOT NULL,
	"hora_inicio" time NOT NULL,
	"duracion_minutos" integer NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"nota_cliente" text,
	"sugerencia_cancion" text,
	"motivo_cancelacion" text,
	"es_marciano_snapshot" boolean DEFAULT false NOT NULL,
	"prioridad_absoluta" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "turnos_estado_check" CHECK ("turnos"."estado" IN ('pendiente', 'confirmado', 'completado', 'cancelado')),
	CONSTRAINT "turnos_duracion_minutos_check" CHECK ("turnos"."duracion_minutos" IN (45, 60))
);
--> statement-breakpoint
CREATE TABLE "turnos_disponibilidad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"hora_inicio" time NOT NULL,
	"duracion_minutos" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "turnos_disponibilidad_duracion_minutos_check" CHECK ("turnos_disponibilidad"."duracion_minutos" IN (45, 60))
);
--> statement-breakpoint
CREATE TABLE "turnos_extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turno_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "turnos_extras_cantidad_check" CHECK ("turnos_extras"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "turnos_reserva_intentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "visit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_barbero_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"barber_notes" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"photo_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"propina_estrellas" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_logs_propina_estrellas_check" CHECK ("visit_logs"."propina_estrellas" >= 0 AND "visit_logs"."propina_estrellas" <= 5)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_medio_pago_id_medios_pago_id_fk" FOREIGN KEY ("medio_pago_id") REFERENCES "public"."medios_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atenciones_adicionales" ADD CONSTRAINT "atenciones_adicionales_atencion_id_atenciones_id_fk" FOREIGN KEY ("atencion_id") REFERENCES "public"."atenciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atenciones_adicionales" ADD CONSTRAINT "atenciones_adicionales_adicional_id_servicios_adicionales_id_fk" FOREIGN KEY ("adicional_id") REFERENCES "public"."servicios_adicionales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atenciones_productos" ADD CONSTRAINT "atenciones_productos_atencion_id_atenciones_id_fk" FOREIGN KEY ("atencion_id") REFERENCES "public"."atenciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atenciones_productos" ADD CONSTRAINT "atenciones_productos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barberos" ADD CONSTRAINT "barberos_servicio_defecto_id_servicios_id_fk" FOREIGN KEY ("servicio_defecto_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barberos" ADD CONSTRAINT "barberos_medio_pago_defecto_id_medios_pago_id_fk" FOREIGN KEY ("medio_pago_defecto_id") REFERENCES "public"."medios_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_cerrado_por_barberos_id_fk" FOREIGN KEY ("cerrado_por") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_briefing_cache" ADD CONSTRAINT "client_briefing_cache_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_briefing_cache" ADD CONSTRAINT "client_briefing_cache_viewer_barbero_id_barberos_id_fk" FOREIGN KEY ("viewer_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profile_events" ADD CONSTRAINT "client_profile_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profile_events" ADD CONSTRAINT "client_profile_events_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profile_events" ADD CONSTRAINT "client_profile_events_changed_by_barbero_id_barberos_id_fk" FOREIGN KEY ("changed_by_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_barbero_id_barberos_id_fk" FOREIGN KEY ("created_by_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_last_visit_barbero_id_barberos_id_fk" FOREIGN KEY ("last_visit_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoria_id_categorias_gasto_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_gasto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marciano_beneficios_uso" ADD CONSTRAINT "marciano_beneficios_uso_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repago_memas_cuotas" ADD CONSTRAINT "repago_memas_cuotas_repago_id_repago_memas_id_fk" FOREIGN KEY ("repago_id") REFERENCES "public"."repago_memas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_adicionales" ADD CONSTRAINT "servicios_adicionales_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_precios_historial" ADD CONSTRAINT "servicios_precios_historial_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_precios_historial" ADD CONSTRAINT "servicios_precios_historial_creado_por_barberos_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movimientos" ADD CONSTRAINT "stock_movimientos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnos_disponibilidad" ADD CONSTRAINT "turnos_disponibilidad_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnos_extras" ADD CONSTRAINT "turnos_extras_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnos_extras" ADD CONSTRAINT "turnos_extras_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_created_by_barbero_id_barberos_id_fk" FOREIGN KEY ("created_by_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "atenciones_fecha_idx" ON "atenciones" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "atenciones_barbero_id_idx" ON "atenciones" USING btree ("barbero_id");--> statement-breakpoint
CREATE INDEX "atenciones_productos_atencion_idx" ON "atenciones_productos" USING btree ("atencion_id");--> statement-breakpoint
CREATE INDEX "atenciones_productos_producto_idx" ON "atenciones_productos" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "client_briefing_cache_client_scope_idx" ON "client_briefing_cache" USING btree ("client_id","viewer_scope","viewer_barbero_id");--> statement-breakpoint
CREATE INDEX "client_profile_events_client_created_at_idx" ON "client_profile_events" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_phone_normalized_idx" ON "clients" USING btree ("phone_normalized");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_last_visit_at_idx" ON "clients" USING btree ("last_visit_at");--> statement-breakpoint
CREATE INDEX "clients_es_marciano_last_visit_at_idx" ON "clients" USING btree ("es_marciano","last_visit_at");--> statement-breakpoint
CREATE INDEX "clients_created_by_barbero_id_idx" ON "clients" USING btree ("created_by_barbero_id");--> statement-breakpoint
CREATE INDEX "gastos_fecha_idx" ON "gastos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "gastos_tipo_fecha_idx" ON "gastos" USING btree ("tipo","fecha");--> statement-breakpoint
CREATE INDEX "liquidaciones_barbero_id_idx" ON "liquidaciones" USING btree ("barbero_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marciano_beneficios_uso_client_mes_idx" ON "marciano_beneficios_uso" USING btree ("client_id","mes");--> statement-breakpoint
CREATE INDEX "stock_movimientos_tipo_idx" ON "stock_movimientos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "turnos_barbero_fecha_idx" ON "turnos" USING btree ("barbero_id","fecha");--> statement-breakpoint
CREATE INDEX "turnos_estado_fecha_idx" ON "turnos" USING btree ("estado","fecha");--> statement-breakpoint
CREATE INDEX "turnos_cliente_telefono_normalizado_idx" ON "turnos" USING btree ("cliente_telefono_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "turnos_slot_activo_unico_idx" ON "turnos" USING btree ("barbero_id","fecha","hora_inicio") WHERE "turnos"."estado" IN ('pendiente', 'confirmado');--> statement-breakpoint
CREATE UNIQUE INDEX "turnos_disponibilidad_slot_unico_idx" ON "turnos_disponibilidad" USING btree ("barbero_id","fecha","hora_inicio");--> statement-breakpoint
CREATE INDEX "turnos_disponibilidad_barbero_fecha_idx" ON "turnos_disponibilidad" USING btree ("barbero_id","fecha");--> statement-breakpoint
CREATE INDEX "turnos_extras_turno_idx" ON "turnos_extras" USING btree ("turno_id");--> statement-breakpoint
CREATE INDEX "turnos_reserva_intentos_ip_created_idx" ON "turnos_reserva_intentos" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "visit_logs_client_visited_at_idx" ON "visit_logs" USING btree ("client_id","visited_at");--> statement-breakpoint
CREATE INDEX "visit_logs_created_by_barbero_id_idx" ON "visit_logs" USING btree ("created_by_barbero_id");--> statement-breakpoint
CREATE INDEX "visit_logs_tags_idx" ON "visit_logs" USING gin ("tags");