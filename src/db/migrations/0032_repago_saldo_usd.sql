-- saldo_pendiente cambió de semántica: ARS (legacy, seed viejo) → USD (repago-service).
-- Corrige filas legacy: cualquier saldo mayor a la deuda en USD es un valor ARS viejo.
UPDATE "repago_memas"
SET "saldo_pendiente" = "deuda_usd"
WHERE "saldo_pendiente" > "deuda_usd"
  AND "cuotas_pagadas" = 0;
