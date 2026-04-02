ALTER TABLE "turnos" DROP CONSTRAINT "turnos_duracion_minutos_check";--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "duracion_minutos" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN "servicio_id" uuid;--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN "precio_esperado" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_duracion_minutos_check" CHECK ("servicios"."duracion_minutos" IN (30, 45, 60));--> statement-breakpoint
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_duracion_minutos_check" CHECK ("turnos"."duracion_minutos" IN (30, 45, 60));