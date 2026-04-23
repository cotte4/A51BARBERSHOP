# PRD de avance — Casamoda App (estado del producto)

**Última revisión:** 2026-04-23  
**Ubicación:** `docs/PRD_AVANCE_CASAMODA.md` (convención: avance operativo en `/docs`).  
**Propósito:** Una sola vista de **qué está hecho**, **qué está en curso** y **qué falta**, alineado al [`PRD.md`](../PRD.md) (visión multi-módulo) y al [`PRD_DIVISION_REPOSICION.md`](../PRD_DIVISION_REPOSICION.md) (piloto división).

**Alcance real del repo hoy:** la app entregable en este monorepo es sobre todo **Catálogo + Ingesta Zeus (XLSX) + División/Reposición** (MVP operativo). Los demás módulos del `PRD.md` (Finanzas, Compras completas, etc.) **no están implementados** en código aún; figuran como *fuera de repo / futuro*.

---

## 1. Resumen ejecutivo

| Área | Estado |
|------|--------|
| **Stack** | Next.js 16 (App Router) + NestJS + Prisma + PostgreSQL — operativo. |
| **Datos** | Seed rico + opción mock sin DB (backend). |
| **División (PRD división)** | Motor alineado a reglas duras (curva, múltiplos, top‑N, mínimos, excepciones, `sin_historial` reposición), flujo propuesta, export CSV/XLSX/PDF, auditoría en API + UI. |
| **Zeus** | Ingesta por **export manual** (preview, upload, apply) — **sin** API Zeus en producción. |
| **Auth / roles** | **Parcial avanzado:** JWT + login (`/login`), guard global en API, `@Roles` por endpoint y restricciones visuales por ruta/acción en frontend. Falta endurecimiento productivo y cobertura fina en todos los flujos. |
| **Resto del PRD.md** | Finanzas, compras, marketing… **no iniciados** en este codebase. |

---

