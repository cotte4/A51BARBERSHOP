# A51 Barber - PRD Live

**Estado real del sistema**
Actualizado: 30/03/2026 (sesion 13)

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

Verificacion realizada el 30/03/2026:

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
- `src/lib/dashboard-queries.ts`
- `src/lib/admin-action.ts` — helper de validacion de sesion admin para Server Actions
- `src/lib/caja-access.ts` — helper de validacion de acceso de barbero en caja
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
- `/clientes`
- `/clientes/nuevo`
- `/clientes/[id]`
- `/clientes/[id]/post-corte`
- `/turnos`
- `/turnos/disponibilidad`
- `/reservar/[slug]`
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
- `/api/clients/search`
- `/api/clients/upload-photo`
- `/api/clients/[id]/briefing`
- `/api/turnos/disponibles`
- `/api/turnos/reservar`
- `/api/export/csv/[mes]`
- `/mi-resultado`
- `/gastos-rapidos`
- `/turnos`
- `/turnos/disponibilidad`
- `/reservar/[slug]`
- `/api/turnos/disponibles`
- `/api/turnos/reservar`

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

Estado verificado (29/03/2026 sesion 6):

- `configuracion/barberos/actions.ts` fue alineado con el tipado actual de `barberos.tipoModelo`
- crear y editar barberos vuelve a compilar correctamente con el schema vivo
- las mutaciones server-side de `barberos`, `gastos-fijos`, `medios-de-pago`, `servicios` y `temporadas` ahora validan sesion admin antes de escribir en DB
- `gastos-fijos` corrige la validacion de `frecuencia` para gastos recurrentes y el formulario ya muestra el error debajo del select correcto
- los toggles y mutaciones de edicion/eliminacion ya revalidan vistas dependientes para evitar pantallas stale en `caja/nueva`, `caja/vender`, `liquidaciones/nueva`, `inventario/rotacion`, `dashboard`, `dashboard/pl`, `dashboard/flujo` y `dashboard/temporadas`

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
- `caja/nueva` y `caja/[id]/editar` ahora bloquean a usuarios barbero sin `barberos.userId` activo vinculado
- `registrarAtencion` y `editarAtencion` validan server-side que un barbero solo pueda operar sobre su propio `barberoId`
- `AtencionForm` conserva el `precioCobrado` guardado al abrir una edicion y ya no lo pisa en el primer render por el auto-fill de servicio/adicionales

### Inventario

Implementado en:

- `src/app/(admin)/inventario`
- `src/app/(admin)/inventario/nuevo`
- `src/app/(admin)/inventario/[id]`
- `src/app/(admin)/inventario/[id]/editar`
- `src/app/(admin)/inventario/rotacion`

Estado verificado (29/03/2026 sesion 2):

- `stock_movimientos` tiene columna `costo_unitario_snapshot` (nullable)
- al registrar una venta desde caja, se guarda el `costoCompra` del producto como snapshot
- `dashboard-queries.ts` usa el snapshot historico para calcular margen; fallback al costo actual para filas previas
- los comentarios KNOWN LIMITATION fueron removidos

Estado verificado (29/03/2026 sesion 4):

- `/inventario/nuevo` dejo de ser una pagina cliente monolitica y ahora sigue el patron server page + client form usado en otros CRUD admin
- `crearProducto` ahora revalida `/inventario`, `/inventario/rotacion` y `/dashboard` antes del redirect para evitar UI stale despues de crear un producto

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

- `src/app/(admin)/dashboard` - KPIs dia y mes + widget BEP
- `src/app/(admin)/dashboard/pl` - P&L mensual detallado
- `src/app/(admin)/dashboard/flujo` - flujo diario de ingresos y egresos
- `src/app/(admin)/dashboard/temporadas` - comparativa proyectado vs real
- `src/lib/dashboard-queries.ts` - queries financieras con formulas canonicas del PRD
- `src/lib/bep.ts` - logica de punto de equilibrio

### VIP Clients + Marcianos

Implementado en:

