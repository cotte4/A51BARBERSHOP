CREATE TABLE "barber_shop_asset_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"capital_movimiento_id" uuid,
	"tipo" text NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text,
	"comprobante_url" text,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "barber_shop_asset_payments_tipo_check" CHECK ("barber_shop_asset_payments"."tipo" IN ('sena', 'cuota', 'saldo_final', 'ajuste'))
);
--> statement-breakpoint
ALTER TABLE "capital_movimientos" DROP CONSTRAINT "capital_movimientos_tipo_check";--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ALTER COLUMN "precio_compra" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ALTER COLUMN "fecha_compra" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "precio_objetivo" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "fecha_primer_pago" date;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "fecha_pago_completo" date;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "marca" text;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "modelo" text;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "foto_url" text;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "comprobante_url" text;--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD COLUMN "estado_compra" text DEFAULT 'pagado' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "avatar_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "avatar_prediction_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "avatar_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "avatar_error_message" text;--> statement-breakpoint
ALTER TABLE "barber_shop_asset_payments" ADD CONSTRAINT "barber_shop_asset_payments_asset_id_barber_shop_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."barber_shop_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barber_shop_asset_payments" ADD CONSTRAINT "barber_shop_asset_payments_capital_movimiento_id_capital_movimientos_id_fk" FOREIGN KEY ("capital_movimiento_id") REFERENCES "public"."capital_movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "barber_shop_asset_payments_asset_idx" ON "barber_shop_asset_payments" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "barber_shop_asset_payments_capital_movimiento_idx" ON "barber_shop_asset_payments" USING btree ("capital_movimiento_id");--> statement-breakpoint
CREATE INDEX "barber_shop_assets_categoria_idx" ON "barber_shop_assets" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "barber_shop_assets_estado_compra_idx" ON "barber_shop_assets" USING btree ("estado_compra");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_avatar_prediction_id_idx" ON "clients" USING btree ("avatar_prediction_id");--> statement-breakpoint
ALTER TABLE "barber_shop_assets" ADD CONSTRAINT "barber_shop_assets_estado_compra_check" CHECK ("barber_shop_assets"."estado_compra" IN ('planificado', 'senado', 'en_cuotas', 'pagado', 'cancelado'));--> statement-breakpoint
ALTER TABLE "capital_movimientos" ADD CONSTRAINT "capital_movimientos_tipo_check" CHECK ("capital_movimientos"."tipo" IN ('aporte', 'retiro', 'inversion_activo'));--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_avatar_status_check" CHECK ("clients"."avatar_status" IN ('idle', 'processing', 'ready', 'failed'));