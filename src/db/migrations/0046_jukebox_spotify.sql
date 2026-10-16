CREATE TABLE "jukebox_runtime" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'spotify' NOT NULL,
	"synced_at" timestamp with time zone,
	"spotify_snapshot" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jukebox_runtime_source_check" CHECK ("jukebox_runtime"."source" IN ('spotify', 'youtube'))
);
--> statement-breakpoint
ALTER TABLE "jukebox_proposals" ALTER COLUMN "youtube_video_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jukebox_proposals" ADD COLUMN "spotify_track_uri" text;--> statement-breakpoint
ALTER TABLE "jukebox_queue" ADD COLUMN "sent_to_spotify_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "music_provider_connections" ADD COLUMN "account_name" text;