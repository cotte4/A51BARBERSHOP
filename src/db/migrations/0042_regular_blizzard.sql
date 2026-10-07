CREATE TABLE "torneo_equipos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"torneo_id" uuid NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "torneo_jugadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"torneo_id" uuid NOT NULL,
	"client_id" uuid,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text NOT NULL,
	"consentimiento" boolean DEFAULT false NOT NULL,
	"estado_pago" text DEFAULT 'pendiente' NOT NULL,
	"pagado_en" timestamp with time zone,
	"orden_pago" integer,
	"equipo_id" uuid,
	"posicion_sorteo" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "torneo_partidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"torneo_id" uuid NOT NULL,
	"ronda" integer NOT NULL,
	"posicion" integer NOT NULL,
	"jugador_a_id" uuid,
	"jugador_b_id" uuid,
	"ganador_id" uuid,
	"marcador_a" integer,
	"marcador_b" integer,
	"es_bye" boolean DEFAULT false NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "torneos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"fecha" timestamp with time zone,
	"cuota_ars" numeric(12, 2) DEFAULT '4200' NOT NULL,
	"cupo" integer DEFAULT 16 NOT NULL,
	"estado" text DEFAULT 'inscripcion' NOT NULL,
	"premios_texto" text,
	"reveal_paso" integer DEFAULT 0 NOT NULL,
	"sorteo_semilla" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "torneo_equipos" ADD CONSTRAINT "torneo_equipos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_jugadores" ADD CONSTRAINT "torneo_jugadores_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_jugadores" ADD CONSTRAINT "torneo_jugadores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_jugadores" ADD CONSTRAINT "torneo_jugadores_equipo_id_torneo_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."torneo_equipos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_partidos" ADD CONSTRAINT "torneo_partidos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_partidos" ADD CONSTRAINT "torneo_partidos_jugador_a_id_torneo_jugadores_id_fk" FOREIGN KEY ("jugador_a_id") REFERENCES "public"."torneo_jugadores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_partidos" ADD CONSTRAINT "torneo_partidos_jugador_b_id_torneo_jugadores_id_fk" FOREIGN KEY ("jugador_b_id") REFERENCES "public"."torneo_jugadores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_partidos" ADD CONSTRAINT "torneo_partidos_ganador_id_torneo_jugadores_id_fk" FOREIGN KEY ("ganador_id") REFERENCES "public"."torneo_jugadores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "torneo_equipos_nombre_idx" ON "torneo_equipos" USING btree ("torneo_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "torneo_jugadores_email_idx" ON "torneo_jugadores" USING btree ("torneo_id","email");--> statement-breakpoint
CREATE INDEX "torneo_jugadores_pago_idx" ON "torneo_jugadores" USING btree ("torneo_id","estado_pago","orden_pago");--> statement-breakpoint
CREATE UNIQUE INDEX "torneo_partidos_slot_idx" ON "torneo_partidos" USING btree ("torneo_id","ronda","posicion");