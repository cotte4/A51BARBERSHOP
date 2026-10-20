CREATE TABLE "barbero_dia_especial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid,
	"fecha" date NOT NULL,
	"cerrado" boolean DEFAULT false NOT NULL,
	"desde" time,
	"hasta" time,
	"nota" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barbero_dia_especial_rango_check" CHECK ("barbero_dia_especial"."cerrado" OR ("barbero_dia_especial"."desde" IS NOT NULL AND "barbero_dia_especial"."hasta" IS NOT NULL AND "barbero_dia_especial"."hasta" > "barbero_dia_especial"."desde"))
);
--> statement-breakpoint
CREATE TABLE "barbero_horario_semanal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbero_id" uuid NOT NULL,
	"dia_semana" integer NOT NULL,
	"desde" time NOT NULL,
	"hasta" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barbero_horario_semanal_dia_check" CHECK ("barbero_horario_semanal"."dia_semana" BETWEEN 0 AND 6),
	CONSTRAINT "barbero_horario_semanal_rango_check" CHECK ("barbero_horario_semanal"."hasta" > "barbero_horario_semanal"."desde")
);
--> statement-breakpoint
ALTER TABLE "barbero_dia_especial" ADD CONSTRAINT "barbero_dia_especial_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barbero_dia_especial" ADD CONSTRAINT "barbero_dia_especial_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barbero_horario_semanal" ADD CONSTRAINT "barbero_horario_semanal_barbero_id_barberos_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."barberos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "barbero_dia_especial_fecha_idx" ON "barbero_dia_especial" USING btree ("fecha","barbero_id");--> statement-breakpoint
CREATE INDEX "barbero_horario_semanal_barbero_idx" ON "barbero_horario_semanal" USING btree ("barbero_id","dia_semana");--> statement-breakpoint
-- Horario real de Pinky (Was, 2026-10-20): martes a sábado de 10 a 19. En una base sin Pinky no inserta nada.
INSERT INTO "barbero_horario_semanal" ("barbero_id", "dia_semana", "desde", "hasta")
SELECT b."id", d.dia, '10:00', '19:00'
FROM "barberos" b CROSS JOIN (VALUES (2), (3), (4), (5), (6)) AS d(dia)
WHERE b."public_slug" = 'pinky'
  AND NOT EXISTS (SELECT 1 FROM "barbero_horario_semanal" h WHERE h."barbero_id" = b."id");
