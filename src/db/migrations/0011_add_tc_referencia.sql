CREATE TABLE "capital_movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" date NOT NULL,
	"tipo" text NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capital_movimientos_tipo_check" CHECK ("capital_movimientos"."tipo" IN ('aporte', 'retiro'))
);
--> statement-breakpoint
CREATE TABLE "costos_fijos_negocio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"monto_mensual" numeric(12, 2),
	"categoria" text NOT NULL,
	"notas" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "costos_fijos_valores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"costo_id" uuid NOT NULL,
	"mes" text NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marciano_cuts_config" (
	"face_shape" text PRIMARY KEY NOT NULL,
	"cuts" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_face_shape_check";--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ADD COLUMN "tc_referencia" numeric(10, 2) DEFAULT '1400.00';--> statement-breakpoint
ALTER TABLE "costos_fijos_valores" ADD CONSTRAINT "costos_fijos_valores_costo_id_costos_fijos_negocio_id_fk" FOREIGN KEY ("costo_id") REFERENCES "public"."costos_fijos_negocio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capital_movimientos_fecha_idx" ON "capital_movimientos" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "costos_fijos_valores_costo_mes_idx" ON "costos_fijos_valores" USING btree ("costo_id","mes");--> statement-breakpoint
CREATE INDEX "costos_fijos_valores_mes_idx" ON "costos_fijos_valores" USING btree ("mes");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_face_shape_check" CHECK ("clients"."face_shape" IN ('oval', 'cuadrado', 'redondo', 'corazon', 'diamante', 'alien') OR "clients"."face_shape" IS NULL);