# A51 Barber - PRD Plan

**Sistema interno de gestion | Version planificada**  
Actualizado: 28/03/2026

## 1. Proposito del documento

Este documento define el producto que A51 Barber quiere construir.

Incluye:

- problema de negocio
- objetivos
- reglas financieras canonicas
- alcance por fases
- requisitos funcionales y no funcionales
- modelo de datos y stack objetivo

No incluye estado vivo del codigo ni checklists operativos de la sesion actual. Eso vive en [PRD-Live](C:\Users\fran-\OneDrive\Escritorio\A51BARBERSHOP\docs\PRD-Live.md).

## 2. Executive Summary

A51 Barber es una barberia de Mar del Plata, Argentina, que abre en 2026 con dos barberos: Pinky y Gabote. Hoy la gestion operativa y financiera se resuelve en papel. El objetivo del sistema es reemplazar ese cuaderno desde el dia 1, registrar la operacion real del negocio, calcular comisiones y cierres sin ambiguedad, y darle a Pinky visibilidad diaria y mensual sobre el resultado del negocio.

El sistema no es un SaaS ni una agenda para clientes. Es un sistema interno de operaciones, caja y control financiero para una sola sucursal.

## 3. Problema

Hoy el negocio tiene un modelo financiero claro, pero no tiene un sistema que lo ejecute.

Consecuencias:

- los cortes y cobros se anotan a mano
- las liquidaciones mensuales se calculan manualmente
- no hay cierre de caja diario confiable
- no hay lectura clara de la salud del negocio
- el stock de productos se maneja de forma reactiva

## 4. Objetivos y metricas

| Objetivo | Metrica | Target |
|---|---|---|
| Reemplazar el cuaderno desde el dia 1 | % de atenciones registradas en el sistema | 100% |
| Eliminar calculo manual de liquidaciones | Tiempo de liquidacion mensual | menor a 5 minutos |
| Hacer la caja operable en mobile | Tiempo de registro por atencion | menor a 30 segundos |
| Dar visibilidad financiera real | Pinky ve el resultado del dia y del mes sin calculo manual | Si |
| Controlar stock | Alertas de stock minimo y rotacion | Si |
| Mantener visible el acuerdo con Memas | Saldo, cuotas pagadas y proyeccion disponibles | Si |

## 5. Modelo de negocio

### Actores

- Pinky: duenio y barbero
- Gabote: barbero contratado
- Memas Agency: socio de capital

### Contexto

- ciudad: Mar del Plata, Argentina
- moneda operativa: ARS
- una sola sucursal
- uso principal desde celular

### Regla clave

El sistema debe registrar todos los ingresos brutos que pasan por caja. Nunca solo "lo que queda para la casa".

## 6. Modelo financiero canonico

Esta seccion reemplaza cualquier formula ambigua anterior. Si otra parte del proyecto contradice estas reglas, esta seccion tiene prioridad.

### 6.1 Principios

- La comision del barbero se calcula sobre el precio final cobrado al cliente.
- La comision del medio de pago se calcula por separado y la absorbe la casa.
- Pinky no se liquida como empleado. Sus cortes alimentan su resultado personal.
- Gabote tiene comision variable y alquiler mensual de banco.
- Un mes negativo de Gabote no genera deuda acumulada ni saldo a favor de la casa para meses futuros. Se registra solo como resultado negativo de ese periodo.

### 6.2 Variables canonicas por servicio

```text
precio_lista_servicio =
  precio_vigente_servicio_snapshot
  + suma(adicionales_vigentes_snapshot)

precio_final_servicio =
  monto_real_cobrado_al_cliente

comision_medio_pago_monto =
  precio_final_servicio * porcentaje_medio_pago_snapshot

caja_neta_cobrada_servicio =
  precio_final_servicio - comision_medio_pago_monto
```

### 6.3 Servicios realizados por Gabote

```text
comision_gabote_monto =
  precio_final_servicio * 0.75

aporte_casa_por_servicio_gabote =
  precio_final_servicio
  - comision_gabote_monto
  - comision_medio_pago_monto
```

Interpretacion:

- Gabote gana 75% del precio final del servicio
- la casa retiene el 25% bruto menos el costo del medio de pago
- la comision del medio de pago no reduce la comision de Gabote

### 6.4 Servicios realizados por Pinky

```text
ingreso_neto_pinky_por_servicio =
  precio_final_servicio - comision_medio_pago_monto

aporte_casa_por_servicio_pinky = 0
```

Interpretacion:

- el corte de Pinky no entra en liquidacion de empleados
- ese ingreso va directo al resultado personal de Pinky
- la casa no toma un porcentaje adicional sobre sus cortes

### 6.5 Venta de productos

