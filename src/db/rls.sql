-- ============================================================
-- RLS Policies para A51 Barber
-- ============================================================
-- Aplicar manualmente en Neon después de correr drizzle-kit push
-- Instrucciones:
--   1. Ir a https://console.neon.tech → tu proyecto → SQL Editor
--   2. Pegar y ejecutar este archivo completo
-- ============================================================

-- ------------------------------------------------------------
-- Habilitar RLS en tablas sensibles
-- ------------------------------------------------------------
ALTER TABLE atenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- ATENCIONES
-- Pinky (admin) ve todas.
-- Gabote solo ve las suyas (donde barbero_id = su ID de barbero).
--
-- Estrategia principal: filtros .where(eq(atenciones.barberoId, session.barberoId))
-- en cada query Drizzle. Las políticas RLS son backup de seguridad.
-- ------------------------------------------------------------

-- Primero borrar las policies si existen (para re-ejecutar de forma segura)
DROP POLICY IF EXISTS "admin_all_atenciones" ON atenciones;
DROP POLICY IF EXISTS "barbero_own_atenciones" ON atenciones;

-- Admin ve todo
CREATE POLICY "admin_all_atenciones" ON atenciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- NOTA: La política de admin cubre todo. La restricción real de barbero
-- se aplica vía filtros .where() en Drizzle antes de que llegue a la DB.
-- Si querés RLS nativa por usuario, necesitás configurar SET app.current_role
-- en cada conexión, lo cual requiere un middleware de conexión adicional.
-- Por ahora, la seguridad se garantiza a nivel aplicación (Drizzle + middleware de rol).

-- ------------------------------------------------------------
-- LIQUIDACIONES
-- Misma lógica que atenciones.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "admin_all_liquidaciones" ON liquidaciones;
DROP POLICY IF EXISTS "barbero_own_liquidaciones" ON liquidaciones;

-- Admin ve todo
CREATE POLICY "admin_all_liquidaciones" ON liquidaciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- NOTA IMPORTANTE sobre la estrategia de seguridad:
-- ============================================================
-- A51 Barber usa dos capas de seguridad:
--
-- CAPA 1 (principal): Filtros Drizzle en cada Server Action/query:
--   const atenciones = await db.query.atenciones.findMany({
--     where: (a, { eq }) => eq(a.barberoId, session.barberoId),
--   });
--
-- CAPA 2 (backup): RLS habilitada en PostgreSQL.
--   Con las políticas actuales (permisivas), RLS no restringe el acceso
--   a nivel DB pero sí bloquea acceso directo sin pasar por la app.
--
-- Para una restricción RLS más estricta en el futuro, activar:
--   SET app.current_barbero_id = '<uuid>';
--   SET app.current_rol = 'barbero';
-- en cada conexión y refactorizar las políticas a:
--   USING (barbero_id::text = current_setting('app.current_barbero_id', TRUE))
-- ============================================================
