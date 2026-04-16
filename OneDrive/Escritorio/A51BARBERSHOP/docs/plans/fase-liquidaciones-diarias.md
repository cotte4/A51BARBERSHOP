# Plan: Liquidaciones Diarias para Gabote

**Fecha:** 30/03/2026
**Estado:** completado
**PRD ref:** Secciones 6.9, 11.4

---

## Contexto actual

- La tabla `liquidaciones` ya usa `periodoInicio` y `periodoFin` (tipo DATE), no tiene un campo "mes" fijo. La lógica es period-agnostica.
- El formulario de nueva liquidación tiene presets: "Este mes", "Mes pasado", "Últimos 15 días".
- El cálculo actual: `baseLiquidable = max(comision, sueldoMinimo)`, luego resta `alquilerBancoCobrado`.
- El PDF dice "Liquidación Mensual".
- La vista lista separa "Pendientes" (no pagadas) y "Historial" (pagadas).

## Objetivo

Convertir el flujo de liquidaciones para que sea **diario por defecto**: al cerrar el día, si Gabote trabajó, se muestra cuánto se le debe y se puede generar la liquidación con un tap. Sin alquiler de banco ni sueldo mínimo.

---

## Cambios

### 1. Formulario de nueva liquidación

**Archivo:** `src/app/(admin)/liquidaciones/nueva/_NuevaLiquidacionForm.tsx`

**Cambios en presets:**
- Eliminar "Este mes", "Mes pasado", "Últimos 15 días"
- Nuevos presets:
  - **"Hoy"** — `periodoInicio = hoy, periodoFin = hoy`
  - **"Ayer"** — `periodoInicio = ayer, periodoFin = ayer`
  - **"Personalizado"** — inputs manuales (mantener los que hay)
- Default al abrir: preset "Hoy" pre-seleccionado

**Simplificación del flujo:**
- Paso 1: seleccionar barbero (sin cambios, ya filtra solo `rol !== "admin"`)
- Paso 2: seleccionar fecha (presets + manual). Mostrar "X días" solo si es rango > 1 día
- Paso 3: preview + confirmar (sin cambios de estructura)

### 2. Cálculo de liquidación

**Archivo:** `src/app/(admin)/liquidaciones/actions.ts` — función `generarLiquidacion`

**Simplificación de la fórmula:**
```
totalCortes = COUNT atenciones de Gabote en la fecha, no anuladas
totalBrutoCortes = SUM precioCobrado
totalComisionCalculada = SUM comisionBarberoMonto
montoAPagar = totalComisionCalculada  // directo, sin max ni restas
```

- Eliminar: `sueldoMinimo`, `alquilerBancoCobrado`, `baseLiquidable`, `resultadoPeriodo`
- Los campos `sueldoMinimo` y `alquilerBancoCobrado` se guardan como `null` o `"0.00"` en el insert (no romper la tabla)
- Validación de overlap: mantener — no puede existir otra liquidación para el mismo barbero+fecha

### 3. Integración con cierre de caja

**Archivo:** `src/app/(barbero)/caja/cierre/page.tsx`

Al cerrar el día, si Gabote tuvo atenciones:
- Mostrar un bloque **"Liquidación pendiente"** con:
  - Nombre: Gabote
  - Cortes del día: X
  - Comisión: $X.XXX (60% de su bruto)
- Botón **"Generar liquidación"** que linke a `/liquidaciones/nueva?barberoId={id}&fecha={hoy}`
- Si ya existe liquidación para Gabote en esa fecha, mostrar "Liquidación generada" con link al detalle

**Archivo:** `src/app/(admin)/liquidaciones/nueva/page.tsx`
- Aceptar query params `barberoId` y `fecha` para pre-llenar el formulario
- Pasar como `initialBarberoId` y `initialFecha` al form component

### 4. Vista de lista

**Archivo:** `src/app/(admin)/liquidaciones/page.tsx`

- En la sección "Pendientes": mostrar fecha (no rango) cuando `periodoInicio === periodoFin`
  - Ejemplo: "Gabote — 30/03/2026 — 8 cortes — $XX.XXX"
- En la sección "Historial": misma lógica
- Si el rango es > 1 día (liquidación legacy o manual), mostrar rango como antes
- Aplicar `formatFecha()` del helper nuevo en todas las fechas

### 5. Vista de detalle

**Archivo:** `src/app/(admin)/liquidaciones/[id]/page.tsx`

- Cambiar título: "Liquidación — Gabote" (sin "mensual")
- Periodo: mostrar "30/03/2026" si es un solo día, "30/03/2026 al 05/04/2026" si es rango
- Ocultar filas de "Sueldo mínimo garantizado" y "Alquiler banco" si son 0 o null (ya lo hace parcialmente)
- Cambiar "El periodo dio negativo" → no aplica para el modelo diario simple, pero dejar el check por si acaso
- Aplicar `formatFecha()` en todas las fechas

### 6. PDF

**Archivo:** `src/components/pdf/LiquidacionPDF.tsx`

- Título: "Liquidacion Mensual" → **"Liquidacion"** (genérico, vale para diaria y para rangos)
- "Mes negativo" → **"Periodo negativo"** (por consistencia)
- Periodo: "30/03/2026" si un solo día, rango si es mayor
- Eliminar filas de alquiler banco y sueldo mínimo del resumen si son 0/null

**Archivo:** `src/app/api/pdf/liquidacion/[id]/route.ts`
- Nombre del archivo: `liquidacion-gabote-2026-03-30.pdf` (sin cambios, ya usa periodoInicio)

### 7. Vista barbero (Gabote)

Si Gabote tiene acceso a `/liquidaciones` (verificar en proxy.ts):
- Debería ver solo sus liquidaciones diarias
- Misma presentación que admin pero sin botón de generar nueva

---

## Schema

No requiere migración. La tabla `liquidaciones` ya soporta cualquier rango de fechas con `periodoInicio` y `periodoFin`. Los campos `sueldoMinimo` y `alquilerBancoCobrado` son nullable y se llenan con null/0.

---

## Archivos a tocar

| Archivo | Cambio |
|---|---|
| `liquidaciones/nueva/_NuevaLiquidacionForm.tsx` | Presets diarios, simplificar UI |
| `liquidaciones/nueva/page.tsx` | Aceptar query params |
| `liquidaciones/actions.ts` | Simplificar fórmula |
| `liquidaciones/page.tsx` | Formato de fecha, display de día vs rango |
| `liquidaciones/[id]/page.tsx` | Labels, ocultar campos vacíos, fechas |
| `caja/cierre/page.tsx` | Bloque de liquidación pendiente de Gabote |
| `components/pdf/LiquidacionPDF.tsx` | Título, labels, ocultar campos vacíos |
| `api/pdf/liquidacion/[id]/route.ts` | Sin cambios funcionales |

## Verificación

- [ ] Generar liquidación para "Hoy" con preset
- [ ] Generar liquidación para "Ayer"
- [ ] Montos correctos: 60% del bruto de Gabote
- [ ] No aparece alquiler ni sueldo mínimo
- [ ] Desde cierre de caja se ve la liquidación pendiente
- [ ] PDF muestra "Liquidacion" (no "Mensual")
- [ ] Fechas en DD/MM/YYYY
- [ ] `npm run build` sin errores
