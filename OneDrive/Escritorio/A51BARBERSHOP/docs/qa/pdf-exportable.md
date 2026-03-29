# Especificacion QA - PDF Exportable
Date: 28/03/2026
Status: updated

## Liquidacion PDF

Validar que el documento incluya:

- total de cortes
- total bruto
- comision calculada
- sueldo minimo si aplica
- alquiler banco
- resultado del periodo
- monto a pagar cuando corresponde

Si `resultado del periodo < 0`:

- debe decir `Mes negativo`
- no debe mostrar deuda futura

## Cierre PDF

Validar que el documento incluya:

- total bruto
- comisiones medios
- caja neta del dia
- desglose por barbero
- aporte economico casa del dia

## Seguridad

- Pinky puede descargar todo lo suyo
- Gabote solo su propia liquidacion
- Gabote no puede descargar cierres ni liquidaciones ajenas