```text
venta_producto_bruta =
  cantidad * precio_venta_snapshot

comision_medio_pago_producto =
  venta_producto_bruta * porcentaje_medio_pago_snapshot

venta_producto_neta_caja =
  venta_producto_bruta - comision_medio_pago_producto

costo_producto =
  cantidad * costo_unitario_snapshot

margen_producto =
  venta_producto_bruta
  - comision_medio_pago_producto
  - costo_producto
```

Regla:

- la caja puede mostrar venta bruta y venta neta
- el resultado economico de la casa debe usar margen, no solo venta bruta

### 6.6 Cierre diario: dos vistas separadas

El cierre diario debe separar dos conceptos para evitar confusiones:

```text
caja_neta_del_dia =
  suma(caja_neta_cobrada_servicios)
  + suma(venta_producto_neta_caja)

aporte_economico_casa_del_dia =
  suma(aporte_casa_por_servicio_gabote)
  + suma(margen_producto)
  + alquiler_banco_devengado_dia
```

Para el cierre diario:

- `caja_neta_del_dia` responde "cuanto dinero neto entro"
- `aporte_economico_casa_del_dia` responde "cuanto aporto hoy la operacion al negocio"

Regla de prorrateo diario del alquiler:

```text
alquiler_banco_devengado_dia =
  alquiler_banco_mensual / dias_calendario_del_mes
```

Ese prorrateo es solo de visibilidad diaria. La liquidacion mensual usa el monto mensual completo.

### 6.7 Resultado mensual de la casa

```text
resultado_casa_mes =
  suma(aporte_casa_por_servicio_gabote)
  + suma(margen_producto)
  + alquiler_banco_mensual
  - gastos_fijos_mes
  - otros_gastos_mes
```

### 6.8 Resultado personal mensual de Pinky

```text
resultado_personal_pinky_mes =
  suma(ingreso_neto_pinky_por_servicio)
  + resultado_casa_mes
  - cuota_memas_mes
```

### 6.9 Liquidacion mensual de Gabote

```text
comision_bruta_mes_gabote =
  suma(comision_gabote_monto)

sueldo_garantizado_mes =
  sueldo_minimo_configurado o 0

base_liquidable_mes =
  max(comision_bruta_mes_gabote, sueldo_garantizado_mes)

resultado_liquidacion_mes =
  base_liquidable_mes
  - alquiler_banco_mensual
  + ajustes_mes

monto_a_pagar_gabote =
  max(resultado_liquidacion_mes, 0)

resultado_negativo_mes_gabote =
  min(resultado_liquidacion_mes, 0)
```

Regla de negocio:

- si el resultado da positivo, es monto a pagar
- si el resultado da negativo, se registra como mes negativo
- no se genera deuda
- no se arrastra saldo al siguiente mes

### 6.10 Snapshots obligatorios

Cada transaccion debe guardar snapshot de:

- precio del servicio al momento del cobro
- adicionales al momento del cobro
- porcentaje del medio de pago
- porcentaje de comision del barbero
- costo unitario del producto al momento de la venta

Esto garantiza reportes historicos correctos aunque cambien precios, costos o porcentajes.

## 7. Temporadas, precios y BEP

El sistema debe soportar estacionalidad real y comparacion contra el modelo financiero.

Temporadas base:

| Temporada | Periodo | Cortes/dia proyectados | Precio proyectado |
|---|---|---:|---:|
| Setup | Abril 2026 | 0 | - |
| Otono 2026 | Mayo-Junio 2026 | 15 | 13.000 |
| Invierno 2026 | Julio-Septiembre 2026 | 15 | 14.300 |
| Primavera 2026 | Octubre-Noviembre 2026 | 20 | 15.600 |
| Verano 2026/27 | Diciembre-Febrero 2027 | 25 | 19.500 |
| Otono 2027 | Marzo 2027 | 20 | 15.600 |

El cambio de precios por temporada se mantiene manual. No hay ajuste automatico en la fase actual.

## 8. Alcance por fases

El proyecto deja de hablar de "MVP". La referencia pasa a ser un sistema por fases.

### Fase 1 - Core Operations

Objetivo: sistema operativo real para abrir y gestionar el negocio desde el dia 1.

Incluye:

- autenticacion y roles
- configuracion de barberos, servicios, temporadas y medios de pago
- registro de caja diaria
- cierre de caja diario
- liquidaciones mensuales
- inventario
- repago Memas

### Fase 2 - Financial Control

Incluye:

- dashboard financiero
- P&L real vs proyectado
- comparativas de gastos
- exportables y reportes historicos
- opcional: tipo de cambio del cierre

### Fase 3 - Growth

Incluye solo si el negocio lo justifica:

- e-commerce online
- integracion contable avanzada
- automatizaciones y notificaciones

## 9. Fuera de alcance actual

