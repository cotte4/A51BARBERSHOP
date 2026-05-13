DROP INDEX "client_briefing_cache_client_scope_idx";--> statement-breakpoint
ALTER TABLE "liquidaciones" ALTER COLUMN "periodo_inicio" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "liquidaciones" ALTER COLUMN "periodo_fin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "medios_pago" ALTER COLUMN "nombre" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "repago_memas_cuotas" ALTER COLUMN "numero_cuota" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "repago_memas_cuotas" ALTER COLUMN "repago_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "liquidaciones_barbero_periodo_idx" ON "liquidaciones" USING btree ("barbero_id","periodo_inicio","periodo_fin");--> statement-breakpoint
CREATE UNIQUE INDEX "medios_pago_nombre_idx" ON "medios_pago" USING btree ("nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "repago_memas_cuotas_repago_numero_idx" ON "repago_memas_cuotas" USING btree ("repago_id","numero_cuota");--> statement-breakpoint
CREATE UNIQUE INDEX "client_briefing_cache_client_scope_idx" ON "client_briefing_cache" USING btree ("client_id","viewer_scope","viewer_barbero_id");--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_nombre_unique" UNIQUE("nombre");