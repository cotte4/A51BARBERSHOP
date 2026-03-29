# A51 Barber - PRD Live

**Estado real del sistema**
Actualizado: 29/03/2026

## 1. Proposito del documento

Este documento describe el estado real y verificable del proyecto en este momento.

Incluye:

- stack implementado
- estado del build
- rutas existentes
- modulos presentes en el codigo
- advertencias tecnicas vigentes
- documentos operativos relacionados

No redefine producto ni reglas de negocio. Para eso, usar [PRD-Plan](C:\Users\fran-\OneDrive\Escritorio\A51BARBERSHOP\docs\PRD-Plan.md).

## 2. Estado general

Hay una aplicacion real en `a51-barber/`.

Verificacion realizada el 28/03/2026:

- `npm run build` ejecutado con exito
- compilacion OK
- TypeScript OK
- generacion de paginas OK

## 3. Stack verificado desde el codigo

Verificado en `a51-barber/package.json`:

- Next.js `16.2.1`
- React `19.2.4`
- React DOM `19.2.4`
- Neon `@neondatabase/serverless`
- Better Auth `1.5.6`
- Drizzle ORM `0.45.2`
- drizzle-kit `0.31.10`
- Tailwind CSS `4`
- TypeScript `5`

Conclusiones:

- la referencia a Next.js 14 estaba vieja
- cualquier referencia a Supabase esta vieja
- el stack vivo es Next.js 16.2.1 + Neon + Drizzle + Better Auth

## 4. Estructura real del proyecto

Directorios principales en `a51-barber/src`:

- `app`
- `components`
- `db`
- `lib`