## 2. Mapa de pantallas (frontend)

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/login` | Email + contraseña, sesión JWT en `localStorage` | **Hecho**. |
| `/` | Inicio | Redirige a `/automatizaciones` (requiere sesión). |
| `/catalogo` | Tiendas, categorías, productos, matriz de bloqueos | **Hecho** (lectura vía API). |
| `/importacion` | Hub importación | **Hecho** (navegación). |
| `/importacion/ingesta` | Subida XLSX, preview, apply | **Hecho** (según API disponible). |
| `/division` | Lista propuestas + builder nueva propuesta | **Hecho**. |
| `/division/[id]` | Detalle, edición líneas, validar/publicar, excepciones, export, PDF, timeline auditoría | **Hecho**. |
| `/automatizaciones/*` | Ideas / detalle | **Esqueleto / baja prioridad** respecto al PRD división. |

---

## 3. Backend (módulos NestJS)

| Módulo | Estado | Notas |
|--------|--------|--------|
| `health` | Completado | Incluye check DB. |
| `catalog` | Completado (MVP lectura) | CRUD admin avanzado no es objetivo actual. |
| `ingestion` | Completado (MVP) | Preview, upload, listado, **apply** a productos/bloqueos/ventas/stock (según planilla). |
| `division` | Completado (MVP Fase 1 división) | Dry-run, generar propuesta, parches, validar/publicar/descartar, marcar excepción, export CSV/XLSX/PDF, auditoría por propuesta. |

---

## 4. PRD División y reposición — checklist frente a [`PRD_DIVISION_REPOSICION.md`](../PRD_DIVISION_REPOSICION.md)

Leyenda: Completado / Parcial / Pendiente

### 4.1 Motor (sección 5)

| Requisito | Estado |
|-----------|--------|
| Filtrado tiendas (bloqueos, Luro outlet, capacidad Tandil-style) | **Completado** (según datos en DB). |
| Cobertura mínima × `factorTienda`, alineado a múltiplo | **Completado**. |
| Curva completa / `REQUIERE_EXCEPCION` motor | **Completado** (+ UI y persistencia resumen). |
| Top‑N cuando no alcanza stock para mínimos | **Completado** + tests. |
| Score por categoría+tienda (no global) | **Completado** vía `SalesScore`. |
| Directivas dueñas (priorizar / no mandar / forzar) | **Completado (MVP)** — motor + API + panel UI (alta, activar/desactivar, targets por código/SKU, validaciones por alcance). |
| Reposición: fallback `sin_historial` si historial &lt; 14 días | **Completado** (`diasHistorialVentas` en schema + motor); ingesta puede no poblar aún el campo en todos los flujos. |
| Capa estadística (forecast / mlScore) | **Parcial (base)** — modelo `ml_score_snapshots` + endpoint read-only `/division/ml-scores` con fallback seguro. |

### 4.2 Flujo propuesta y operación (secciones 6–8, 11)

| Requisito | Estado |
|-----------|--------|
| Remanente depósito visible | **Completado**. |
| Edición cantidades aprobadas + totales vs lote | **Completado**. |
| Estados BORRADOR / VALIDADA / REQUIERE_EXCEPCION / PUBLICADA / DESCARTADA | **Completado**. |
| Export CSV + Excel paralelo | **Completado**. |
| PDF imprimible | **Completado** (PDF simple planilla depósito). |
| Auditoría persistida + timeline en UI | **Completado** (lectura por propuesta). |
| Auth encargado/dueñas/admin | **Parcial avanzado** — login JWT + roles seed + RBAC backend por endpoint y guardas/rutas UI principales. |

### 4.3 PRD — pantallas listadas §11.2

| Pantalla PRD | Estado |
|----------------|--------|
| Ingreso lote (escaneo + formulario) | **Parcial** — formulario texto SKU/cantidad; **sin** escáner dedicado. |
| Propuesta SKU × tienda editable | **Completado** (matriz + editor líneas). |
| Detalle producto (curva, ventas, bloqueos) | **Parcial** — panel enriquecido en `/division/[id]` con métricas SKU y flags por tienda; falta vista dedicada completa de producto. |
| Matriz bloqueos editable (admin) | **Completado (MVP+)** — edición por celda, feedback de guardado/error y timeline con filtros (tienda/categoría/actor/fecha) en UI. |
| Directivas dueñas (formulario) | **Completado (MVP)**. |
| Alertas motor (Fase 4) | **Pendiente** (modelo `Alert` en schema, sin producto). |
| Auditoría timeline | **Completado** (por propuesta). |

### 4.4 Roadmap piloto (sección 12)

| Fase PRD | Estado real aproximado |
|----------|-------------------------|
| Fase 0 Fundación | **Completada** en este repo (scaffold, schema, seed, ingest parser). |
| Fase 1 Piloto categoría | **En práctica avanzada** — motor + flujo + exports; falta acotar “una categoría piloto” solo por config/operación, no por código. |
| Fase 2 Piloto por tipo ingreso | **Parcial** — tipos de lote en modelo; falta productización del flujo “solo importado”, etc. |
| Fase 3 Unificación | **Pendiente**. |
| Fase 4 Alertas IA | **Pendiente**. |

---

## 5. PRD general [`PRD.md`](../PRD.md) — módulos vs este repo

| Módulo PRD.md | En este repo |
|---------------|--------------|
| Finanzas | **No** |
| Importación (contenedores, alertas…) | **Parcial** — solo ingesta archivos relacionada a catálogo/stock/ventas para división. |
| Compras | **No** |
| Marketing y ventas | **No** |
| Producción | **No** |
| RRHH | **No** |
| División (este PRD) | **Sí** — núcleo actual. |

---

## 6. Próximos pasos (prioridad, dueño, objetivo)

Sustituir *Por asignar* / *TBD* cuando el equipo defina responsables y ventanas.

| # | Tarea | Dueño | Objetivo (fecha o fase) |
|---|--------|-------|-------------------------|
| 1 | **RBAC fino** por rol (terminar cobertura de acciones puntuales y endurecer flujos sensibles) | Por asignar | TBD |
| 2 | Ingesta → poblar `diasHistorialVentas` (y metadatos útiles) desde Excel | Por asignar | TBD |
| 3 | Historial de cambios de bloqueos (persistencia extendida, export y métricas) | Por asignar | TBD |
| 4 | Página detalle producto (curva, histórico por tienda — PRD §11.2) | Por asignar | TBD |
| 5 | Cliente Zeus API (reemplazar solo conector; mantener tablas internas) | Por asignar | TBD |
| 6 | Capa estadística avanzada en división (forecast + score híbrido con feature flag, sin romper reglas duras) | En curso | Sprint ML 1-3 |

---

## 7. Cómo mantener este documento

Tras cada hito de producto, actualizar:

- Fecha en cabecera.  
- Tablas §2–§4 (filas que pasan de Parcial → Completado).  
- Sección §6 (dueños, objetivos y orden según negocio).

Referencias permanentes (raíz del repo): [`PRD.md`](../PRD.md), [`PRD_DIVISION_REPOSICION.md`](../PRD_DIVISION_REPOSICION.md), [`DECISIONES_DUENAS.md`](../DECISIONES_DUENAS.md), [`NOTAS_PROYECTO_DIVISION.md`](../NOTAS_PROYECTO_DIVISION.md).
