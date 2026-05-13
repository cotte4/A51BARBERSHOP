ALTER TABLE "music_auto_resume_state" DROP CONSTRAINT "music_auto_resume_state_resume_mode_check";--> statement-breakpoint
ALTER TABLE "turnos_disponibilidad" DROP CONSTRAINT "turnos_disponibilidad_duracion_minutos_check";--> statement-breakpoint
ALTER TABLE "atenciones" ALTER COLUMN "hora" SET DATA TYPE time;--> statement-breakpoint
ALTER TABLE "music_auto_resume_state" ADD CONSTRAINT "music_auto_resume_state_resume_mode_check" CHECK ("music_auto_resume_state"."resume_mode" IN ('auto','dj','jam'));--> statement-breakpoint
ALTER TABLE "turnos_disponibilidad" ADD CONSTRAINT "turnos_disponibilidad_duracion_minutos_check" CHECK ("turnos_disponibilidad"."duracion_minutos" IN (30, 45, 60));