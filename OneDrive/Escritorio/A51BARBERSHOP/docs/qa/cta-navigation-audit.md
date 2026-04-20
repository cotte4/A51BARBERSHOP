# CTA + Navigation Audit

**Version:** v1.3
**Fecha:** 07/04/2026
**Estado:** IMPLEMENTADO — todas las prioridades completadas.
**Objetivo:** simplificar CTAs, botones y nombres de acceso para que la app se entienda mas rapido sin perder identidad.

## Regla general

Hoy hay tres tipos de accion mezclados bajo copys parecidos:

- navegar a otra pantalla
- expandir algo en la misma pantalla
- cambiar de modo o vista dentro del mismo modulo

La propuesta es usar verbos distintos para cada caso:

- **Ir a** = navega a otra pantalla (operativo)
- **Ver** = lectura (reportes, fichas, liquidaciones)
- **Mostrar / Ocultar / Expandir** = despliega en la misma pantalla
- **Vista simple / Vista separada / Vista resumida** = cambia modo

Regla de oro: si el CTA no cambia de URL, no puede empezar con "Ir a".

## CTAs — estado final

| Superficie | CTA anterior | CTA nuevo | Estado |
|---|---|---|---|
| `/` | `Abrir reserva publica` | `Reservar turno` | ✅ |
| `/` | `Clientes Marcianos` | `Portal Marciano` | ✅ |
| `/` | `Entrar a la base` | `Ingreso staff` | ✅ |
| `/login` | `Entrar a la base` | `Ingreso staff` | ✅ |
| `/hoy` | `Abrir comandos → #comandos` | CTA eliminado · HoyActionStrip subido al tope | ✅ |
| `/hoy` | `Abrir caja` (focus card) | `Ir a caja` | ✅ |
| `/hoy` | `Abrir inventario` (focus card) | `Ver inventario` | ✅ |
| `/hoy` | `Abrilo si quieres ver mas detalle` | `Expandir resumen del mes` | ✅ |
| `/hoy` mini agenda | `Abrir agenda` | `Mostrar turnos de hoy` | ✅ |
| `/hoy` mini agenda card | `Abrir` | `Ir a turnos` | ✅ |
| `/caja` | `Simple` | `Vista simple` | ✅ |
| `/caja` | `Detalle` | `Vista separada` | ✅ |
| `/negocio` SmartCard | `Abrir` (hardcodeado) | footer dinámico por destino | ✅ |
| `/negocio` SmartCard | `Abrir panel diario` | `Ir al panel diario` | ✅ |
| `/negocio` SmartCard | `Abrir liquidaciones` | `Ver liquidaciones` | ✅ |
| `/negocio` SmartCard | `Abrir inventario` | `Ver inventario` | ✅ |
| `/negocio` SmartCard | `Abrir gastos y deuda` | `Ver gastos y deuda` | ✅ |
| `/configuracion` | `Abrir modulo →` (todas las cards) | `Ver [nombre del modulo] →` | ✅ |
| `/configuracion` header | `Abrir musica` | `Ver musica` | ✅ |
| `/reservar` | `Subir a la cabina` | `Subir a la cabina con {barbero.nombre}` | ✅ |
| `/marcianos` | `Entrar al club` | `Entrar` | ✅ |
| `/marcianos` | `Activar mi portal` | mantener | ✅ |
| `/liquidaciones` | `Abrir detalle` | `Ver liquidacion` | ✅ |
| landing hero | `Clientes Marcianos` (vibe tag + label) | `Portal Marciano` | ✅ |

## Paths y naming

### 1. Nombre publico para Marciano

**Resuelto:** `Portal Marciano` como nombre del lugar. `Entrar` / `Acceder` como CTA — no repetir "portal" en el boton.

Aliases tecnicos (`/marciano/*`, `/marcianos`) solo por compatibilidad.

### 2. Taxonomia por superficie

- `Hoy` = lo que hago ahora
- `Caja` = donde cobro y reviso movimientos
- `Turnos` = agenda y reservas
- `Negocio` = hub del owner
- `Configuracion` = reglas y catalogos
- `Mi Resultado` = lectura personal del owner

## Estados y accesibilidad

Pendiente para siguiente sprint. Cada CTA tocado debe revisar:

- **Loading**: spinner inline o texto `Cargando...`, nunca boton mudo.
- **Disabled**: razon visible (tooltip o helper text). Nunca disabled silencioso.
- **Empty**: si el destino no tiene data, el CTA del origen debe reflejarlo (`Sin turnos hoy` en vez de `Mostrar turnos de hoy`).
- **Semantica HTML**: si navega a otra URL → `<a href>`. Si cambia estado en la misma pagina → `<button>`. Verificar que no haya invertidos.
- **Foco visible** y `aria-label` cuando el copy es generico.
- **Mobile 360px**: `Mostrar turnos de hoy` (21 chars) y `Expandir resumen del mes` (24 chars) — verificar wrap.
- **`Subir a la cabina con {nombre}`**: en mobile mostrar nombre como subtitulo si el string supera 22 chars.

## Glosario de marca

Terminos **intocables** (no renombrar sin discusion explicita):

- **Marciano** / **Marcianos** — programa VIP de clientes.
- **Portal Marciano** — nombre publico del area logueada del cliente.
- **Cabina** — flujo de reserva con barbero (`Subir a la cabina`).
- **Base** — solo en contexto interno/staff. No exponer al publico.

Terminos **neutros** (libres de cambiar segun claridad):

