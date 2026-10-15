CREATE TABLE "torneo_cambios_equipo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"torneo_id" uuid NOT NULL,
	"jugador_id" uuid NOT NULL,
	"equipo_anterior_id" uuid,
	"equipo_nuevo_id" uuid,
	"tipo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "torneos" ADD COLUMN "ventana_premium" text;--> statement-breakpoint
ALTER TABLE "torneo_cambios_equipo" ADD CONSTRAINT "torneo_cambios_equipo_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_cambios_equipo" ADD CONSTRAINT "torneo_cambios_equipo_jugador_id_torneo_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."torneo_jugadores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_cambios_equipo" ADD CONSTRAINT "torneo_cambios_equipo_equipo_anterior_id_torneo_equipos_id_fk" FOREIGN KEY ("equipo_anterior_id") REFERENCES "public"."torneo_equipos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_cambios_equipo" ADD CONSTRAINT "torneo_cambios_equipo_equipo_nuevo_id_torneo_equipos_id_fk" FOREIGN KEY ("equipo_nuevo_id") REFERENCES "public"."torneo_equipos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "torneo_cambios_equipo_torneo_idx" ON "torneo_cambios_equipo" USING btree ("torneo_id","created_at");