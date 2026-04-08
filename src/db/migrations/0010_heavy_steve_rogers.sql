ALTER TABLE "barberos" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "barberos" ADD COLUMN "public_reserva_activa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "barberos" ADD COLUMN "public_reserva_password_hash" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "face_shape" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "style_profile" jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "style_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD COLUMN "corte_nombre" text;--> statement-breakpoint
CREATE UNIQUE INDEX "barberos_public_slug_idx" ON "barberos" USING btree ("public_slug");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_face_shape_check" CHECK ("clients"."face_shape" IN ('oval', 'cuadrado', 'redondo', 'corazon', 'diamante') OR "clients"."face_shape" IS NULL);