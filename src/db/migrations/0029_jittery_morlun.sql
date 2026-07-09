ALTER TABLE "barberos" DROP CONSTRAINT "barberos_servicio_defecto_id_servicios_id_fk";
--> statement-breakpoint
ALTER TABLE "barberos" DROP CONSTRAINT "barberos_medio_pago_defecto_id_medios_pago_id_fk";
--> statement-breakpoint
ALTER TABLE "cierres_caja" DROP CONSTRAINT "cierres_caja_cerrado_por_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "client_briefing_cache" DROP CONSTRAINT "client_briefing_cache_viewer_barbero_id_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "client_profile_events" DROP CONSTRAINT "client_profile_events_changed_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "client_profile_events" DROP CONSTRAINT "client_profile_events_changed_by_barbero_id_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_created_by_barbero_id_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_last_visit_barbero_id_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "music_mode_state" DROP CONSTRAINT "music_mode_state_manual_owner_barbero_id_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "music_mode_state" DROP CONSTRAINT "music_mode_state_manual_owner_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "music_mode_state" DROP CONSTRAINT "music_mode_state_updated_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "music_queue_items" DROP CONSTRAINT "music_queue_items_owner_barbero_id_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "music_queue_sessions" DROP CONSTRAINT "music_queue_sessions_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "music_runtime_status" DROP CONSTRAINT "music_runtime_status_active_player_id_music_players_id_fk";
--> statement-breakpoint
ALTER TABLE "repago_memas_cuotas" DROP CONSTRAINT "repago_memas_cuotas_repago_id_repago_memas_id_fk";
--> statement-breakpoint
ALTER TABLE "servicios_precios_historial" DROP CONSTRAINT "servicios_precios_historial_creado_por_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_logs" DROP CONSTRAINT "visit_logs_created_by_barbero_id_barberos_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_logs" DROP CONSTRAINT "visit_logs_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "cierres_caja" ALTER COLUMN "cerrado_por" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profile_events" ALTER COLUMN "changed_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_logs" ALTER COLUMN "created_by_barbero_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_logs" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categorias_gasto" ADD COLUMN "activo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "barberos" ADD CONSTRAINT "barberos_servicio_defecto_id_servicios_id_fk" FOREIGN KEY ("servicio_defecto_id") REFERENCES "public"."servicios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barberos" ADD CONSTRAINT "barberos_medio_pago_defecto_id_medios_pago_id_fk" FOREIGN KEY ("medio_pago_defecto_id") REFERENCES "public"."medios_pago"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_cerrado_por_barberos_id_fk" FOREIGN KEY ("cerrado_por") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_briefing_cache" ADD CONSTRAINT "client_briefing_cache_viewer_barbero_id_barberos_id_fk" FOREIGN KEY ("viewer_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profile_events" ADD CONSTRAINT "client_profile_events_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profile_events" ADD CONSTRAINT "client_profile_events_changed_by_barbero_id_barberos_id_fk" FOREIGN KEY ("changed_by_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_barbero_id_barberos_id_fk" FOREIGN KEY ("created_by_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_last_visit_barbero_id_barberos_id_fk" FOREIGN KEY ("last_visit_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_mode_state" ADD CONSTRAINT "music_mode_state_manual_owner_barbero_id_barberos_id_fk" FOREIGN KEY ("manual_owner_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_mode_state" ADD CONSTRAINT "music_mode_state_manual_owner_user_id_user_id_fk" FOREIGN KEY ("manual_owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_mode_state" ADD CONSTRAINT "music_mode_state_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_queue_items" ADD CONSTRAINT "music_queue_items_owner_barbero_id_barberos_id_fk" FOREIGN KEY ("owner_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_queue_sessions" ADD CONSTRAINT "music_queue_sessions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_runtime_status" ADD CONSTRAINT "music_runtime_status_active_player_id_music_players_id_fk" FOREIGN KEY ("active_player_id") REFERENCES "public"."music_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repago_memas_cuotas" ADD CONSTRAINT "repago_memas_cuotas_repago_id_repago_memas_id_fk" FOREIGN KEY ("repago_id") REFERENCES "public"."repago_memas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios_precios_historial" ADD CONSTRAINT "servicios_precios_historial_creado_por_barberos_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_created_by_barbero_id_barberos_id_fk" FOREIGN KEY ("created_by_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;