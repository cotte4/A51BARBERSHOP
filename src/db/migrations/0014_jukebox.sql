CREATE TABLE "jukebox_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"youtube_video_id" text NOT NULL,
	"video_title" text NOT NULL,
	"channel_title" text NOT NULL,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"proposed_by_name" text NOT NULL,
	"device_key_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"auto_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jukebox_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"position_hint" integer NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ADD COLUMN "jukebox_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ADD COLUMN "jukebox_auto_approve" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jukebox_queue" ADD CONSTRAINT "jukebox_queue_proposal_id_jukebox_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."jukebox_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jukebox_proposals_status_idx" ON "jukebox_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jukebox_proposals_created_at_idx" ON "jukebox_proposals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "jukebox_proposals_device_idx" ON "jukebox_proposals" USING btree ("device_key_hash","created_at");--> statement-breakpoint
CREATE INDEX "jukebox_queue_state_idx" ON "jukebox_queue" USING btree ("state");--> statement-breakpoint
CREATE INDEX "jukebox_queue_position_idx" ON "jukebox_queue" USING btree ("position_hint");