- `Abrir`, `Ver`, `Ir a`, `Mostrar`, `Expandir`, `Detalle`, `Modulo`, `Acceso`, `Ingreso`.

Regla: si un copy mezcla un termino intocable con uno neutro, el intocable manda.

## Inventario tecnico (estado post-implementacion)

| Copy nuevo | Archivo | Notas |
|---|---|---|
| `Reservar turno` | `src/app/page.tsx` | |
| `Portal Marciano` (CTA home) | `src/app/page.tsx` | |
| `Ingreso staff` (home) | `src/app/page.tsx` | |
| `Ingreso staff` (login) | `src/app/login/page.tsx` | |
| `Portal Marciano` (hero tag + label) | `src/components/landing/PublicLandingHero.tsx` | |
| HoyActionStrip al tope | `src/app/(barbero)/hoy/page.tsx` | movido antes del hero |
| `Ir a caja` (focus card) | `src/app/(barbero)/hoy/page.tsx` | reemplaza `Abrir comandos` |
| `Ver inventario` (focus card) | `src/app/(barbero)/hoy/page.tsx` | |
| `Ir a caja` (recentFocus) | `src/app/(barbero)/hoy/page.tsx` | |
| `Expandir resumen del mes` | `src/app/(barbero)/hoy/page.tsx` | |
| `Mostrar turnos de hoy` | `src/components/hoy/HoyActionStrip.tsx` | |
| `Ir a caja` (action strip) | `src/components/hoy/HoyActionStrip.tsx` | |
| `Ir a turnos` (turno card) | `src/components/hoy/HoyActionStrip.tsx` | |
| `Vista simple` | `src/app/(barbero)/caja/page.tsx` | |
| `Vista separada` | `src/app/(barbero)/caja/page.tsx` | |
| footer dinamico + `Ver X` | `src/app/(admin)/negocio/page.tsx` | SmartCard ahora usa `{footer}` |
| `Ver [modulo] →` por card | `src/app/(admin)/configuracion/page.tsx` | campo `cta` en array `cards` |
| `Ver musica` (header) | `src/app/(admin)/configuracion/page.tsx` | |
| `Subir a la cabina con {nombre}` | `src/app/reservar/page.tsx` | |
| `Entrar` | `src/app/marciano/(public)/login/page.tsx` | |
| `Ver liquidacion` | `src/app/(admin)/liquidaciones/page.tsx` | |

Copys que no cambiaron (decisiones explicitas):

| Copy | Archivo | Motivo |
|---|---|---|
| `Activar mi portal` | `src/app/marciano/(public)/login/page.tsx` | claro, mantener |
| `Activar mi portal` | `src/components/marciano/MarcianoRegisterForm.tsx` | claro, mantener |
| `Portal Marciano` (layout, email, ficha, reset) | varios | nombre del lugar — correcto |

## Matriz de roles × superficie

| Superficie | Rol que ve | Notas |
|---|---|---|
| `/` home | todos | `Reservar turno` = publico. `Portal Marciano` + `Ingreso staff` = re-entradas. Visualmente: 1 primario + 2 secundarios. |
| `/reservar` | cliente nuevo | prima identidad de marca (`cabina`). |
| `/marcianos` | marciano | tono casual; copy puede asumir contexto. |
| `/hoy` | barbero / owner | auditoria de CTAs por rol pendiente → `docs/qa/hoy-roles-audit.md` |
| `/caja` | barbero / owner | barbero ve solo sus movimientos; owner ve global. |
| `/negocio` | owner | ningun otro rol entra. |
| `/configuracion` | owner | catalogos. |
| `/liquidaciones` | owner / barbero | barbero ve solo las propias. |
| `/mi-resultado` | barbero | lectura personal. |

## Decisiones resueltas

1. **`Portal Marciano`** confirmado como nombre publico unico. `Club` descartado.
2. **`Abrir comandos`** — CTA eliminado. HoyActionStrip movido al tope de `/hoy`.
3. **`/negocio`** — SmartCard ya era `<Link>` (card entera clickeable). Footer ahora dinamico.
4. **Home publica** — limpiar solo los botones. Vibe tags del hero se mantienen como decoracion.
5. **CTAs por rol en `/hoy`** — auditoria en `docs/qa/hoy-roles-audit.md` (pendiente).

## Pendientes (siguiente sprint)

- [ ] Auditoria de estados y accesibilidad (loading/disabled/empty/HTML semantico) para cada CTA tocado.
- [ ] Smoke test visual en 360px: `Mostrar turnos de hoy`, `Expandir resumen del mes`, `Subir a la cabina con {nombre}`.
- [ ] Auditoria de CTAs por rol en `/hoy` → ver `docs/qa/hoy-roles-audit.md`.

## Changelog

- **v1.3 — 2026-04-07** — Implementacion completa. Tabla de CTAs actualizada con estado. Inventario post-implementacion. `/caja` Vista simple/separada. `/reservar` con nombre del barbero. Pendientes separados.
- **v1.2 — 2026-04-07** — Glosario de marca, inventario tecnico con paths, matriz de roles × superficie, tabla de longitud/mobile, decisiones resueltas, version + changelog.
- **v1.1 — 2026-04-07** — Regla de oro, columna evidencia, estados/accesibilidad, checklist. Ajustes en CTAs de `/hoy`, `/negocio`, `/reservar`, `/marcianos`, `/liquidaciones`.
- **v1.0 — 2026-04-07** — Primera version: regla general de verbos, tabla de CTAs, naming Marciano, taxonomia.