- sistema de turnos para clientes
- app movil nativa
- multiples sucursales
- ajuste automatico de precios por temporada
- integracion AFIP en tiempo real
- e-commerce online en la fase actual
- automatizaciones por WhatsApp o push en la fase actual
- soporte offline

## 10. Requisitos no funcionales

### Uso

- mobile first
- interfaz touch-friendly
- compatible con desktop y tablet

### Performance

- registrar una atencion en menos de 30 segundos
- dashboard principal en menos de 2 segundos
- carga inicial en menos de 3 segundos sobre 4G razonable

### Seguridad

- autenticacion obligatoria
- autorizacion por roles
- RLS en PostgreSQL para separar datos de admin y barbero
- cierre diario inmutable una vez cerrado
- liquidaciones inmutables una vez emitidas, salvo reapertura administrativa con motivo

### Datos

- moneda: ARS
- montos en NUMERIC(12,2)
- historial de precios obligatorio
- reportes historicos con valores reales de su fecha
- timezone: America/Argentina/Buenos_Aires
- idioma: Espanol (Argentina)

## 11. Modulos funcionales

### 11.1 Configuracion del negocio

- CRUD de barberos
- CRUD de servicios
- historial de precios
- CRUD de temporadas
- CRUD de medios de pago
- CRUD de gastos fijos

### 11.2 Caja diaria

- registrar atenciones
- registrar descuentos manuales
- registrar ventas de productos
- recalcular en tiempo real antes de confirmar
- anular solo con permisos y motivo

### 11.3 Cierre diario

- resumen por medio de pago
- resumen por barbero
- separacion entre caja neta y aporte economico
- control de efectivo fisico vs sistema
- bloqueo de nuevas atenciones sobre un dia ya cerrado

### 11.4 Liquidaciones

- vista admin de liquidaciones
- vista personal del barbero
- calculo automatico mensual
- soporte de sueldo minimo
- soporte de alquiler banco
- registro de meses negativos sin deuda acumulada

### 11.5 Inventario

- productos
- entradas
- ventas desde caja
- ajustes
- stock minimo
- rotacion

### 11.6 Repago Memas

- valor de llave
- cuota mensual
- historial de cuotas
- saldo pendiente
- proyeccion de cancelacion

### 11.7 Dashboard financiero

- ingresos de casa
- resultado casa
- resultado personal de Pinky
- comparativa contra proyecciones
- BEP diario
- margen de productos

## 12. Criterios funcionales clave

El sistema debe garantizar:

- Gabote ve solo sus propios cortes y liquidaciones
- Pinky puede ver caja, negocio y resultado personal
- todos los calculos financieros relevantes suceden en servidor
- el sistema puede explicar cada total desde transacciones individuales
- ningun cambio de precio rompe la historia

## 13. Modelo de datos

Tablas principales:

- `barberos`
- `servicios`
- `servicios_adicionales`
- `servicios_precios_historial`
- `temporadas`
- `medios_pago`
- `atenciones`
- `atenciones_adicionales`
- `productos`
- `stock_movimientos`
- `cierres_caja`
- `categorias_gasto`
- `gastos`
- `liquidaciones`
- `repago_memas`
- `repago_memas_cuotas`

Campos criticos:

- snapshots de precio y porcentaje dentro de `atenciones`
- cierre de caja asociado a cada atencion cerrada
- costo historico por movimiento de stock

## 14. Stack aprobado

- frontend: Next.js 16.2.1 App Router
- runtime UI: React 19
- base de datos: Neon PostgreSQL
- ORM: Drizzle ORM + drizzle-kit
- auth: Better Auth
- deploy: Vercel
- UI: Tailwind CSS 4
- exportables: fase dedicada de PDF

Supabase queda oficialmente descartado para este proyecto.

## 15. Decisiones tomadas

- se separa PRD de plan y PRD vivo
- Supabase deja de aparecer como stack o referencia operativa
- offline deja de ser requisito
- el fee del medio de pago lo absorbe la casa
- la comision del barbero se calcula sobre el precio final cobrado
- un mes negativo de Gabote no genera deuda ni carry-forward
- el ajuste de precios por temporada sigue siendo manual

## 16. Documentos relacionados

- [PRD-Live](C:\Users\fran-\OneDrive\Escritorio\A51BARBERSHOP\docs\PRD-Live.md)
- `docs/plans/fase-1a-setup.md`
- `docs/plans/fase-1b-configuracion.md`
- `docs/plans/fase-1c-caja.md`
- `docs/plans/fase-1d-cierre.md`
- `docs/plans/fase-1e-liquidaciones.md`
- `docs/plans/fase-2a-dashboard.md`
- `docs/plans/fase-2b-memas.md`
- `docs/plans/fase-2c-pdf.md`
