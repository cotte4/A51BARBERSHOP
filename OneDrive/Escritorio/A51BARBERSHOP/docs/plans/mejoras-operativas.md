# Plan: Mejoras Operativas — Sesión 14

**Fecha:** 30/03/2026
**Estado:** completado (16/04/2026) — todos los módulos implementados

## Cambios incluidos

1. Corrección del modelo financiero de Gabote (comisión 60%, sin alquiler de banco)
2. Liquidaciones diarias para Gabote
3. Selector de productos adicionales en formulario de atención
4. Navegación dividida para Pinky (Operación del día / Gestión del negocio)
5. Formato de fecha DD/MM/YYYY en toda la UI

---

## Módulo 1 — Corrección modelo financiero Gabote

**Impacto:** alto. Afecta cálculos de caja, cierre y dashboard.

### 1a. Seed de datos
- `src/db/seed.ts`: cambiar `porcentajeComision` de Gabote de `"75.00"` a `"60.00"`
- `src/db/seed.ts`: cambiar `alquilerBancoMensual` de `"300000.00"` a `null`
- Si existe `seed-go-live.ts` con datos de Gabote, corregir igual

### 1b. `src/lib/caja-finance.ts`
- Eliminar el cálculo de `alquilerBancoDevengadoDia` (líneas ~187-192)
- Eliminar `alquilerBancoDevengadoDia` del objeto `ResumenCierreDia`
- Corregir `aporteEconomicoCasaDia` para que sea solo `aporteCasaServicios + margenProductos` (sin alquiler)
- Eliminar `alquilerBancoDiario` del resumen por barbero
- Limpiar el tipo `ResumenBarbero` para sacar `alquilerBancoDiario`
- Limpiar el tipo `ResumenCierreDia` para sacar `alquilerBancoDevengadoDia`

### 1c. `src/lib/bep.ts`
- Eliminar parámetro `alquilerBancoDia` del input
- Recalcular `contribucionCasaPorCorte` sin el factor de alquiler:
  ```
  contribucionCasaPorCorte = mixGabote * (precioPromedio * (0.40 - feePromedioMedioPago))
  ```
  Nota: el 0.40 reemplaza el 0.25 anterior (casa retiene 40% con comisión 60% de Gabote)

### 1d. `src/lib/dashboard-queries.ts`
- Eliminar la query de `alquilerBancoMes` (líneas ~275+)
- Eliminar cualquier suma de alquiler al `resultado_casa_mes`
- Verificar que `aporte_casa_por_servicio_gabote` ya use el porcentaje del barbero (dinámico desde DB) — si es así, no requiere cambio en la fórmula, solo en el seed

### 1e. Componentes de cierre y dashboard
- Buscar cualquier componente que muestre "alquiler banco" o `alquilerBancoDevengado` y eliminarlo de la UI
- Archivos a revisar: `src/app/(admin)/caja/cierre/`, `src/app/(admin)/dashboard/`

---

## Módulo 2 — Liquidaciones diarias

**Impacto:** alto. El módulo `/liquidaciones` cambia de flujo mensual a flujo diario.

### 2a. Schema DB (`src/db/schema.ts`)
- Revisar tabla `liquidaciones`: actualmente tiene campo `mes` (YYYY-MM). Cambiar a modelo diario:
  - Agregar campo `fecha` (date) — el día de trabajo
  - El campo `mes` puede mantenerse como campo calculado o eliminarse
  - Campo `montoPagado` o `monto` ya debería existir
- Correr `npm run db:push` al final

### 2b. Acción de creación de liquidación
- `src/app/(admin)/liquidaciones/nueva/actions.ts` (o similar):
  - El formulario pasa de seleccionar mes a seleccionar fecha específica
  - El cálculo es: suma de `comisionBarberoMonto` de todas las atenciones de Gabote en esa fecha
  - No hay alquiler ni sueldo mínimo
  - Validar que no exista ya una liquidación para esa fecha y barbero

### 2c. Integración con cierre de caja
- Al hacer el cierre del día, si Gabote tuvo atenciones ese día, mostrar un bloque con "Liquidación pendiente para Gabote: $X.XXX"
- Botón directo para crear la liquidación del día desde el cierre (o al menos link a `/liquidaciones/nueva` con la fecha pre-llenada)

### 2d. Vista de liquidaciones (`/liquidaciones`)
- Cambiar la vista de lista de "por mes" a "por día"
- Mostrar fecha, barbero, monto y estado (pendiente / pagado)
- Filtro por rango de fechas en lugar de selector de mes

