ALTER TABLE "atenciones" DROP CONSTRAINT "atenciones_cierre_caja_id_cierres_caja_id_fk";
--> statement-breakpoint
ALTER TABLE "barberos" DROP CONSTRAINT "barberos_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ovnis_transactions" DROP CONSTRAINT "ovnis_transactions_related_bet_id_ovnis_bets_id_fk";
--> statement-breakpoint
ALTER TABLE "ovnis_transactions" DROP CONSTRAINT "ovnis_transactions_related_redemption_id_ovnis_redemptions_id_fk";
--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "barbero_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "servicio_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "precio_base" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "precio_cobrado" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "medio_pago_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "comision_medio_pago_pct" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "comision_medio_pago_monto" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "monto_neto" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "comision_barbero_pct" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "comision_barbero_monto" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "anulado" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "creado_en" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones_adicionales" ALTER COLUMN "atencion_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones_adicionales" ALTER COLUMN "adicional_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones_adicionales" ALTER COLUMN "precio_cobrado" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "barberos" ALTER COLUMN "activo" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "barberos" ALTER COLUMN "creado_en" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cierres_caja" ALTER COLUMN "total_bruto" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cierres_caja" ALTER COLUMN "total_comisiones_medios" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cierres_caja" ALTER COLUMN "total_neto" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cierres_caja" ALTER COLUMN "cerrado_por" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cierres_caja" ALTER COLUMN "cerrado_en" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ALTER COLUMN "presupuesto_mensual_gastos" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ALTER COLUMN "presupuesto_mensual_gastos" SET DEFAULT '1956686.00';--> statement-breakpoint
ALTER TABLE "gastos" ALTER COLUMN "monto" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gastos" ALTER COLUMN "fecha" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gastos" ALTER COLUMN "tipo" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "liquidaciones" ALTER COLUMN "barbero_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "liquidaciones" ALTER COLUMN "pagado" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "medios_pago" ALTER COLUMN "comision_porcentaje" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "medios_pago" ALTER COLUMN "activo" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "servicios" ALTER COLUMN "activo" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_cierre_caja_id_cierres_caja_id_fk" FOREIGN KEY ("cierre_caja_id") REFERENCES "public"."cierres_caja"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barberos" ADD CONSTRAINT "barberos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_transactions" ADD CONSTRAINT "ovnis_transactions_related_bet_id_ovnis_bets_id_fk" FOREIGN KEY ("related_bet_id") REFERENCES "public"."ovnis_bets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_transactions" ADD CONSTRAINT "ovnis_transactions_related_redemption_id_ovnis_redemptions_id_fk" FOREIGN KEY ("related_redemption_id") REFERENCES "public"."ovnis_redemptions"("id") ON DELETE set null ON UPDATE no action;