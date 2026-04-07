CREATE TABLE "music_auto_resume_state" (
	"id" text PRIMARY KEY NOT NULL,
	"resume_mode" text DEFAULT 'auto' NOT NULL,
	"resume_context_ref" text,
	"resume_context_label" text,
	"interruption_source" text,
	"interruption_track_ref" text,
	"resume_pending" boolean DEFAULT false NOT NULL,
	"interrupted_at" timestamp with time zone,
	"resumed_at" timestamp with time zone,
	"resume_attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_auto_resume_state_resume_mode_check" CHECK ("music_auto_resume_state"."resume_mode" IN ('auto'))
);
--> statement-breakpoint
CREATE INDEX "music_auto_resume_state_pending_idx" ON "music_auto_resume_state" USING btree ("resume_pending","updated_at");