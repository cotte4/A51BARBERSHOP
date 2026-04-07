ALTER TABLE "clients" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_email_idx" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");