- `src/app/(barbero)/clientes`
- `src/app/(barbero)/clientes/nuevo`
- `src/app/(barbero)/clientes/[id]`
- `src/app/(barbero)/clientes/[id]/post-corte`
- `src/app/api/clients/search`
- `src/app/api/clients/upload-photo`
- `src/app/api/clients/[id]/briefing`
- `src/components/clientes/*`
- `src/lib/client-queries.ts`
- `src/lib/marciano-config.ts`
- `src/db/schema.ts` - tablas `clients`, `visit_logs`, `client_profile_events`, `marciano_beneficios_uso`, `client_briefing_cache`

Estado verificado (30/03/2026 sesion 11):

- existe directorio interno de clientes bajo `/clientes` con alta, detalle y post-corte
- la busqueda de clientes funciona via route handler y respeta visibilidad por actor
- el perfil del cliente soporta tags, notas, archivado administrativo y audit log de cambios
- el registro post-corte soporta notas privadas, fotos via Vercel Blob y propina en estrellas
- la membresia Marciano se activa manualmente por admin y trackea beneficios usados por mes
- el briefing pre-corte existe solo para Marcianos, usa cache en DB e invalida por cambios de datos relevantes
- el banner de retencion usa `clients.last_visit_at`
- las dependencias `@vercel/blob` y `@anthropic-ai/sdk` ya estan instaladas en el proyecto

### Turnos + Accion Rapida

Implementado en:

- `src/app/reservar/[slug]`
- `src/app/api/turnos/disponibles`
- `src/app/api/turnos/reservar`
- `src/app/(admin)/turnos`
- `src/app/(admin)/turnos/disponibilidad`
- `src/app/(admin)/turnos/actions.ts`
- `src/components/turnos/*`
- `src/lib/turnos.ts`
- `src/lib/caja-atencion.ts`
- `src/db/schema.ts` - tablas `turnos`, `turnos_extras`, `turnos_disponibilidad`, `turnos_reserva_intentos`

Estado verificado (30/03/2026 sesion 12):

- existe link publico de reserva para Pinky en `/reservar/pinky`
- la disponibilidad publica sale de slots manuales y oculta horarios ya tomados por turnos pendientes o confirmados
- la reserva publica valida slug, fecha, horario y duracion; aplica rate limiting por IP; normaliza telefono y vincula `clientId` cuando hay match
- los turnos internos existen en `/turnos` con filtros por fecha/estado y acciones de confirmar, rechazar con motivo y completar
- `/turnos/disponibilidad` permite crear slots de 45 o 60 minutos y no deja eliminar slots ocupados por turnos confirmados o completados
- `src/proxy.ts` protege `/turnos` como superficie admin
- caja ahora tiene accion rapida con confirmacion previa y fallback al formulario completo cuando faltan defaults
- configuracion de barberos ahora permite definir servicio y medio de pago por defecto para la accion rapida

### PDFs exportables

Implementado en:

- `src/app/api/pdf/liquidacion/[id]` - PDF de liquidacion (Pinky: todas; Gabote: solo la propia)
- `src/app/api/pdf/cierre/[fecha]` - PDF de cierre de caja (solo admin)
- `src/app/api/pdf/pl/[mes]` - PDF del P&L mensual (solo admin; mes en formato YYYY-MM)
- `src/components/pdf/LiquidacionPDF.tsx`
- `src/components/pdf/CierrePDF.tsx`
- `src/components/pdf/PLPDF.tsx`
- `src/components/pdf/pdf-styles.ts`

La pagina `/dashboard/pl` tiene boton de descarga PDF en el header.

### CSV contador

Implementado en:

- `src/app/api/export/csv/[mes]` - CSV mensual descargable para contador (solo admin; mes en formato YYYY-MM)

La pagina `/dashboard/pl` tiene boton de descarga CSV en el header.

## 7. Verificacion tecnica

Resultado del build:

