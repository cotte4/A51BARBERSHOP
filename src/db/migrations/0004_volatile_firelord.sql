CREATE TABLE "pantalla_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"device_key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pantalla_votes" ADD CONSTRAINT "pantalla_votes_event_id_pantalla_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."pantalla_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pantalla_votes_event_id_idx" ON "pantalla_votes" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pantalla_votes_event_device_key_idx" ON "pantalla_votes" USING btree ("event_id","device_key_hash");