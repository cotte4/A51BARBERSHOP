CREATE TABLE "internal_support_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intake_type" text NOT NULL,
	"title" text NOT NULL,
	"problem" text NOT NULL,
	"proposal" text,
	"impact" text,
	"urgency" text DEFAULT 'media' NOT NULL,
	"pathname" text NOT NULL,
	"reporter_role" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internal_support_intakes_type_check" CHECK ("internal_support_intakes"."intake_type" IN ('feature_request','implementation_idea')),
	CONSTRAINT "internal_support_intakes_urgency_check" CHECK ("internal_support_intakes"."urgency" IN ('baja','media','alta','critica'))
);
--> statement-breakpoint
CREATE INDEX "internal_support_intakes_type_created_idx" ON "internal_support_intakes" USING btree ("intake_type","created_at");