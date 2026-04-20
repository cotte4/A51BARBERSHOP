# QA Review: Sesión 16 — Music Engine v3, Beats Mode, Consumiciones Marciano, Navegación
Date: 04/04/2026
Reviewer: QA Agent (Playwright + code review)
Status: CHANGES REQUESTED

---

## Features testeadas

- RoleBottomNav (reemplazo de AdminBottomNav)
- Página `/hoy` y redirect de login
- `/musica` — Spotify tab + Beats tab
- `/caja/nueva` — Flujo de consumiciones Marciano
- `/turnos` — Prioridad Marciano (code review, sin datos en DB)
- `/negocio` — Hub de gestión
- Proxy / protección de rutas

---

## Acceptance criteria

| AC | Status | Evidencia / Issue |
|----|--------|-----------------|
| Admin aterriza en pantalla operativa al abrir la app | ✅ Pass | Login → `/hoy`. Diseño evolucionó de `/caja` a `/hoy`, correcto. |
| RoleBottomNav muestra ítems correctos por rol | ✅ Pass | Admin: Hoy, Caja, Clientes, Turnos, Musica, Negocio (6 ítems). Barbero: mismo sin Negocio (5). |
| Gabote NO ve rutas de admin | ✅ Pass (código) | Proxy redirige non-admin que intenta `/negocio` → `/caja`. |
| `/musica` muestra modos Auto / Soy DJ / Jam | ✅ Pass | Cabina del local con badges, botones funcionales, Spotify conectado. |
| Tab Beats muestra buscador de YouTube con géneros | ✅ Pass | Trap, Boom Bap, Drill, Lo-Fi, R&B, Afrobeat, Reggaeton, Jazz + textbox. |
| Seleccionar cliente Marciano en caja activa consumiciones | ✅ Pass | "Tomi M." encontrado, al seleccionar muestra "Marciano activo" + "Beneficios Marciano disponibles". |
| Toggle "Marcar como incluida" aparece en productos consumición | ❌ Fail | Toggle no aparece — ver blocker #1. |
| `prioridadAbsoluta` en TurnoCard muestra badge PRIORIDAD | ✅ Pass (código) | `TurnoCard.tsx:128` renderiza badge condicional. Sin datos en DB para verificar visual. |
| `/caja/cierre` carga sin error 500 | ❌ Fail | Log del servidor muestra `GET /caja/cierre 500` — no testeado en esta sesión pero registrado. |

---

## Edge cases

| Edge case | Status | Notas |
|-----------|--------|-------|
| Atencion sin clientId: toggle Marciano no aparece | ✅ Pass | UI confirma: "Si no elegis cliente, la atencion queda como caja comun" |
| Cliente no Marciano: server rechaza esMarcianoIncluido | ✅ Pass (código) | `caja-atencion.ts` valida server-side |
| Producto sin esConsumicion: toggle no aparece | ✅ Pass (código) | Condicional en `AtencionForm.tsx:964` |
| Beats tab: cambio de view al hacer click | ✅ Pass | Screenshot confirma BeatsStudio renderiza correctamente |
| Non-admin intenta acceder a /negocio | ✅ Pass (código) | Proxy redirige a `/caja` |

---

## Issues encontrados

### 🔴 Blocker 1: `esConsumicion = false` en DB para Cafe y Gaseosa

**Descripción:** El seed `seed-go-live.ts` no setea `esConsumicion: true` para los productos Cafe y Gaseosa. El campo existe en el schema (`src/db/schema.ts:274`) y el toggle de consumición Marciano solo aparece cuando `producto.esConsumicion === true` (`AtencionForm.tsx:964`). En producción, nunca va a aparecer el toggle aunque el cliente sea Marciano.

**Archivo:** `src/db/seed-go-live.ts:96-111`

**Cómo reproducir:** Loguear como Pinky → `/caja/nueva` → seleccionar "Tomi M." (Marciano) → agregar "Cafe" → el toggle "Marcar como incluida" no aparece.

**Fix:** Agregar `esConsumicion: true` en el objeto de Cafe y Gaseosa en `seed-go-live.ts`, Y correr una migración de datos para actualizar los registros existentes:
```sql
UPDATE productos SET es_consumicion = true WHERE nombre IN ('Cafe', 'Gaseosa');
```

---

### 🔴 Blocker 2: Gabote no puede loguearse (400 BAD_REQUEST)

**Descripción:** Al intentar login con `gabote@a51barber.com / gabote1234` (credenciales del dev seed), el servidor devuelve `400 BAD_REQUEST` en `/api/auth/sign-in/email`. Pinky sí puede loguearse. Esto impide verificar el flujo del barbero (vista sin "Negocio", sin "Ver negocio" en header).

**Causa probable:** El go-live seed (`seed-go-live.ts`) crea el usuario Gabote pero no establece password. Si la base se pobló solo con el go-live seed, Gabote tiene password null o diferente.

**Fix:** Verificar si Gabote existe en `user` table con password seteado. Si no tiene password, usar la consola de Better Auth o un script para setearlo.

---

### 🟡 Warning: `/caja/cierre` devuelve 500

**Descripción:** El log del servidor registra `GET /caja/cierre 500 in 1643ms` de una sesión anterior. No fue reproducido en esta sesión de QA pero está en los logs.

**Archivo:** `a51-dev.out.log`

**Acción:** Reproducir manualmente. Si sigue fallando, investigar la causa del 500 antes de go-live.

---

### 🔵 Sugerencia: Tokens de Spotify expirados en runtime status

**Descripción:** La pantalla de Música muestra "Expira: 4/4/26, 7:14 p. m." con el token vencido al momento del test. El sistema sigue mostrando "Listo para sonar" aunque el token haya expirado. Considerar si el estado debe degradar automáticamente a `degraded` cuando el token está vencido.

---

## Lo que no se pudo testear

| Ítem | Motivo |
|------|--------|
| Vista de barbero (RoleBottomNav sin Negocio) | Gabote no puede loguearse (blocker #2) |
| Badge PRIORIDAD en TurnoCard | Sin turnos en DB para hoy |
| Flujo completo de consumición Marciano a $0 | `esConsumicion = false` (blocker #1) |
| Beats Studio búsqueda real de YouTube | No se ejecutó búsqueda (fuera de scope de esta sesión) |
| Modo Soy DJ takeover | No activado en esta sesión |

---

## Verdict

**CHANGES REQUESTED — 2 blockers deben resolverse antes de ir a producción.**

1. `esConsumicion = true` para Cafe y Gaseosa en DB
2. Password de Gabote seteado correctamente
