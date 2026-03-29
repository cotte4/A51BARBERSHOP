# Plan: Fase 1E - Liquidaciones Mensuales
Date: 28/03/2026
Status: draft

## Que construye este plan

Esta fase construye la liquidacion mensual por barbero. Debe servir para dos cosas:

- decir cuanto hay que pagar cuando el resultado del mes es positivo
- registrar meses negativos sin convertirlos en deuda futura

## Regla financiera canonica

### Gabote

```text
total_comision_calculada = sum(comision_barbero_monto)
sueldo_minimo = sueldo_minimo_configurado o 0
base_liquidable = max(total_comision_calculada, sueldo_minimo)

resultado_liquidacion = base_liquidable - alquiler_banco_mensual + ajustes_mes
monto_a_pagar = max(resultado_liquidacion, 0)
resultado_negativo = min(resultado_liquidacion, 0)
```

Reglas:

- si `resultado_liquidacion > 0`, hay pago a Gabote
- si `resultado_liquidacion < 0`, se registra como mes negativo
- no hay deuda
- no hay carry-forward

### Pinky

```text
resultado_liquidacion = sum(comision_barbero_monto)
monto_a_pagar = resultado_liquidacion
```

## Cambios de datos requeridos

La tabla `liquidaciones` debe poder guardar el resultado real del periodo, no solo el monto pagable.

Campos esperados:

- `total_cortes`
- `total_bruto_cortes`
- `total_comision_calculada`
- `sueldo_minimo`
- `alquiler_banco_cobrado`
- `monto_resultado`
- `monto_a_pagar`
- `pagado`
- `fecha_pago`
- `notas`

Si `monto_resultado` no existe todavia, esta fase requiere una migracion.

## UI esperada

### Lista

- barbero
- periodo
- resultado del periodo
- monto a pagar
- estado

### Detalle

- total de cortes
- total bruto
- comision calculada
- sueldo minimo si aplica
- alquiler banco
- resultado del periodo
- monto a pagar si es positivo
- mensaje de "mes negativo" si el resultado es menor a 0

## Seccion "Mi mes" para Gabote

Debe mostrar una proyeccion honesta:

```text
mis cortes
mi comision acumulada
alquiler banco del mes
resultado proyectado del mes
```

No usar la etiqueta "neto a cobrar" cuando todavia puede ser negativo.

## Archivos principales

- `src/app/(admin)/liquidaciones/page.tsx`
- `src/app/(admin)/liquidaciones/nueva/page.tsx`
- `src/app/(admin)/liquidaciones/[id]/page.tsx`
- `src/app/(admin)/liquidaciones/actions.ts`
- `src/app/(barbero)/caja/page.tsx`

## Tareas

1. Agregar el campo faltante en schema si hace falta.
2. Generar liquidacion desde atenciones del periodo.
3. Persistir `monto_resultado` y `monto_a_pagar`.
4. Mostrar detalle de liquidacion con estados positivos y negativos.
5. Permitir marcar pagada solo si corresponde.

## Acceptance criteria

- se calcula automaticamente la base liquidable
- se descuenta el alquiler de banco dentro del resultado del periodo
- un resultado negativo se registra como mes negativo sin deuda
- cada barbero ve solo sus propias liquidaciones
- la liquidacion generada queda inmutable

## Out of scope

- PDF
- reapertura de liquidaciones
- liquidacion automatica por cron
