# Especificacion QA - Dashboard Financiero
Date: 28/03/2026
Status: updated

## Objetivo

Verificar que el dashboard use la logica financiera canonica y no mezcle caja, resultado de la casa y resultado personal de Pinky.

## Checks funcionales

### Control de acceso

- Pinky entra a todas las rutas del dashboard
- Gabote no puede entrar

### KPIs diarios

- el dashboard distingue `caja_neta_del_dia` de `aporte_economico_casa_del_dia`
- no usa solo `total_neto` como si fuera resultado economico

### KPIs mensuales

- `ingresos_casa_mes` usa solo Gabote + alquiler banco + margen productos
- `pinky_bruto_mes` usa cortes de Pinky netos de fee
- `pinky_neto_mes` descuenta Memas

### BEP

- usa gastos reales o presupuesto configurable
- muestra la fuente del calculo
- no rompe cuando faltan datos

### Historico

- usa snapshots de precios y fees
- no recalcula meses viejos con configuracion actual

## Casos a probar

1. Dia sin atenciones.
2. Mes con solo cortes de Pinky.
3. Mes con solo cortes de Gabote.
4. Mes con productos vendidos.
5. Mes con cuota Memas activa.
6. Mes con Memas cancelado.

## Criterio de aprobado

El modulo queda aprobado solo si cada numero del dashboard puede explicarse desde las formulas de `docs/PRD-Plan.md`.