Archivos de soporte detectados:

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/lib/caja-finance.ts`
- `src/lib/types.ts`
- `src/db/schema.ts`
- `src/db/seed.ts`
- `src/db/rls.sql`
- `src/proxy.ts`

## 5. Rutas verificadas por build

### Rutas principales

- `/dashboard`
- `/caja`
- `/caja/nueva`
- `/caja/[id]/editar`
- `/caja/cierre`
- `/caja/cierre/[fecha]`
- `/caja/vender`
- `/configuracion`
- `/configuracion/barberos`
- `/configuracion/gastos-fijos`
- `/configuracion/medios-de-pago`
- `/configuracion/servicios`
- `/configuracion/temporadas`
- `/inventario`
- `/inventario/nuevo`
- `/inventario/[id]`
- `/inventario/[id]/editar`
- `/inventario/rotacion`
- `/liquidaciones`
- `/liquidaciones/nueva`
- `/liquidaciones/[id]`
- `/repago`
- `/login`
- `/api/auth/[...all]`

### Estructura de permisos

- grupo admin: `src/app/(admin)`
- grupo barbero: `src/app/(barbero)`

## 6. Modulos presentes en codigo

### Configuracion

Implementado en:

- `src/app/(admin)/configuracion/barberos`
- `src/app/(admin)/configuracion/gastos-fijos`
- `src/app/(admin)/configuracion/medios-de-pago`
- `src/app/(admin)/configuracion/servicios`
- `src/app/(admin)/configuracion/temporadas`

### Caja

Implementado en:

- `src/app/(barbero)/caja`
- `src/app/(barbero)/caja/nueva`
- `src/app/(barbero)/caja/[id]`
- `src/app/(barbero)/caja/cierre`
- `src/app/(barbero)/caja/vender`

Estado verificado:

- el cierre diario ya separa `caja_neta_del_dia` de `aporte_economico_casa_del_dia`
- el cierre incluye ventas de productos en la caja neta del dia
- el aporte economico de la casa usa aporte por servicios + margen de productos + alquiler devengado del dia
- el resumen del cierre queda guardado como snapshot enriquecido en `resumenBarberos`

### Inventario

Implementado en:

- `src/app/(admin)/inventario`
- `src/app/(admin)/inventario/nuevo`
- `src/app/(admin)/inventario/[id]`
- `src/app/(admin)/inventario/[id]/editar`
- `src/app/(admin)/inventario/rotacion`

### Liquidaciones

Implementado en:

- `src/app/(admin)/liquidaciones`
- `src/app/(admin)/liquidaciones/nueva`
- `src/app/(admin)/liquidaciones/[id]`

Estado verificado:

- Pinky no aparece como barbero liquidable
- la liquidacion mensual toma `base_liquidable = max(comision, sueldo_minimo)`
- el alquiler de banco mensual se descuenta de esa base
- si el resultado del periodo es negativo, se registra como resultado negativo del mes
- no se genera deuda ni carry-forward para meses futuros

### Repago Memas

Implementado en:

- `src/app/(admin)/repago`
- `src/lib/amortizacion.ts`

Estado verificado (29/03/2026):

- cronograma de amortizacion alemana completo (12 cuotas, 10% anual, inicio Mayo 2026)
- barra de progreso, proyeccion de cancelacion, tabla de cuotas
- formulario con monto editable y tipo de cambio del dia
- historial con capital, interes y TC por cuota
- estado CANCELADO cuando saldo llega a 0

### Dashboard

Implementado en:

- `src/app/(admin)/dashboard` — KPIs dia y mes + widget BEP
- `src/app/(admin)/dashboard/pl` — P&L mensual detallado
- `src/app/(admin)/dashboard/flujo` — flujo diario de ingresos y egresos
- `src/app/(admin)/dashboard/temporadas` — comparativa proyectado vs real
- `src/lib/dashboard-queries.ts` — queries financieras con formulas canonicas del PRD
- `src/lib/bep.ts` — logica de punto de equilibrio

### PDFs exportables

Implementado en:

- `src/app/api/pdf/liquidacion/[id]` — PDF de liquidacion (Pinky: todas; Gabote: solo la propia)
- `src/app/api/pdf/cierre/[fecha]` — PDF de cierre de caja (solo admin)
- `src/components/pdf/LiquidacionPDF.tsx`
- `src/components/pdf/CierrePDF.tsx`
- `src/components/pdf/pdf-styles.ts`

Pendiente: PDF del P&L mensual (PLPDF) — no implementado en esta fase.

## 7. Verificacion tecnica

Resultado del build:

- compilacion: exitosa
- chequeo TypeScript: exitoso
- generacion de rutas: exitosa
- `src/proxy.ts` reemplaza la convencion vieja de `middleware.ts`
- `next.config.ts` ya fija `turbopack.root`

Advertencias encontradas durante build:

- no quedaron advertencias funcionales de Next sobre root de Turbopack ni sobre `middleware`
- el build sigue mostrando mensajes informativos de `dotenv`, pero no rompen compilacion ni tipado

## 8. Estado documental

Documentos que ya existen y siguen siendo utiles:

- `docs/plans/fase-1a-setup.md`
- `docs/plans/fase-1b-configuracion.md`
- `docs/plans/fase-1c-caja.md`
- `docs/plans/fase-1d-cierre.md`
- `docs/plans/fase-1e-liquidaciones.md`
- `docs/plans/fase-2a-dashboard.md`
- `docs/plans/fase-2b-memas.md`
- `docs/plans/fase-2c-pdf.md`
- `docs/qa/*.md`
- `docs/research/backend-stack.md`
- `docs/research/pdf-y-blob.md`

## 9. Limpieza realizada en la documentacion

La separacion nueva corrige estos problemas:

- el PRD deja de mezclar plan con estado vivo
- Supabase deja de aparecer como tecnologia vigente
- se elimina offline como requisito actual
- el producto deja de presentarse solo como MVP
- las formulas financieras pasan a tener una sola version canonica
- el codigo vivo ahora refleja la separacion entre caja neta diaria y aporte economico de la casa
- la liquidacion mensual viva ya respeta el mes negativo sin deuda ni arrastre

## 10. Reglas para mantener este documento

Actualizar este archivo cuando cambie cualquiera de estos puntos:

- version real del stack
- build status
- rutas implementadas
- modulos presentes
- advertencias tecnicas relevantes
- proximos pasos confirmados

No agregar aqui:

- ideas de producto futuras sin implementacion
- debate conceptual del negocio
- formulas nuevas no aprobadas

## 11. Proximos pasos recomendados

- agregar `costoUnitarioSnapshot` a `stock_movimientos` para ventas (KNOWN LIMITATION documentada en dashboard-queries.ts) — actualmente el margen de productos usa el costo actual, no historico
- PLPDF (P&L exportable como PDF) no fue implementado en Fase 2C — pendiente para iteracion futura
- mantener este documento como cierre de cada sesion importante

## 12. Fuente de verdad

Orden de verdad recomendado:

1. `docs/PRD-Plan.md`
2. `docs/PRD-Live.md`
3. `docs/plans/`
4. codigo real en `a51-barber/`
