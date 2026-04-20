# /hoy — Auditoria de CTAs por rol

**Estado:** PENDIENTE
**Origen:** `docs/qa/cta-navigation-audit.md` v1.2 (decision #5)
**Fecha creacion:** 07/04/2026

## Por que existe este doc

En `/hoy` varios CTAs cambian segun el rol activo (barbero vs owner) y nunca se documentaron. Antes de renombrar nada en `/hoy` necesitamos saber quien ve que, para no romper flujos de un rol al ajustar copys del otro.

## Que hay que hacer

1. Leer con cada rol activo:
   - `a51-barber/src/app/(barbero)/hoy/page.tsx`
   - `a51-barber/src/components/hoy/HoyActionStrip.tsx`
   - cualquier otro componente embebido en `/hoy`
2. Para cada CTA / boton / link, completar:
   - copy actual
   - accion real (navega / expande / toggle)
   - rol que lo ve (barbero, owner, ambos)
   - data que carga (propia vs global)
3. Marcar inconsistencias:
   - copys iguales que hacen cosas distintas segun rol
   - CTAs que un rol no deberia ver
   - data global expuesta a barberos por error

## Inventario (a completar)

| CTA | Componente | Linea | Rol que lo ve | Accion real | Notas |
|---|---|---|---|---|---|
| _pendiente_ | | | | | |

## Salida esperada

- Tabla completa arriba.
- Lista de bugs/inconsistencias encontradas.
- Recomendaciones de copy diferenciado por rol (si aplica).
- Update a `cta-navigation-audit.md` con los hallazgos relevantes.
