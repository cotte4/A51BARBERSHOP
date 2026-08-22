CREATE TABLE "presupuesto_lineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presupuesto_id" uuid NOT NULL,
	"categoria" text NOT NULL,
	"nombre" text NOT NULL,
	"monto_estimado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notas" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "presupuesto_lineas_categoria_check" CHECK ("presupuesto_lineas"."categoria" IN ('Inmueble', 'Obra', 'Habilitaciones', 'Equipamiento', 'Mobiliario', 'Otros')),
	CONSTRAINT "presupuesto_lineas_monto_no_negativo" CHECK ("presupuesto_lineas"."monto_estimado" >= 0)
);
--> statement-breakpoint
CREATE TABLE "presupuestos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"scope" text DEFAULT 'memas' NOT NULL,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "presupuestos_scope_check" CHECK ("presupuestos"."scope" IN ('memas', 'a51'))
);
--> statement-breakpoint
ALTER TABLE "presupuesto_lineas" ADD CONSTRAINT "presupuesto_lineas_presupuesto_id_presupuestos_id_fk" FOREIGN KEY ("presupuesto_id") REFERENCES "public"."presupuestos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "presupuesto_lineas_presupuesto_idx" ON "presupuesto_lineas" USING btree ("presupuesto_id");--> statement-breakpoint
CREATE INDEX "presupuestos_scope_idx" ON "presupuestos" USING btree ("scope");