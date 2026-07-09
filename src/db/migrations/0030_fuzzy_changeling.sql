DROP INDEX "clients_avatar_prediction_id_idx";--> statement-breakpoint
CREATE INDEX "atenciones_cierre_caja_id_idx" ON "atenciones" USING btree ("cierre_caja_id");--> statement-breakpoint
CREATE INDEX "atenciones_servicio_id_idx" ON "atenciones" USING btree ("servicio_id");--> statement-breakpoint
CREATE INDEX "atenciones_medio_pago_id_idx" ON "atenciones" USING btree ("medio_pago_id");--> statement-breakpoint
CREATE INDEX "atenciones_adicionales_atencion_id_idx" ON "atenciones_adicionales" USING btree ("atencion_id");--> statement-breakpoint
CREATE INDEX "atenciones_adicionales_adicional_id_idx" ON "atenciones_adicionales" USING btree ("adicional_id");--> statement-breakpoint
CREATE INDEX "servicios_adicionales_servicio_id_idx" ON "servicios_adicionales" USING btree ("servicio_id");--> statement-breakpoint
CREATE INDEX "servicios_precios_historial_servicio_id_idx" ON "servicios_precios_historial" USING btree ("servicio_id");--> statement-breakpoint
CREATE INDEX "stock_movimientos_producto_id_idx" ON "stock_movimientos" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "turnos_client_id_idx" ON "turnos" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "turnos_servicio_id_idx" ON "turnos" USING btree ("servicio_id");