ALTER TABLE "costos_fijos_valores" ADD CONSTRAINT "costos_fijos_valores_mes_format" CHECK ("costos_fijos_valores"."mes" ~ '^\d{4}-\d{2}$');--> statement-breakpoint
ALTER TABLE "marciano_beneficios_uso" ADD CONSTRAINT "marciano_beneficios_uso_mes_format" CHECK ("marciano_beneficios_uso"."mes" ~ '^\d{4}-\d{2}$');--> statement-breakpoint
ALTER TABLE "music_auto_resume_state" ADD CONSTRAINT "music_auto_resume_state_singleton" CHECK ("music_auto_resume_state"."id" = 'singleton');--> statement-breakpoint
ALTER TABLE "music_mode_state" ADD CONSTRAINT "music_mode_state_singleton" CHECK ("music_mode_state"."id" = 'singleton');--> statement-breakpoint
ALTER TABLE "music_runtime_status" ADD CONSTRAINT "music_runtime_status_singleton" CHECK ("music_runtime_status"."id" = 'singleton');