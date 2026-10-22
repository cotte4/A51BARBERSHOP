CREATE TABLE "estudio_temas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"genero" text,
	"audio_pathname" text NOT NULL,
	"audio_bytes" integer NOT NULL,
	"duracion_seg" integer,
	"portada_pathname" text,
	"subido_por" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estudio_temas_audio_pathname_unique" UNIQUE("audio_pathname")
);
--> statement-breakpoint
ALTER TABLE "estudio_temas" ADD CONSTRAINT "estudio_temas_subido_por_user_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;