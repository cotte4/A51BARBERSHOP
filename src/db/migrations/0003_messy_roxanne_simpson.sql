ALTER TABLE "atenciones" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "atenciones_productos" ADD COLUMN "es_marciano_incluido" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "es_consumicion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "atenciones_client_id_idx" ON "atenciones" USING btree ("client_id");