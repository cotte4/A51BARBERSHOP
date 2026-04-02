CREATE TABLE "pantalla_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turno_id" uuid NOT NULL,
	"cancion" text NOT NULL,
	"cliente_nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pantalla_events" ADD CONSTRAINT "pantalla_events_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pantalla_events_created_at_idx" ON "pantalla_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pantalla_events_turno_id_idx" ON "pantalla_events" USING btree ("turno_id");