### 2e. Vista del barbero (`/liquidaciones` en rol barbero)
- Gabote ve sus liquidaciones diarias: fecha, monto, estado
- Sin cambio de permisos, solo cambio de presentación

### 2f. PDF de liquidación (`src/app/api/pdf/liquidacion/[id]`)
- Actualizar para mostrar "Liquidación del día DD/MM/YYYY" en lugar de "Mes YYYY-MM"
- Listar los servicios del día con precio, comisión y total

---

## Módulo 3 — Selector de productos en formulario de atención

**Impacto:** medio. Extensión del formulario existente en `caja/nueva`.

### 3a. Componente `AtencionForm`
- Agregar sección "Productos" dentro del formulario (debajo del servicio, antes del resumen de precio)
- Botón "＋ Agregar producto" que abre un modal o panel inline
- El panel muestra los productos con stock > 0 (query a inventario)
- El barbero puede seleccionar uno o más productos con cantidad
- Los productos seleccionados se listan debajo del botón con precio y botón para eliminar
- El total del cobro se recalcula sumando el precio de los productos

### 3b. Cálculo financiero
- Cada producto seleccionado se registra como un `stock_movimiento` de tipo venta
- El `precioCobrado` del formulario debe incluir o excluir los productos según se defina (recomendado: separar — el corte es un monto y los productos son otro monto en el mismo registro de atención)
- Revisar cómo `registrarAtencion` en `caja-atencion.ts` maneja ventas de productos y si acepta múltiples items en el mismo submit

### 3c. Estado y resumen
- Mostrar en el resumen pre-confirmación: "Servicio: $X.XXX + Productos: $X.XXX = Total: $X.XXX"
- Snapshot de precio de producto al momento de la venta (ya debería existir en `stock_movimientos`)

---

## Módulo 4 — Navegación dividida para Pinky

**Impacto:** medio. Cambio estructural de nav/layout, no de lógica de negocio.

### 4a. Layout de (admin)
- `src/app/(admin)/layout.tsx`: dividir la nav en dos grupos
  - **Operación del día**: Caja, Cierre, Gastos Rápidos
  - **Gestión del negocio**: Dashboard, Liquidaciones, Inventario, Repago, Clientes, Turnos, Mi Resultado, Configuración
- Separación visual clara (titulo de sección, separador, o acordeón colapsable)
- Mobile: la sección "Operación del día" debe estar visible sin scroll

### 4b. Home / redirect por defecto
- Si Pinky abre la app, el default debería ser la sección operativa (caja o cierre del día), no el dashboard
- Revisar el redirect en `src/proxy.ts` o en el layout

---

## Módulo 5 — Formato de fecha DD/MM/YYYY ✓ Implementado

**Impacto:** bajo por módulo, pero amplio en cantidad de archivos.

### 5a. Utilidad de formato
- Verificar si existe un helper de formato de fecha en `src/lib/`
- Si no existe, crear `src/lib/fecha.ts` con:
  ```ts
  export function formatFecha(date: Date | string): string {
    // retorna DD/MM/YYYY
  }
  export function formatFechaHora(date: Date | string): string {
    // retorna DD/MM/YYYY HH:MM
  }
  ```

### 5b. Aplicación global
- Buscar todos los lugares donde se formatean fechas con `toLocaleDateString`, `format()`, o strings YYYY-MM-DD expuestos directamente en UI
- Prioridad alta: liquidaciones, cierre de caja, atenciones, turnos
- Reemplazar con el helper o con `toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })`

---

## Orden de implementación recomendado

1. **Módulo 1** (corrección financiera) — base para que todo lo demás calcule bien
2. **Módulo 2** (liquidaciones diarias) — depende de que el modelo financiero esté corregido
3. **Módulo 5** (fechas) — puede hacerse en paralelo con 1 y 2
4. **Módulo 3** (productos en atención) — independiente, puede ir en paralelo
5. **Módulo 4** (nav dividida) — independiente, puede ir en paralelo

## Verificación final

- [ ] `npm run build` sin errores
- [ ] Seed corrido con datos corregidos de Gabote
- [ ] Liquidación diaria creada y visible para Gabote
- [ ] Cierre del día no muestra alquiler banco
- [ ] Dashboard calcula resultado_casa sin alquiler
- [ ] Productos se pueden agregar en formulario de atención
- [ ] Nav de Pinky muestra dos secciones
- [ ] Fechas en DD/MM/YYYY en liquidaciones, cierre y atenciones
