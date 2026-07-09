# Design Handoff — Tablero de avance

Documento vivo del rediseño de A51 con el diseñador UX/UI.
Actualizar cada vez que abre, mueve o cierra un PR.

**Fecha de inicio:** 2026-05-23
**Owner técnico:** Was (cotte4)
**Diseñador UX/UI:** [nombre]

---

## Cómo se usa este doc

- **Él** actualiza la fila correspondiente cada vez que abre/cierra un PR o cambia de superficie.
- **Was** mira este doc en el EOD review (6:30 PM) antes de abrir los PRs.
- Estados válidos:
  - `📋 Backlog` — todavía no arrancó
  - `🎨 Figma` — diseñando, sin código aún
  - `🚧 In progress` — branch abierta, hay commits
  - `👀 In review` — PR abierto, esperando feedback de Was
  - `🔁 Changes requested` — Was pidió cambios
  - `✅ Done` — mergeado a master

Una sola superficie en `🚧 In progress` por vez. Disciplina de WIP.

---

## Tablero por superficie

Orden sugerido (ver sección "Plan de ataque" más abajo):

| # | Superficie | Estado | Branch | Preview URL | Notas |
|---|---|---|---|---|---|
| 1 | Reserva pública | 📋 Backlog | - | - | Bug encoding + UX pass. Primera porque es contained y alto impacto. |
| 2 | Pantalla pública del local | 📋 Backlog | - | - | Funcional pero visual desactualizado. Importante porque la ve el cliente. |
| 3 | Portal Marciano (público) | 📋 Backlog | - | - | Login, registro, recuperar, reset. Cara visible al cliente VIP. |
| 4 | Portal Marciano (autenticado) | 📋 Backlog | - | - | Perfil, turnos, seguridad. Validar si cancela/reprograma desde UI. |
| 5 | Landing pública | 📋 Backlog | - | - | `src/app/page.tsx`. Primer touchpoint. |
| 6 | Operación diaria — Hoy | 📋 Backlog | - | - | Mature. Solo pasada de coherencia visual. |
| 7 | Operación diaria — Caja | 📋 Backlog | - | - | Mature. QuickCheckout, AtencionForm, cierre. |
| 8 | Operación diaria — Turnos | 📋 Backlog | - | - | Mature. Agenda + disponibilidad. Falta flow de reprogramación. |
| 9 | Operación diaria — Clientes | 📋 Backlog | - | - | Mature y profundo. Perfil, historial, briefing. |
| 10 | Operación diaria — Música | 📋 Backlog | - | - | ⚠️ Automation incompleta. NO rediseñar lógica, solo UI. |
| 11 | Negocio — Portada | 📋 Backlog | - | - | Hub del admin. Alto impacto visual. |
| 12 | Negocio — Dashboard / Flujo / P&L | 📋 Backlog | - | - | Reporting. KPI cards + tablas. |
| 13 | Negocio — Liquidaciones | 📋 Backlog | - | - | Pagos al equipo. PDF también. |
| 14 | Negocio — Inventario | 📋 Backlog | - | - | Lista, alta, detalle, rotación. |
| 15 | Negocio — Gastos rápidos | 📋 Backlog | - | - | ⚠️ Requiere `db:push` aplicado. FAB + modal. |
| 16 | Negocio — Repago Memas | 📋 Backlog | - | - | Form simple. Bajo esfuerzo. |
| 17 | Negocio — Mi resultado | 📋 Backlog | - | - | Vista personal del barbero. |
| 18 | Configuración — Barberos | 📋 Backlog | - | - | CRUD maestro. |
| 19 | Configuración — Servicios | 📋 Backlog | - | - | CRUD + historial + adicionales. |
| 20 | Configuración — Medios de pago | 📋 Backlog | - | - | CRUD simple. |
| 21 | Configuración — Temporadas | 📋 Backlog | - | - | CRUD simple. |
| 22 | Configuración — Música | 📋 Backlog | - | - | Spotify connect + estado. |

---

## Reglas no negociables del diseño

(Resumen — la versión completa está en `CLAUDE.md` raíz del proyecto)

