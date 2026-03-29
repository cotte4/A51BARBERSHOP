# Plan: Fase 2A - Dashboard Financiero
Date: 28/03/2026
Updated: 29/03/2026
Status: done

## Que construye este plan

Al terminar este plan, Pinky tendrá un dashboard financiero completo con 4 vistas: resumen diario/mensual con KPIs, P&L mensual, flujo de ingresos y egresos, y comparativa de temporadas. Gabote no tiene acceso a ninguna de estas vistas.

## Prerequisites

- [x] Cierres de caja implementados (Fase 1D)
- [x] Gastos fijos implementados (Fase 1B)
- [x] Liquidaciones implementadas (Fase 1E)
- [x] Inventario con margen de productos (Fase 1)
- [x] Repago Memas implementado (Fase 1)
- [ ] Campo `presupuesto_mensual` en tabla `temporadas` — agregar antes de implementar el BEP widget

## Cambio de schema necesario

Agregar una columna a `temporadas`:

```typescript
presupuestoMensual: numeric("presupuesto_mensual", { precision: 12, scale: 2 })
// Nullable. Si es NULL, el BEP usa gastos reales del mes.
```

Esto permite que el BEP widget compare contra el presupuesto proyectado sin crear una nueva tabla ni pantalla.
Agregar el campo también en `/configuracion/temporadas` (un input más en el form existente).

## Estructura de archivos

```
src/app/(admin)/dashboard/
  page.tsx                        — vista principal con KPIs dia y mes
  pl/
    page.tsx                      — P&L mensual detallado
  flujo/
    page.tsx                      — ingresos y egresos por dia en el mes
  temporadas/
    page.tsx                      — tabla comparativa proyectado vs real

src/app/api/dashboard/
  kpis-dia/route.ts               — GET: resultado del dia actual
  kpis-mes/route.ts               — GET: resultado del mes en curso
  pl/route.ts                     — GET: P&L mensual (params: mes, anio)
  flujo/route.ts                  — GET: ingresos y egresos diarios del mes
  temporadas/route.ts             — GET: todas las temporadas con reales vs proyectados
  pl-pdf/route.ts                 — GET: genera PDF del P&L (Fase 2C)

src/lib/dashboard-queries.ts      — queries SQL agrupadas por modulo
src/components/dashboard/
  KpiCard.tsx                     — card reutilizable de metrica
  BepWidget.tsx                   — widget de punto de equilibrio
  FlujoDiarioChart.tsx            — tabla/grafico de flujo diario
  TemporadasTable.tsx             — tabla de comparativa de temporadas
```

## Formulas canonicas

### Ingresos casa del mes

```text
ingresos_casa_mes =
  sum(precio_cobrado - comision_barbero_monto - comision_medio_pago_monto)
    de atenciones de Gabote del mes
  + alquiler_banco_mensual
  + margen_productos_mes
  + margen_merch_mes
```

### Resultado casa

```text
resultado_casa_mes = ingresos_casa_mes - gastos_fijos_mes - otros_gastos_mes
```

### Resultado personal de Pinky

```text
pinky_bruto_mes = sum(precio_cobrado - comision_medio_pago_monto)
  de atenciones de Pinky del mes

pinky_neto_mes = pinky_bruto_mes + resultado_casa_mes - cuota_memas_mes
```

### BEP diario

```text
gastos_referencia_dia =
  si existen gastos reales del mes → sum(gastos_fijos_mes + otros_gastos_mes) / dias_calendario_mes
  sino → temporada_activa.presupuesto_mensual / dias_calendario_mes
  sino → mostrar "sin referencia de gastos"

mix_gabote =
  cortes_gabote_mes / (cortes_gabote_mes + cortes_pinky_mes)
  -- si no hay cortes aun en el mes: usar 0.5 como default con label "estimado"

contribucion_casa_por_corte =
  (mix_gabote * precio_promedio_cobrado * (0.25 - fee_promedio_medio_pago))
  + (alquiler_banco_mensual / (dias_calendario_mes * cortes_dia_promedio_temporada))

cortes_para_bep = ceil(gastos_referencia_dia / contribucion_casa_por_corte)
```

El widget debe mostrar:
- "BEP superado" si cortes_del_dia >= cortes_para_bep
- "Faltan N cortes" si no
- Siempre aclarar si usa gastos reales o presupuesto estimado

### Flujo de ingresos y egresos

```text
-- Por cada dia del mes:
ingresos_dia = sum(caja_neta_del_dia) de cierres_caja del dia
egresos_dia  = sum(monto) de gastos del dia
saldo_dia    = ingresos_dia - egresos_dia
saldo_acumulado = sum(saldo_dia) desde dia 1 del mes hasta ese dia
```

### Comparativa de temporadas

Por cada temporada definida, mostrar:
```text
cortes_proyectados_dia     = temporada.cortes_dia_proyectados
cortes_reales_promedio_dia = avg(cortes_del_dia) de dias con cierre en ese periodo
precio_proyectado          = temporada.precio_proyectado
precio_promedio_real       = avg(precio_cobrado) de atenciones en ese periodo
ingreso_casa_proyectado    = cortes_proyectados_dia * precio_proyectado * 0.25 * dias_temporada
ingreso_casa_real          = sum(aporte_casa_del_dia) de cierres en ese periodo
desviacion_pct             = (ingreso_casa_real - ingreso_casa_proyectado) / ingreso_casa_proyectado * 100
estado                     = "futura" | "activa" | "completada"
```

## Vista por vista

