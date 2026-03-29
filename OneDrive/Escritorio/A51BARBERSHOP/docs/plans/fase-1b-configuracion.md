# Plan: Fase 1B — Módulo Configuración del Negocio
Date: 28/03/2026
Status: in-progress

---

## Qué construye este plan

Al terminar este plan, Pinky podrá acceder a `/configuracion` y gestionar los 4 maestros del negocio:
1. **Barberos** — CRUD con tipo de modelo (variable/híbrido), % comisión, alquiler banco, activar/desactivar
2. **Servicios** — CRUD con precio actual, adicionales por servicio, y historial de precios (nunca se pisa un precio anterior)
3. **Medios de pago** — CRUD con % de comisión, activar/desactivar
4. **Gastos fijos** — CRUD con categoría, monto, frecuencia

Todo el módulo es mobile-first, en español Argentina, solo accesible para rol admin.

---

## Prerequisites

- [x] Schema Drizzle aplicado en Neon (barberos, servicios, servicios_adicionales, servicios_precios_historial, medios_pago, categorias_gasto, gastos)
- [x] Better Auth con roles admin/barbero funcionando
- [x] Seed data aplicado (Pinky, Gabote, servicios y medios de pago)
- [x] Middleware protegiendo rutas admin

---

## Database

Tablas ya existentes en el schema — no requieren migración nueva:
- `barberos` — id, nombre, rol, tipo_modelo, porcentaje_comision, alquiler_banco_mensual, sueldo_minimo_garantizado, activo, creado_en
- `servicios` — id, nombre, precio_base, activo
- `servicios_adicionales` — id, servicio_id, nombre, precio_extra
- `servicios_precios_historial` — id, servicio_id, precio, vigente_desde, motivo, creado_por
- `medios_pago` — id, nombre, comision_porcentaje, activo
- `categorias_gasto` — id, nombre, color
- `gastos` — id, categoria_id, descripcion, monto, fecha, es_recurrente, frecuencia, comprobante_url, notas, creado_en

---

## File structure

```
/src/app/(admin)/configuracion/
  layout.tsx                    — Nav entre las 4 secciones
  page.tsx                      — Redirect a /barberos (o página de bienvenida)
  barberos/
    page.tsx                    — Listar barberos (Server Component)
    nuevo/page.tsx              — Formulario crear barbero (Server Component + Action)
    [id]/editar/page.tsx        — Formulario editar barbero (Server Component + Action)
    actions.ts                  — Server Actions: crear, editar, toggleActivo
  servicios/
    page.tsx                    — Listar servicios con precio actual
    nuevo/page.tsx              — Formulario crear servicio (con adicionales)
    [id]/editar/page.tsx        — Formulario editar servicio (precio crea historial)
    [id]/historial/page.tsx     — Ver historial de precios del servicio
    actions.ts                  — Server Actions: crear, editar, cambiarPrecio, toggleActivo
  medios-de-pago/
    page.tsx                    — Listar medios de pago
    nuevo/page.tsx              — Formulario crear medio de pago
    [id]/editar/page.tsx        — Formulario editar medio de pago
    actions.ts                  — Server Actions: crear, editar, toggleActivo
  gastos-fijos/
    page.tsx                    — Listar gastos por categoría
    nuevo/page.tsx              — Formulario crear gasto
    [id]/editar/page.tsx        — Formulario editar gasto
    actions.ts                  — Server Actions: crear, editar, eliminar

/src/components/configuracion/
  ConfNavBar.tsx                — Barra de navegación entre las 4 secciones
  BarberoForm.tsx               — Formulario reutilizable barbero (client component)
  ServicioForm.tsx              — Formulario reutilizable servicio (client component)
  MedioPagoForm.tsx             — Formulario reutilizable medio de pago (client component)
  GastoForm.tsx                 — Formulario reutilizable gasto (client component)
  ToggleActivoButton.tsx        — Botón activar/desactivar (client component)
  DeleteButton.tsx              — Botón eliminar con confirmación (client component)
```

---

## Decisiones de implementación

1. **Cambio de precio de servicio**: Al editar un servicio, si el `precio_base` cambia, se crea un registro en `servicios_precios_historial` con `vigente_desde = hoy` y el motivo que escriba Pinky. El `precio_base` de la tabla `servicios` también se actualiza (es el precio "actual"). El historial es el registro inmutable del pasado.

2. **Adicionales de servicios**: En el formulario de editar servicio, se pueden agregar/eliminar adicionales inline. Decisión simple: eliminar adicional es hard delete (si no hay atenciones que lo referencien — para Fase 1B no hay atenciones, así que es seguro).

3. **Categorías de gasto**: Precargadas en seed (Infraestructura, Productos, Personal, Marketing, Otros). No hay CRUD de categorías en Fase 1B — se editan via seed o directamente si hace falta.

4. **Formularios**: Todos client components con `useActionState` de React 19 para manejar errores del Server Action sin full page reload.

5. **Navegación de confirmaciones**: Después de crear/editar, redirigir a la lista. Usar `redirect()` de next/navigation en el Server Action.

---

## Implementation tasks

1. **Crear layout de /configuracion con nav** — el layout envuelve las 4 secciones con navegación persistente
2. **Módulo Barberos** — lista + crear + editar + toggle activo
3. **Módulo Servicios** — lista + crear + editar con cambio de precio (historial) + adicionales
4. **Módulo Medios de Pago** — lista + crear + editar + toggle activo
5. **Módulo Gastos Fijos** — lista + crear + editar + eliminar
6. **Verificar next build** sin errores TypeScript

---

## Acceptance criteria (del PRD)

- [ ] Pinky puede crear un barbero con modelo "híbrido" (Gabote: 75% + $300.000/mes banco)
- [ ] Al cambiar el precio de un servicio, el historial queda registrado con fecha de vigencia
- [ ] Los medios de pago muestran su % de comisión (MP QR = 6%, Posnet débito = 1.5%, Efectivo = 0%)
- [ ] La configuración de Gabote tiene: porcentaje_comision = 75, alquiler_banco_mensual = 300000
- [ ] Todas las pantallas son usables en mobile (botones ≥ 44px, formularios en columna)
- [ ] next build pasa sin errores

---

## Edge cases a manejar

- Precio $0 en servicios → validar que precio > 0 antes de guardar
- Editar barbero con nombre vacío → validar required
- Cambio de precio de servicio sin motivo → motivo es opcional pero recomendado (no bloqueante)
- Intentar desactivar todos los medios de pago → permitido (el operador es responsable)
- Adicional con precio negativo → validar precio_extra >= 0

---

## Out of scope

- CRUD de categorías de gasto (se precarga en seed)
- Historial de cambios de barberos
- Upload de fotos de barberos (Fase 2 — Vercel Blob)
- Temporadas (Feature 3 del PRD 1B — no requerida por el usuario en esta sesión)
- Comprobantes de gastos (Fase 2 — Vercel Blob)