- **Tema:** dark, premium. Background `#121212`, accent verde neón `#8cff59`.
- **Nunca usar** `bg-white`, `text-gray-*`, `border-gray-*`.
- **Usar siempre** las clases CSS existentes: `.panel-card`, `.panel-soft`, `.neon-button`, `.ghost-button`, `.eyebrow`, `.font-display`, `.app-shell`.
- **Mobile-first.** La app se usa en celular en la barbería.
- **Bottom nav fija** → siempre `pb-24` en `<main>`.
- **Icons:** SVG inline con `strokeWidth="1.9"`. Nunca librería.
- **Plata:** siempre `formatARS` (Intl `es-AR`, ARS).
- **Timezone:** `"America/Argentina/Buenos_Aires"`.
- **Tono / copy:** universo Pinky (Paul, Ted, Proyecto X, Marciano Pelufo).

---

## Zonas frágiles — NO tocar sin avisar a Was

Estos archivos contienen lógica de negocio crítica. Si el rediseño los toca, **avisar en el kickoff de la mañana ANTES de pushear**:

- `src/lib/caja-finance.ts` — fórmulas del cierre diario
- `src/lib/dashboard-queries.ts` — queries de KPIs financieros
- `src/lib/bep.ts` — break-even point
- `src/lib/caja-atencion.ts` — registro de atención + consumiciones Marciano
- `src/lib/marciano-config.ts` — config membresía Marciano
- `src/lib/turnos.ts` — visibility rules de turnos
- `src/lib/music-engine.ts` + `src/lib/music-*.ts` — motor de música (incompleto)
- `src/lib/admin-action.ts` + `src/lib/caja-access.ts` — validación de permisos
- `src/db/schema.ts` — schema de DB
- `src/proxy.ts` — middleware de permisos
- `src/components/navigation/RoleBottomNav.tsx` — única bottom nav

---

## Flow de trabajo diario

### 9:30 AM — Kickoff (audio WhatsApp)
Él manda:
```
AYER: [qué terminó / qué PR está abierto]
HOY: [qué superficie ataca]
BLOQUEOS: [dudas que lo frenan, si las hay]
```
Was responde con feedback + resolución de bloqueos.

### 10:00 AM – 6:00 PM — Trabajo paralelo
- Una branch = una superficie.
- Branch name: `ui/<superficie>-<cambio>` (ej: `ui/reserva-publica-rediseño`).
- Dudas no bloqueantes → canal `#a51-design-questions`. Sigue trabajando.
- Cada push genera preview URL automático en Vercel.

### 6:30 PM — EOD Review (Was, 15 min)
- Mira los PRs del día en GitHub.
- Abre preview URLs en celular y los prueba.
- Feedback inline en GitHub + audio de 1 min en WhatsApp.
- Mergea a master lo que esté OK.

### Viernes — Sync semanal (videollamada, 30 min)
- Revisar este tablero.
- Decidir prioridades de la semana siguiente.
- Mostrar prototipos de Figma todavía no codeados.

---

## Plan de ataque sugerido (primeras 4 semanas)

### Semana 1 — Cara pública
Foco: lo que ve el cliente sin login. Alto impacto, contained.
- Reserva pública (incluye fix de encoding)
- Landing pública
- Pantalla pública del local

### Semana 2 — Portal Marciano completo
Foco: experiencia del cliente VIP de punta a punta.
- Portal Marciano público (login, registro, recuperar, reset)
- Portal Marciano autenticado (perfil, turnos, seguridad)
- Validar si falta flow de cancelar/reprogramar turno

### Semana 3 — Operación diaria
Foco: las pantallas que el barbero usa cada día.
- Hoy (pasada de coherencia visual)
- Caja (QuickCheckout es la más usada)
- Turnos (agenda + disponibilidad)
- Clientes (perfil profundo)
- Música (solo UI, no lógica)

### Semana 4 — Admin / Negocio / Configuración
Foco: lo que Was usa para mirar el negocio.
- Negocio portada (hub)
- Dashboard / Flujo / P&L
- Liquidaciones + Inventario + Gastos + Repago + Mi resultado
- Configuración (5 sub-superficies)

---

## Log de cambios

Cada superficie cerrada deja una línea acá. Formato: `YYYY-MM-DD — <superficie> — <branch> — <nota corta>`.

- _(vacío por ahora)_

---

## Preguntas abiertas para el diseñador

Lista viva. Él agrega, Was responde en el EOD review.

- _(vacío por ahora)_
