CREATE TABLE "ovnis_balance" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"pending_balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ovnis_balance_non_negative" CHECK ("ovnis_balance"."balance" >= 0 AND "ovnis_balance"."pending_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ovnis_bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"challenger_id" uuid NOT NULL,
	"opponent_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"challenger_claim" text,
	"opponent_claim" text,
	"claim_attempts" integer DEFAULT 0 NOT NULL,
	"accepted_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acceptance_expires_at" timestamp with time zone NOT NULL,
	"play_expires_at" timestamp with time zone,
	CONSTRAINT "ovnis_bets_status_check" CHECK ("ovnis_bets"."status" IN ('pending','accepted','disputed','challenger_won','opponent_won','refunded','cancelled','both_lost','stale_burned')),
	CONSTRAINT "ovnis_bets_claim_check" CHECK ("ovnis_bets"."challenger_claim" IS NULL OR "ovnis_bets"."challenger_claim" IN ('won','lost','forfeit')),
	CONSTRAINT "ovnis_bets_opp_claim_check" CHECK ("ovnis_bets"."opponent_claim" IS NULL OR "ovnis_bets"."opponent_claim" IN ('won','lost','forfeit')),
	CONSTRAINT "ovnis_bets_claim_attempts_max" CHECK ("ovnis_bets"."claim_attempts" >= 0 AND "ovnis_bets"."claim_attempts" <= 3),
	CONSTRAINT "ovnis_bets_amount_positive" CHECK ("ovnis_bets"."amount" > 0),
	CONSTRAINT "ovnis_bets_distinct_players" CHECK ("ovnis_bets"."challenger_id" <> "ovnis_bets"."opponent_id")
);
--> statement-breakpoint
CREATE TABLE "ovnis_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"type" text NOT NULL,
	"external_url" text,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ovnis_games_type_check" CHECK ("ovnis_games"."type" IN ('physical','digital'))
);
--> statement-breakpoint
CREATE TABLE "ovnis_pending_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"atencion_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ovnis_pending_credits_amount_positive" CHECK ("ovnis_pending_credits"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "ovnis_redemption_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"cost_ovnis" integer NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"producto_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"stock" integer,
	CONSTRAINT "ovnis_redemption_items_type_check" CHECK ("ovnis_redemption_items"."type" IN ('consumicion','descuento_pct','descuento_fijo','producto')),
	CONSTRAINT "ovnis_redemption_items_cost_positive" CHECK ("ovnis_redemption_items"."cost_ovnis" > 0),
	CONSTRAINT "ovnis_redemption_items_stock_nonneg" CHECK ("ovnis_redemption_items"."stock" IS NULL OR "ovnis_redemption_items"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ovnis_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"cost_ovnis" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"delivered_by_barbero_id" uuid,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_user_id" text,
	"cancel_reason" text,
	"notas" text,
	CONSTRAINT "ovnis_redemptions_status_check" CHECK ("ovnis_redemptions"."status" IN ('pending','delivered','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "ovnis_ruleta_prizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"ovnis_amount" integer DEFAULT 0 NOT NULL,
	"redemption_item_id" uuid,
	"weight" integer DEFAULT 1 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ovnis_ruleta_prizes_type_check" CHECK ("ovnis_ruleta_prizes"."type" IN ('ovnis','redemption_item','nada')),
	CONSTRAINT "ovnis_ruleta_prizes_weight_positive" CHECK ("ovnis_ruleta_prizes"."weight" > 0),
	CONSTRAINT "ovnis_ruleta_prizes_type_consistency" CHECK (("ovnis_ruleta_prizes"."type" = 'ovnis' AND "ovnis_ruleta_prizes"."ovnis_amount" > 0 AND "ovnis_ruleta_prizes"."redemption_item_id" IS NULL) OR
          ("ovnis_ruleta_prizes"."type" = 'redemption_item' AND "ovnis_ruleta_prizes"."redemption_item_id" IS NOT NULL) OR
          ("ovnis_ruleta_prizes"."type" = 'nada'))
);
--> statement-breakpoint
CREATE TABLE "ovnis_ruleta_spins" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"prize_id" uuid NOT NULL,
	"spun_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ovnis_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"related_client_id" uuid,
	"related_atencion_id" uuid,
	"related_bet_id" uuid,
	"related_redemption_id" uuid,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ovnis_transactions_type_check" CHECK ("ovnis_transactions"."type" IN ('welcome','atencion','ruleta','redemption','redemption_refund','donation_sent','donation_received','bet_lock','bet_unlock','bet_win','bet_refund','bet_burn','admin_adjust')),
	CONSTRAINT "ovnis_transactions_amount_nonzero" CHECK ("ovnis_transactions"."amount" <> 0)
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "public_card_slug" text;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "ovnis_value" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "ovnis_value" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ovnis_balance" ADD CONSTRAINT "ovnis_balance_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_bets" ADD CONSTRAINT "ovnis_bets_game_id_ovnis_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."ovnis_games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_bets" ADD CONSTRAINT "ovnis_bets_challenger_id_clients_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_bets" ADD CONSTRAINT "ovnis_bets_opponent_id_clients_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_bets" ADD CONSTRAINT "ovnis_bets_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_pending_credits" ADD CONSTRAINT "ovnis_pending_credits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_pending_credits" ADD CONSTRAINT "ovnis_pending_credits_atencion_id_atenciones_id_fk" FOREIGN KEY ("atencion_id") REFERENCES "public"."atenciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_redemption_items" ADD CONSTRAINT "ovnis_redemption_items_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_redemptions" ADD CONSTRAINT "ovnis_redemptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_redemptions" ADD CONSTRAINT "ovnis_redemptions_item_id_ovnis_redemption_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."ovnis_redemption_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_redemptions" ADD CONSTRAINT "ovnis_redemptions_delivered_by_barbero_id_barberos_id_fk" FOREIGN KEY ("delivered_by_barbero_id") REFERENCES "public"."barberos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_redemptions" ADD CONSTRAINT "ovnis_redemptions_cancelled_by_user_id_user_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_ruleta_prizes" ADD CONSTRAINT "ovnis_ruleta_prizes_redemption_item_id_ovnis_redemption_items_id_fk" FOREIGN KEY ("redemption_item_id") REFERENCES "public"."ovnis_redemption_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_ruleta_spins" ADD CONSTRAINT "ovnis_ruleta_spins_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_ruleta_spins" ADD CONSTRAINT "ovnis_ruleta_spins_prize_id_ovnis_ruleta_prizes_id_fk" FOREIGN KEY ("prize_id") REFERENCES "public"."ovnis_ruleta_prizes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_transactions" ADD CONSTRAINT "ovnis_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_transactions" ADD CONSTRAINT "ovnis_transactions_related_client_id_clients_id_fk" FOREIGN KEY ("related_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ovnis_transactions" ADD CONSTRAINT "ovnis_transactions_related_atencion_id_atenciones_id_fk" FOREIGN KEY ("related_atencion_id") REFERENCES "public"."atenciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ovnis_bets_status_idx" ON "ovnis_bets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ovnis_bets_challenger_idx" ON "ovnis_bets" USING btree ("challenger_id");--> statement-breakpoint
CREATE INDEX "ovnis_bets_opponent_idx" ON "ovnis_bets" USING btree ("opponent_id");--> statement-breakpoint
CREATE INDEX "ovnis_bets_acceptance_expiry_idx" ON "ovnis_bets" USING btree ("acceptance_expires_at");--> statement-breakpoint
CREATE INDEX "ovnis_bets_play_expiry_idx" ON "ovnis_bets" USING btree ("play_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ovnis_pending_credits_atencion_id_idx" ON "ovnis_pending_credits" USING btree ("atencion_id");--> statement-breakpoint
CREATE INDEX "ovnis_pending_credits_client_unredeemed_idx" ON "ovnis_pending_credits" USING btree ("client_id","redeemed_at");--> statement-breakpoint
CREATE INDEX "ovnis_redemptions_client_id_idx" ON "ovnis_redemptions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "ovnis_redemptions_status_idx" ON "ovnis_redemptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ovnis_transactions_idempotency_key_idx" ON "ovnis_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ovnis_transactions_client_id_idx" ON "ovnis_transactions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "ovnis_transactions_created_at_idx" ON "ovnis_transactions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_public_card_slug_unique" UNIQUE("public_card_slug");