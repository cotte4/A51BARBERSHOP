-- Completa lo que 0020 y 0021 nunca crearon en producción.
-- Las dos figuran como aplicadas en drizzle.__drizzle_migrations, pero el SQL no corrió: 0020 vuelve
-- a agregar productos_nombre_unique (ya creada por 0019), así que no podía correr entera, y alguien
-- marcó ambas como hechas. Faltaban 6 tablas (por eso /clientes de la dueña daba error) y el estado
-- 'rejected' de ovnis_bets (rechazar una apuesta violaba el check).
-- Todo es idempotente: en una base que sí tiene 0020/0021 (un clone nuevo) no cambia nada.
CREATE TABLE IF NOT EXISTS "go_live_readiness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text DEFAULT 'default' NOT NULL,
	"checklist_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signed_off_at" timestamp with time zone,
	"signed_off_by_user_id" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "internal_bug_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"summary" text NOT NULL,
	"expected_behavior" text NOT NULL,
	"actual_behavior" text NOT NULL,
	"pathname" text NOT NULL,
	"action_name" text,
	"reporter_role" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"client_version" text,
	"session_hash" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internal_bug_reports_status_check" CHECK ("internal_bug_reports"."status" IN ('new','triaged','fixed','verified','closed')),
	CONSTRAINT "internal_bug_reports_severity_check" CHECK ("internal_bug_reports"."severity" IN ('low','medium','high','critical'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "internal_bug_delivery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bug_report_id" uuid NOT NULL,
	"destination" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"response_code" integer,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internal_bug_delivery_events_status_check" CHECK ("internal_bug_delivery_events"."status" IN ('queued','sent','failed','skipped'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retention_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"notes" text,
	"last_managed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_followups_status_check" CHECK ("retention_followups"."status" IN ('pendiente','contactado','reagendado'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turno_notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turno_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"target_email" text,
	"provider_status" text DEFAULT 'queued' NOT NULL,
	"provider_message" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "turno_notification_events_event_type_check" CHECK ("turno_notification_events"."event_type" IN ('turno_confirmado','turno_cancelado')),
	CONSTRAINT "turno_notification_events_provider_status_check" CHECK ("turno_notification_events"."provider_status" IN ('queued','sent','skipped','failed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "internal_support_intakes" (
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
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_bug_delivery_events_bug_report_id_internal_bug_reports_id_fk') THEN
		ALTER TABLE "internal_bug_delivery_events" ADD CONSTRAINT "internal_bug_delivery_events_bug_report_id_internal_bug_reports_id_fk" FOREIGN KEY ("bug_report_id") REFERENCES "public"."internal_bug_reports"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retention_followups_client_id_clients_id_fk') THEN
		ALTER TABLE "retention_followups" ADD CONSTRAINT "retention_followups_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'turno_notification_events_turno_id_turnos_id_fk') THEN
		ALTER TABLE "turno_notification_events" ADD CONSTRAINT "turno_notification_events_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "go_live_readiness_scope_idx" ON "go_live_readiness" USING btree ("scope");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_bug_delivery_events_bug_created_idx" ON "internal_bug_delivery_events" USING btree ("bug_report_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_bug_reports_status_idx" ON "internal_bug_reports" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_bug_reports_path_idx" ON "internal_bug_reports" USING btree ("pathname");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "retention_followups_client_id_idx" ON "retention_followups" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retention_followups_status_last_managed_idx" ON "retention_followups" USING btree ("status","last_managed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "turno_notification_events_turno_created_idx" ON "turno_notification_events" USING btree ("turno_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_support_intakes_type_created_idx" ON "internal_support_intakes" USING btree ("intake_type","created_at");
--> statement-breakpoint
ALTER TABLE "ovnis_bets" DROP CONSTRAINT IF EXISTS "ovnis_bets_status_check";
--> statement-breakpoint
ALTER TABLE "ovnis_bets" ADD CONSTRAINT "ovnis_bets_status_check" CHECK ("ovnis_bets"."status" IN ('pending','accepted','disputed','challenger_won','opponent_won','refunded','cancelled','rejected','both_lost','stale_burned'));