- `npm run db:push` ejecutado con exito el 30/03/2026 (sesion 13) — migration Fase 6 aplicada (tipo, categoria_visual en gastos)
- `npm run build` ejecutado con exito el 30/03/2026 (sesion 13)
- compilacion OK
- TypeScript OK
- generacion de paginas OK
- `src/proxy.ts` reemplaza la convencion vieja de `middleware.ts`
- `next.config.ts` ya fija `turbopack.root`
- el build incluye las rutas `/clientes`, `/clientes/[id]`, `/clientes/[id]/post-corte`, `/clientes/nuevo`, `/api/clients/search`, `/api/clients/upload-photo` y `/api/clients/[id]/briefing`
- el build incluye las rutas `/reservar/[slug]`, `/turnos`, `/turnos/disponibilidad`, `/api/turnos/disponibles` y `/api/turnos/reservar`

Advertencias encontradas durante build:

- no quedaron advertencias funcionales de Next sobre root de Turbopack ni sobre `middleware`
- `dotenv` removido de `db/index.ts` — Next.js carga `.env.local` automaticamente, el import manual causaba crash en cliente
- `gastos-rapidos.ts` separado en `gastos-rapidos.ts` (constantes, client-safe) y `gastos-rapidos-server.ts` (db-dependent, server-only) — previene que `db` se bundlee en el cliente
- QA Playwright verificado en produccion: dashboard, mi-resultado, FAB, registro de gasto rapido

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
- `docs/plans/fase-2d-costo-snapshot.md`
- `docs/plans/fase-2e-plpdf.md`
- `docs/plans/vip-clients.md` - Fase 4 (VIP Clients + Marcianos), implementada y verificada
- `docs/plans/fase-5-turnos.md` - Fase 5 (Turnos + One-click), implementada en codigo
- `docs/plans/fase-6-mi-resultado.md` - Fase 6 (Mi Resultado + Gastos Rapidos), draft
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

- Fase 2 funcionalmente completa y pusheada a GitHub (sesion 10, 30/03/2026)
- Fase 4 funcionalmente implementada y verificada por build (sesion 11, 30/03/2026)
- Fase 5 funcionalmente implementada y verificada por build (sesion 12, 30/03/2026)
- Fase 6 implementada, verificada por build y QA en produccion (sesion 13, 30/03/2026)
- **TODAS LAS FASES COMPLETAS** — sistema listo para operacion (deadline: mayo 2026)
- proximos pasos: seed de datos reales, capacitacion de usuarios (Pinky/Gabote), go-live

### Decisiones tomadas sobre Fase 3 (29/03/2026)

Research realizado. Las tres integraciones originales de Fase 3 fueron descartadas:

- **E-commerce:** no justificado para el volumen actual. Si surge demanda, TiendaNube sin codigo.
- **AFIP / contable:** monotributista con obligaciones minimas. El contador recibe CSV mensual del sistema.
- **WhatsApp / push:** complejidad y costo no justificados por ahora.

Fase 3 queda abierta para cuando el negocio lo justifique. No hay integraciones planificadas.

### Fase 4 - VIP Clients + Marcianos (implementada, 30/03/2026)

Plan base en `docs/plans/vip-clients.md`, ahora reflejado en codigo.

Estado confirmado:

- esquema de Fase 4 agregado al schema vivo
- permisos y writes alineados con el patron del repo via Server Actions
- uploads de fotos resueltos con Vercel Blob
- briefing de IA disponible para clientes Marcianos
- rutas de Fase 4 presentes en build de produccion

### Fase 5 - Turnos + One-click (implementada, 30/03/2026)

Plan base en `docs/plans/fase-5-turnos.md`, ahora reflejado en codigo.

Estado confirmado:

- esquema de Fase 5 agregado al schema vivo y aplicado a DB con `drizzle-kit push`
- link publico de reserva para Pinky disponible en `/reservar/pinky`
- turnos internos y disponibilidad manual presentes bajo `/turnos`
- rate limiting basico de reservas resuelto en DB
- accion rapida de caja disponible con defaults por barbero

## 12. Fuente de verdad

Orden de verdad recomendado:

1. `docs/PRD-Plan.md`
2. `docs/PRD-Live.md`
3. `docs/plans/`
4. codigo real en `a51-barber/`
