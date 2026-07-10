DROP INDEX "repago_memas_cuotas_repago_numero_idx";--> statement-breakpoint
CREATE INDEX "repago_memas_cuotas_repago_numero_idx" ON "repago_memas_cuotas" USING btree ("repago_id","numero_cuota");