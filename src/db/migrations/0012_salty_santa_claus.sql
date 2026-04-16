CREATE TABLE "barber_cuts_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"servicio_nombre" text NOT NULL,
	"cliente_nombre" text,
	"foto_url" text,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "barber_shop_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"categoria" text NOT NULL,
	"precio_compra" numeric(12, 2) NOT NULL,
	"fecha_compra" date NOT NULL,
	"proveedor" text,
	"notas" text,
	"estado" text DEFAULT 'activo' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "barbero_portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid NOT NULL,
	"foto_url" text NOT NULL,
	"caption" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "barber_cuts_log" ADD CONSTRAINT "barber_cuts_log_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barbero_portfolio_items" ADD CONSTRAINT "barbero_portfolio_items_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "barber_cuts_log_barbero_fecha_idx" ON "barber_cuts_log" USING btree ("barbero_id","fecha");--> statement-breakpoint
CREATE INDEX "portfolio_barbero_idx" ON "barbero_portfolio_items" USING btree ("barbero_id");