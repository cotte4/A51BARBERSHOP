# Plan: Fase 1D - Cierre de Caja Diario
Date: 28/03/2026
Status: draft

## Que construye este plan

Esta fase crea el cierre diario como snapshot inmutable. El cierre bloquea nuevas atenciones para la fecha cerrada y deja guardados dos conceptos distintos:

- `caja_neta_del_dia`
- `aporte_economico_casa_del_dia`

Separar esos dos numeros es obligatorio para no mezclar plata en caja con resultado economico del negocio.

## Regla financiera del cierre

```text
total_bruto = sum(precio_cobrado)
total_comisiones_medios = sum(comision_medio_pago_monto)
caja_neta_del_dia = sum(monto_neto)

aporte_economico_casa_del_dia =
  sum(aporte_casa_servicio_gabote)
  + sum(margen_producto_del_dia)
  + alquiler_banco_devengado_dia
```

Por barbero:

```text
Pinky:
  total_bruto
  ingreso_neto_pinky = sum(precio_cobrado - comision_medio_pago_monto)

Gabote:
  total_bruto
  comision_gabote = sum(comision_barbero_monto)
  aporte_casa_gabote = sum(precio_cobrado - comision_barbero_monto - comision_medio_pago_monto)
  alquiler_banco_prorrateado = alquiler_banco_mensual / dias_calendario_del_mes
```

Notas:

- el prorrateo diario del alquiler es solo referencia economica
- la cobranza real del alquiler se resuelve en la liquidacion mensual

## Lo que debe mostrar el preview de cierre

- ingresos por medio de pago
- total bruto
- comisiones de medios
- caja neta del dia
- resumen por barbero
- aporte economico casa del dia
- cantidad de atenciones activas
- cantidad de anuladas

## Persistencia

Guardar en `cierres_caja`:

- fecha
- totales por medio
- total bruto
- total comisiones medios
- total neto de caja
- total productos
- resumen_barberos
- cantidad_atenciones
- cerrado_por
- cerrado_en

Y asociar todas las atenciones del dia a `cierre_caja_id`.

## Reglas de inmutabilidad

- una fecha no se puede cerrar dos veces
- una fecha cerrada no admite nuevas atenciones
- una atencion cerrada no puede editarse ni anularse

## Archivos principales

- `src/app/(barbero)/caja/cierre/page.tsx`
- `src/app/(barbero)/caja/cierre/[fecha]/page.tsx`
- `src/app/(barbero)/caja/actions.ts`
- `src/components/caja/ResumenCierre.tsx`
- `src/components/caja/CerrarCajaButton.tsx`

## Tareas

1. Calcular preview del cierre desde atenciones activas del dia.
2. Persistir snapshot en `cierres_caja`.
3. Asociar atenciones al cierre.
4. Bloquear nuevas escrituras sobre esa fecha.
5. Mostrar vista read-only del cierre ya emitido.

## Acceptance criteria

- solo admin puede cerrar caja
- no se puede cerrar dos veces la misma fecha
- luego del cierre no se pueden registrar nuevas atenciones del dia
- el resumen separa caja neta del dia y aporte economico casa del dia
- un dia con cero atenciones cierra sin error

## Out of scope

- PDF
- reapertura de cierre
- conciliacion de efectivo fisico
