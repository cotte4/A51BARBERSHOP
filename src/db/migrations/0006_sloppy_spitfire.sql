CREATE TABLE "music_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_mode_state" (
	"id" text PRIMARY KEY NOT NULL,
	"active_mode" text DEFAULT 'auto' NOT NULL,
	"manual_owner_barbero_id" uuid,
	"manual_owner_user_id" text,
	"pending_context_ref" text,
	"pending_context_label" text,
	"jam_enabled" boolean DEFAULT false NOT NULL,
	"auto_enabled" boolean DEFAULT true NOT NULL,
	"runtime_state" text DEFAULT 'offline' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" text,
	CONSTRAINT "music_mode_state_active_mode_check" CHECK ("music_mode_state"."active_mode" IN ('auto', 'dj', 'jam')),
	CONSTRAINT "music_mode_state_runtime_state_check" CHECK ("music_mode_state"."runtime_state" IN ('ready', 'degraded', 'offline'))
);
--> statement-breakpoint
CREATE TABLE "music_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_player_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'missing' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_expected_local_player" boolean DEFAULT false NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_players_status_check" CHECK ("music_players"."status" IN ('ready', 'missing', 'error'))
);
--> statement-breakpoint
CREATE TABLE "music_provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"last_error" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_provider_connections_status_check" CHECK ("music_provider_connections"."status" IN ('connected', 'disconnected', 'error'))
);
--> statement-breakpoint
CREATE TABLE "music_queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"owner_barbero_id" uuid,
	"provider_track_ref" text NOT NULL,
	"display_title" text NOT NULL,
	"display_artist" text,
	"state" text DEFAULT 'queued' NOT NULL,
	"position_hint" integer DEFAULT 0 NOT NULL,
	"requires_player" boolean DEFAULT true NOT NULL,
	"dispatched_at" timestamp with time zone,
	"played_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_queue_items_source_type_check" CHECK ("music_queue_items"."source_type" IN ('dj', 'jam', 'system')),
	CONSTRAINT "music_queue_items_state_check" CHECK ("music_queue_items"."state" IN ('queued', 'dispatched', 'played', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "music_queue_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_by_user_id" text,
	CONSTRAINT "music_queue_sessions_mode_check" CHECK ("music_queue_sessions"."mode" IN ('dj', 'jam')),
	CONSTRAINT "music_queue_sessions_status_check" CHECK ("music_queue_sessions"."status" IN ('active', 'ended'))
);
--> statement-breakpoint
CREATE TABLE "music_runtime_status" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_status" text DEFAULT 'disconnected' NOT NULL,
	"player_status" text DEFAULT 'missing' NOT NULL,
	"active_player_id" uuid,
	"last_player_seen_at" timestamp with time zone,
	"last_playback_attempt_at" timestamp with time zone,
	"last_playback_success_at" timestamp with time zone,
	"last_error" text,
	"degraded_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_runtime_status_provider_status_check" CHECK ("music_runtime_status"."provider_status" IN ('connected', 'disconnected', 'error')),
	CONSTRAINT "music_runtime_status_player_status_check" CHECK ("music_runtime_status"."player_status" IN ('ready', 'missing', 'error'))
);
--> statement-breakpoint
CREATE TABLE "music_schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_mask" text[] DEFAULT '{}'::text[] NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"provider_playlist_ref" text NOT NULL,
	"label" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_mode_state" ADD CONSTRAINT "music_mode_state_manual_owner_barbero_id_barberos_id_fk" FOREIGN KEY ("manual_owner_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_mode_state" ADD CONSTRAINT "music_mode_state_manual_owner_user_id_user_id_fk" FOREIGN KEY ("manual_owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_mode_state" ADD CONSTRAINT "music_mode_state_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_queue_items" ADD CONSTRAINT "music_queue_items_session_id_music_queue_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."music_queue_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_queue_items" ADD CONSTRAINT "music_queue_items_owner_barbero_id_barberos_id_fk" FOREIGN KEY ("owner_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_queue_sessions" ADD CONSTRAINT "music_queue_sessions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_runtime_status" ADD CONSTRAINT "music_runtime_status_active_player_id_music_players_id_fk" FOREIGN KEY ("active_player_id") REFERENCES "public"."music_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "music_events_type_created_idx" ON "music_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "music_players_provider_player_id_idx" ON "music_players" USING btree ("provider","provider_player_id");--> statement-breakpoint
CREATE INDEX "music_players_expected_idx" ON "music_players" USING btree ("is_expected_local_player");--> statement-breakpoint
CREATE INDEX "music_provider_connections_provider_idx" ON "music_provider_connections" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "music_queue_items_session_position_idx" ON "music_queue_items" USING btree ("session_id","position_hint");--> statement-breakpoint
CREATE INDEX "music_queue_items_owner_idx" ON "music_queue_items" USING btree ("owner_barbero_id");--> statement-breakpoint
CREATE INDEX "music_schedule_rules_enabled_idx" ON "music_schedule_rules" USING btree ("enabled","priority");