### `/dashboard` — principal

KPIs del dia:
- Atenciones hoy (Pinky / Gabote / total)
- Caja neta del dia
- Aporte economico casa del dia
- Widget BEP

KPIs del mes:
- Atenciones del mes
- Resultado casa del mes (acumulado)
- Resultado personal Pinky (acumulado)
- Saldo Memas pendiente (traer de repago_memas)

### `/dashboard/pl` — P&L mensual

Selector de mes/año en el top.

Desglose:
- Ingresos de servicios Gabote (brutos)
- (-) Comisiones Gabote
- (-) Fees medios de pago (servicios)
- (+) Alquiler banco
- (+) Margen productos
- = Ingresos casa
- (-) Gastos fijos mes
- (-) Otros gastos mes
- = Resultado casa
- (+) Ingresos Pinky (sus cortes netos)
- (-) Cuota Memas del mes
- = Resultado personal Pinky

### `/dashboard/flujo` — flujo mensual

Selector de mes/año.
Tabla con columnas: Fecha | Ingresos | Egresos | Saldo dia | Saldo acumulado.
Los dias sin cierre y sin gastos muestran 0 (no se omiten).
Destacar dias donde egresos > ingresos.

### `/dashboard/temporadas` — comparativa

Tabla con una fila por temporada (incluye futuras).
Columnas: Temporada | Periodo | Cortes/dia proy. | Cortes/dia real | Precio proy. | Precio real | Ingreso casa proy. | Ingreso casa real | Desviacion %
Las temporadas futuras muestran solo columnas proyectadas, las demas en gris.

## Reglas de presentacion

- Pinky y casa siempre van en lineas separadas
- no mostrar cortes de Pinky como ingreso de la casa
- usar snapshots historicos, no precios actuales
- todos los calculos financieros en servidor — ningun calculo sensible en cliente
- Gabote no puede acceder a ninguna ruta de este modulo

## Autenticacion

Todas las rutas de este modulo deben verificar `session.user.role === "admin"`.
Redirigir a `/` si el rol es `barbero`.

## Checklist de implementacion

### Paso 1 — Schema y configuracion

- [ ] 1.1 Agregar `presupuesto_mensual` a tabla `temporadas` en `schema.ts`
- [ ] 1.2 Ejecutar `npm run db:push`
- [ ] 1.3 Agregar el campo al form de `/configuracion/temporadas`

### Paso 2 — Queries y logica de negocio

- [ ] 2.1 Crear `src/lib/dashboard-queries.ts`
  - query `getKpisDia(fecha)` — agrega cierres y atenciones del dia
  - query `getKpisMes(mes, anio)` — agrega el mes completo
  - query `getPL(mes, anio)` — devuelve todas las lineas del P&L
  - query `getFlujoMensual(mes, anio)` — devuelve array de {fecha, ingresos, egresos}
  - query `getComparativaTemporadas()` — devuelve todas las temporadas con reales
- [ ] 2.2 Crear `src/lib/bep.ts` con funcion `calcularBep(params)` — logica pura sin DB

### Paso 3 — API routes

- [ ] 3.1 `GET /api/dashboard/kpis-dia` — verificar admin, llamar `getKpisDia(hoy)`
- [ ] 3.2 `GET /api/dashboard/kpis-mes` — verificar admin, llamar `getKpisMes`
- [ ] 3.3 `GET /api/dashboard/pl?mes=X&anio=Y` — verificar admin, llamar `getPL`
- [ ] 3.4 `GET /api/dashboard/flujo?mes=X&anio=Y` — verificar admin, llamar `getFlujoMensual`
- [ ] 3.5 `GET /api/dashboard/temporadas` — verificar admin, llamar `getComparativaTemporadas`

### Paso 4 — Paginas

- [ ] 4.1 `/dashboard/page.tsx` — Server Component, llama directamente las queries (no via API), renderiza KpiCard x4 y BepWidget
- [ ] 4.2 `/dashboard/pl/page.tsx` — selector de mes + tabla P&L con subtotales
- [ ] 4.3 `/dashboard/flujo/page.tsx` — selector de mes + tabla FlujoDiarioChart
- [ ] 4.4 `/dashboard/temporadas/page.tsx` — tabla TemporadasTable

### Paso 5 — Verificacion

- [ ] 5.1 `npm run build` sin errores TypeScript
- [ ] 5.2 Verificar que un usuario con rol `barbero` no puede acceder a `/dashboard`
- [ ] 5.3 Verificar que el P&L de un mes con datos reales da el mismo resultado que el calculo manual
- [ ] 5.4 Verificar que el BEP muestra "sin referencia de gastos" si no hay gastos ni presupuesto

## Acceptance criteria

- Pinky puede ver resultado casa, Pinky neto y BEP sin ambiguedad
- el dashboard usa las formulas canonicas de `docs/PRD-Plan.md`
- los datos historicos respetan snapshots
- el dashboard no expone informacion financiera a Gabote
- el flujo mensual muestra ingresos y egresos por dia con saldo acumulado
- la tabla de temporadas muestra proyectado vs real para temporadas con datos, solo proyectado para futuras
- el BEP indica claramente si usa gastos reales o presupuesto estimado
- si no hay presupuesto ni gastos reales, el BEP muestra "sin referencia de gastos" en lugar de un numero

## Out of scope

- proyecciones automaticas complejas
- graficos con librerias externas (usar tablas por ahora)
- payback narrativo o storytelling visual
- comparativas multi-mes en una sola vista
