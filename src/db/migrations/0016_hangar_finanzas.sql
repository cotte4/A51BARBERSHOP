ALTER TABLE "capital_movimientos" DROP CONSTRAINT IF EXISTS "capital_movimientos_tipo_check";
ALTER TABLE "capital_movimientos"
  ADD CONSTRAINT "capital_movimientos_tipo_check"
  CHECK ("tipo" IN ('aporte', 'retiro', 'inversion_activo'));

ALTER TABLE "barber_shop_assets" ALTER COLUMN "precio_compra" DROP NOT NULL;
ALTER TABLE "barber_shop_assets" ALTER COLUMN "fecha_compra" DROP NOT NULL;
ALTER TABLE "barber_shop_assets" ADD COLUMN "precio_objetivo" numeric(12, 2);
ALTER TABLE "barber_shop_assets" ADD COLUMN "fecha_primer_pago" date;
ALTER TABLE "barber_shop_assets" ADD COLUMN "fecha_pago_completo" date;
ALTER TABLE "barber_shop_assets" ADD COLUMN "marca" text;
ALTER TABLE "barber_shop_assets" ADD COLUMN "modelo" text;
ALTER TABLE "barber_shop_assets" ADD COLUMN "foto_url" text;
ALTER TABLE "barber_shop_assets" ADD COLUMN "comprobante_url" text;
ALTER TABLE "barber_shop_assets" ADD COLUMN "estado_compra" text DEFAULT 'pagado' NOT NULL;

UPDATE "barber_shop_assets"
SET
  "precio_objetivo" = COALESCE("precio_compra", "precio_objetivo"),
  "fecha_primer_pago" = COALESCE("fecha_primer_pago", "fecha_compra"),
  "fecha_pago_completo" = COALESCE("fecha_pago_completo", "fecha_compra"),
  "estado_compra" = COALESCE("estado_compra", 'pagado');

ALTER TABLE "barber_shop_assets"
  ADD CONSTRAINT "barber_shop_assets_estado_compra_check"
  CHECK ("estado_compra" IN ('planificado', 'senado', 'en_cuotas', 'pagado', 'cancelado'));

CREATE INDEX "barber_shop_assets_categoria_idx" ON "barber_shop_assets" USING btree ("categoria");
CREATE INDEX "barber_shop_assets_estado_compra_idx" ON "barber_shop_assets" USING btree ("estado_compra");

CREATE TABLE "barber_shop_asset_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL REFERENCES "barber_shop_assets"("id") ON DELETE cascade,
  "capital_movimiento_id" uuid REFERENCES "capital_movimientos"("id"),
  "tipo" text NOT NULL,
  "monto" numeric(12, 2) NOT NULL,
  "fecha" date NOT NULL,
  "descripcion" text,
  "comprobante_url" text,
  "creado_en" timestamp with time zone DEFAULT now()
);

ALTER TABLE "barber_shop_asset_payments"
  ADD CONSTRAINT "barber_shop_asset_payments_tipo_check"
  CHECK ("tipo" IN ('sena', 'cuota', 'saldo_final', 'ajuste'));

CREATE INDEX "barber_shop_asset_payments_asset_idx"
  ON "barber_shop_asset_payments" USING btree ("asset_id");
CREATE UNIQUE INDEX "barber_shop_asset_payments_capital_movimiento_idx"
  ON "barber_shop_asset_payments" USING btree ("capital_movimiento_id");
