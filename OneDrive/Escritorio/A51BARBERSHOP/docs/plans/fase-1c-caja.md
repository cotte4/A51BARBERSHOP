# Plan: Fase 1C - Caja Diaria
Date: 28/03/2026
Status: draft

## Que construye este plan

Esta fase construye el flujo operativo principal del negocio: registrar una atencion desde el celular en menos de 30 segundos, verla inmediatamente en la lista del dia, y dejar guardados todos los snapshots necesarios para calculos historicos correctos.

## Reglas financieras canonicas

Usar siempre `docs/PRD-Plan.md` como fuente de verdad.

```text
precio_cobrado = precio final realmente cobrado al cliente
comision_medio_pago_monto = precio_cobrado * porcentaje_medio_pago
monto_neto = precio_cobrado - comision_medio_pago_monto

si barbero = Gabote:
  comision_barbero_monto = precio_cobrado * 0.75
  aporte_casa_servicio = precio_cobrado - comision_barbero_monto - comision_medio_pago_monto

si barbero = Pinky:
  comision_barbero_monto = precio_cobrado * 1.00
  aporte_casa_servicio = 0
```

Notas:

- la fee del medio de pago la absorbe la casa
- Gabote cobra sobre el precio final, no sobre el neto de caja
- Pinky no aporta porcentaje a la casa por sus propios cortes

## Datos que deben persistirse por atencion

- fecha y hora
- barbero
- servicio
- adicionales
- precio base snapshot
- precio cobrado final
- medio de pago
- porcentaje de fee snapshot
- fee calculada
- monto neto
- porcentaje de comision snapshot
- comision del barbero
- notas

## UX del formulario

- mobile first
- barbero preseleccionado si el usuario es Gabote
- precio sugerido precargado
- calculos visibles antes de confirmar
- submit con server action
- lista del dia debajo del formulario o accesible en un tap

## Restricciones

- calculo visible en cliente, pero revalidado en server action
- no confiar en porcentajes enviados por el browser
- anulacion solo admin y con motivo
- cortesia con precio 0 permitida

## Archivos principales

- `src/app/(barbero)/caja/page.tsx`
- `src/app/(barbero)/caja/nueva/page.tsx`
- `src/app/(barbero)/caja/[id]/editar/page.tsx`
- `src/app/(barbero)/caja/actions.ts`
- `src/components/caja/AtencionForm.tsx`
- `src/components/caja/ResumenDia.tsx`
- `src/components/caja/AnularButton.tsx`

## Tareas

1. Cargar datos base del formulario desde server component.
2. Renderizar formulario mobile-first.
3. Recalcular montos en tiempo real en cliente.
4. Revalidar calculos y persistir en server action.
5. Mostrar lista del dia con totales.
6. Permitir editar y anular segun permisos.

## Acceptance criteria

- registrar una atencion en menos de 30 segundos
- mostrar bruto, fee, neto y comision antes de confirmar
- Gabote solo ve sus propias atenciones
- Pinky ve todas
- anulacion solo admin con motivo
- precio 0 no rompe el flujo

## Out of scope

- soporte offline
- cierre de caja
- PDF
- liquidacion mensual
