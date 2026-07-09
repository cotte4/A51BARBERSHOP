ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_precio_base_nonneg" CHECK ("atenciones"."precio_base" >= 0);--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_precio_cobrado_nonneg" CHECK ("atenciones"."precio_cobrado" >= 0);--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_comision_medio_pago_monto_nonneg" CHECK ("atenciones"."comision_medio_pago_monto" >= 0);--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_comision_barbero_monto_nonneg" CHECK ("atenciones"."comision_barbero_monto" >= 0);--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_monto_neto_nonneg" CHECK ("atenciones"."monto_neto" >= 0);--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_comision_medio_pago_pct_range" CHECK ("atenciones"."comision_medio_pago_pct" BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_comision_barbero_pct_range" CHECK ("atenciones"."comision_barbero_pct" BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_monto_neto_coherente" CHECK (ABS("atenciones"."monto_neto" - ("atenciones"."precio_cobrado" - "atenciones"."comision_medio_pago_monto")) <= 0.01);--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_total_bruto_nonneg" CHECK ("cierres_caja"."total_bruto" >= 0);--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_total_neto_nonneg" CHECK ("cierres_caja"."total_neto" >= 0);--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_total_comisiones_medios_nonneg" CHECK ("cierres_caja"."total_comisiones_medios" >= 0);--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_total_neto_coherente" CHECK ("cierres_caja"."total_neto" = "cierres_caja"."total_bruto" - "cierres_caja"."total_comisiones_medios");--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_comisiones_lte_bruto" CHECK ("cierres_caja"."total_comisiones_medios" <= "cierres_caja"."total_bruto");--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_total_bruto_cortes_nonneg" CHECK ("liquidaciones"."total_bruto_cortes" >= 0);--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_total_comision_calculada_nonneg" CHECK ("liquidaciones"."total_comision_calculada" >= 0);--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_monto_a_pagar_nonneg" CHECK ("liquidaciones"."monto_a_pagar" >= 0);--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_monto_a_pagar_lte_bruto" CHECK ("liquidaciones"."monto_a_pagar" <= "liquidaciones"."total_bruto_cortes");--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_pagado_fecha_coherente" CHECK (("liquidaciones"."pagado" = true AND "liquidaciones"."fecha_pago" IS NOT NULL) OR ("liquidaciones"."pagado" = false AND "liquidaciones"."fecha_pago" IS NULL));