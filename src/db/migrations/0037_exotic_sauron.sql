ALTER TABLE "repago_memas_cuotas" ADD COLUMN "moneda_ingresada" text DEFAULT 'ARS' NOT NULL;--> statement-breakpoint
ALTER TABLE "repago_memas_cuotas" ADD COLUMN "monto_ingresado" numeric(12, 2);