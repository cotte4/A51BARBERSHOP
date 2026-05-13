-- Verification queries — run BEFORE applying migration 0024_db-arch-unique
-- Each query should return 0 rows. If any return rows, resolve duplicates first.

-- 1. Duplicate liquidaciones per barber + period
SELECT barbero_id, periodo_inicio, periodo_fin, COUNT(*) AS cnt
FROM liquidaciones
GROUP BY barbero_id, periodo_inicio, periodo_fin
HAVING COUNT(*) > 1;

-- 2. Duplicate cuota numbers per repago
SELECT repago_id, numero_cuota, COUNT(*) AS cnt
FROM repago_memas_cuotas
GROUP BY repago_id, numero_cuota
HAVING COUNT(*) > 1;

-- 3. Duplicate medios_pago names
SELECT nombre, COUNT(*) AS cnt
FROM medios_pago
GROUP BY nombre
HAVING COUNT(*) > 1;

-- 4. Duplicate servicios names
SELECT nombre, COUNT(*) AS cnt
FROM servicios
GROUP BY nombre
HAVING COUNT(*) > 1;

-- 5. Duplicate client_briefing_cache entries per (client, scope, barbero)
SELECT client_id, viewer_scope, viewer_barbero_id, COUNT(*) AS cnt
FROM client_briefing_cache
GROUP BY client_id, viewer_scope, viewer_barbero_id
HAVING COUNT(*) > 1;

-- 6. liquidaciones rows with NULL periodo_inicio or periodo_fin (would block SET NOT NULL)
SELECT id, barbero_id, periodo_inicio, periodo_fin
FROM liquidaciones
WHERE periodo_inicio IS NULL OR periodo_fin IS NULL;

-- 7. repago_memas_cuotas rows with NULL numero_cuota or repago_id
SELECT id
FROM repago_memas_cuotas
WHERE numero_cuota IS NULL OR repago_id IS NULL;

-- 8. medios_pago rows with NULL nombre
SELECT id
FROM medios_pago
WHERE nombre IS NULL;
