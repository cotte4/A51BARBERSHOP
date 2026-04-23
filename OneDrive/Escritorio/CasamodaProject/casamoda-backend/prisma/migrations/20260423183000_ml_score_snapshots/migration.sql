CREATE TABLE "ml_score_snapshots" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "horizonDays" INTEGER NOT NULL DEFAULT 14,
  "forecastDemand" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "mlScore" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "confidence" DECIMAL(5,4),
  "modelVersion" TEXT NOT NULL DEFAULT 'v0',
  "featureVersion" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ml_score_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ml_score_snapshots_productId_storeId_horizonDays_modelVersion_key"
ON "ml_score_snapshots"("productId", "storeId", "horizonDays", "modelVersion");

CREATE INDEX "ml_score_snapshots_storeId_horizonDays_idx"
ON "ml_score_snapshots"("storeId", "horizonDays");

CREATE INDEX "ml_score_snapshots_productId_horizonDays_idx"
ON "ml_score_snapshots"("productId", "horizonDays");

CREATE INDEX "ml_score_snapshots_createdAt_idx"
ON "ml_score_snapshots"("createdAt");

ALTER TABLE "ml_score_snapshots"
ADD CONSTRAINT "ml_score_snapshots_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ml_score_snapshots"
ADD CONSTRAINT "ml_score_snapshots_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
