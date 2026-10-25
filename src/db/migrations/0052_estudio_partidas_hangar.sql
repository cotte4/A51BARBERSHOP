CREATE TABLE "estudio_hangar" (
	"user_id" text PRIMARY KEY NOT NULL,
	"modelo" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estudio_partidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tema_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"puntos" integer NOT NULL,
	"modelo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estudio_partidas_puntos_check" CHECK ("estudio_partidas"."puntos" >= 0)
);
--> statement-breakpoint
ALTER TABLE "estudio_hangar" ADD CONSTRAINT "estudio_hangar_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudio_partidas" ADD CONSTRAINT "estudio_partidas_tema_id_estudio_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."estudio_temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudio_partidas" ADD CONSTRAINT "estudio_partidas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estudio_partidas_tema_user_idx" ON "estudio_partidas" USING btree ("tema_id","user_id");