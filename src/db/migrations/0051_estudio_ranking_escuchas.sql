CREATE TABLE "estudio_escuchas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tema_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estudio_temas" ADD COLUMN "orden" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "estudio_escuchas" ADD CONSTRAINT "estudio_escuchas_tema_id_estudio_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."estudio_temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudio_escuchas" ADD CONSTRAINT "estudio_escuchas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estudio_escuchas_tema_id_idx" ON "estudio_escuchas" USING btree ("tema_id");--> statement-breakpoint
-- El ranking arranca igual que la lista que se veía hasta ahora: el más nuevo primero.
UPDATE "estudio_temas" SET "orden" = "puestos"."puesto" FROM (SELECT "id", (row_number() OVER (ORDER BY "created_at" DESC) - 1)::integer AS "puesto" FROM "estudio_temas") AS "puestos" WHERE "estudio_temas"."id" = "puestos"."id";
