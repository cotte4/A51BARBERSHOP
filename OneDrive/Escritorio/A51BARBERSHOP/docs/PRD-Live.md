# A51 Barber - PRD Live

**Estado real del sistema**
Actualizado: 16/04/2026 (sesion 25)

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
- `/negocio`
- `/hoy`
- `/(barbero)/musica`
- `/(admin)/musica`
- `/(admin)/configuracion/musica`
- `/api/spotify/callback`
- `/api/spotify/refresh`
- `/api/spotify/search-track`
- `/api/youtube/search-beat`
- `/api/music/state`
- `/api/pantalla/votos`
- `/api/pantalla/votos/[eventId]`
- `/api/turnos/proximas-canciones`
- `/api/turnos/ranking-canciones`
- `/pantalla`
- `/pantalla/votar/[eventId]`

### Portal Marciano (Fase 7)

- `/marciano/login`
- `/marciano/registro`
- `/marciano` (dashboard VIP)
- `/marciano/turnos`
- `/marciano/turnos/nuevo`
- `/marciano/perfil`
- `/marciano/seguridad`
- `/marciano/recuperar`
- `/marciano/reset`

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
- `AtencionForm` incluye selector de productos dentro del mismo formulario de atencion: boton "+ Agregar producto" que despliega panel con stock, controles de cantidad +/-, subtotal en tiempo real; los productos se envian en el mismo submit que la atencion

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

### Prioridad Absoluta Marciano

Implementado en:

- `src/db/schema.ts` - campo `prioridad_absoluta` en tabla `turnos`
- `src/app/(admin)/turnos/actions.ts` - `confirmarTurnoAction` setea `prioridadAbsoluta = true` cuando `esMarcianoSnapshot = true`; `crearTurnoRapidoAction` setea prioridad si el cliente detectado es Marciano
- `src/app/(admin)/turnos/page.tsx` - franja separada de solicitudes Marciano pendientes al tope de la agenda
- `src/components/turnos/TurnoCard.tsx` - badge "PRIORIDAD" cuando `prioridadAbsoluta = true`
- `src/lib/turnos.ts` - `prioridadAbsoluta` incluido en `getTurnosVisibleList`
- `src/lib/types.ts` - `TurnoSummary` incluye `prioridadAbsoluta`

Estado verificado (02/04/2026 sesion 15):

- todos los acceptance criteria del plan `fase-marciano-prioridad.md` verificados en codigo

### Consumiciones Marciano en Caja

Implementado en:

- `src/db/schema.ts` - `es_consumicion` en `productos`, `client_id` en `atenciones`, `es_marciano_incluido` en `atenciones_productos`
- `src/components/caja/AtencionForm.tsx` - selector de cliente con busqueda; toggle "Marcar como incluida" / "Quitar beneficio" solo visible si el producto tiene `esConsumicion = true`, hay `clientId` y el cliente es Marciano
- `src/lib/caja-atencion.ts` - acepta `clientId`, valida elegibilidad del cliente y del producto, calcula delta y actualiza `marciano_beneficios_uso.consumiciones_usadas`
- `src/app/(barbero)/caja/actions.ts` - `registrarAtencion` y `editarAtencion` aceptan `clientId`
- `src/app/(barbero)/clientes/[id]/page.tsx` - estado Marciano muestra `consumicionesUsadas` ademas de `cortesUsados`

Estado verificado (02/04/2026 sesion 15):

- todos los acceptance criteria del plan `fase-marciano-consumiciones.md` verificados en codigo
- el feedback visual en el formulario incluye badge "N incluida(s)" y linea "Incluidas: X • ahorro $XXX" en el subtotal

### Pantalla Musical

Implementado en:

- `src/db/schema.ts` - tabla `pantalla_events` con `turnoId`, `cancion`, `clienteNombre`, `createdAt`
- `src/app/(admin)/turnos/actions.ts` - `clienteLlegoAction` valida turno confirmado con cancion e inserta en `pantalla_events`
- `src/app/api/turnos/pantalla-latest/route.ts` - endpoint GET con parametro `after` (timestamp ISO); devuelve el evento mas reciente posterior a ese instante; `Cache-Control: no-store`
- `src/app/pantalla/page.tsx` - Client Component con polling cada 3s; guarda `lastSeenCreatedAt` en `localStorage` para anti-replay; cuando llega evento nuevo abre Spotify via `window.open`; si popup bloqueado muestra CTA manual
- `src/components/turnos/TurnoCard.tsx` - boton "Llego" para turnos confirmados con cancion; link fallback "Poner cancion" con URL de busqueda de Spotify

Estado verificado (02/04/2026 sesion 15):

- todos los acceptance criteria del plan `fase-pantalla-musical.md` verificados en codigo
- se descarto SSE/WebSockets por incompatibilidad con Vercel serverless; polling cada 3s es el approach definitivo
- integracion con Web Playback SDK (reproduccion automatica real) evaluada y dejada como iteracion futura: requiere cuenta Premium + OAuth PKCE; research completo en `docs/plans/fase-pantalla-musical.md`

### Sistema Musical v3 — Music Engine

Implementado en (04/04/2026 sesion 16):

- `src/db/schema.ts` - tablas `music_provider_connections`, `music_players`, `music_mode_state`, `music_queue_sessions`, `music_queue_items`, `music_runtime_status`, `music_events`, `music_schedule_rules`
- `src/lib/music-engine.ts` - motor musical provider-agnostic: resuelve modo activo, siguiente item, estado de salud del provider
- `src/lib/music-types.ts` - tipos del sistema (`MusicDashboardState`, `MusicMode`, `MusicRuntimeState`, etc.)
- `src/lib/music-provider.ts` - interfaz comun de provider
- `src/lib/spotify-api.ts`, `src/lib/spotify-sdk.ts`, `src/lib/spotify-server.ts`, `src/lib/spotify-session.ts` - Spotify adapter
- `src/app/(admin)/musica/` y `src/app/(admin)/configuracion/musica/` - configuracion musical (admin)
- `src/app/(barbero)/musica/page.tsx` - pantalla de operacion musical del barbero
- `src/app/(barbero)/musica/actions.ts` - server actions: `setAutoModeAction`, `activateDjModeAction`, `activateJamModeAction`, `pauseMusicAction`, `resumeMusicAction`, `skipMusicAction`, `playPlaylistNowAction`, `queueTrackAction`, `syncMusicDashboardAction`
- `src/app/api/spotify/callback`, `src/app/api/spotify/refresh`, `src/app/api/spotify/search-track` - endpoints Spotify OAuth y busqueda
- `src/components/musica/MusicOperationConsole.tsx` - consola principal de operacion
- `src/components/musica/SpotifyStudio.tsx` - componente de control Spotify
- `src/components/musica/MusicStateBadge.tsx` - badge de estado del sistema
- `src/components/musica/SpotifyConnectButton.tsx` - boton de conexion OAuth
- `src/components/configuracion/MusicConfigPanel.tsx` - panel de configuracion musical

Estado (04/04/2026 sesion 16):

- arquitectura provider-agnostic implementada (Strategy C del plan `fase-musica-v3.md`)
- modos `Auto`, `Soy DJ` y `Jam` operativos desde la consola del barbero
- Spotify como provider inicial via OAuth; player esperado: celu del local con Spotify abierto
- estados `ready`, `degraded` y `offline` implementados con feedback visible en la consola

### Beats Mode (YouTube)

Implementado en (04/04/2026 sesion 16):

- `src/app/api/youtube/search-beat/route.ts` - busqueda server-side en YouTube Data API v3 (key segura, no expuesta al cliente); maxResults 50; filtra por categoria Music
- `src/components/musica/BeatsStudio.tsx` - componente de busqueda y reproduccion: genre chips (Trap, Boom Bap, Drill, Lo-Fi, R&B, Afrobeat, Reggaeton, Jazz), input libre, grilla de resultados con thumbnail/titulo/canal, reproductor iframe con autoplay
- `src/components/musica/MusicOperationConsole.tsx` - tab switcher "Spotify / Beats" al tope de la consola musical del barbero
- `.env.local` - `YOUTUBE_API_KEY` agregada (reutilizada del proyecto BeatFinder)

Scope implementado: buscar beats de YouTube y reproducirlos directamente desde la pantalla musical del barbero. Independiente del Music Engine por ahora.

`YOUTUBE_API_KEY` configurada en Vercel dashboard (15/04/2026).

### Portal Marciano (Fase 7)

Implementado en (05/04/2026 sesion 17):

- `src/app/marciano/` — route group propio con layout y nav del portal VIP
- `src/app/marciano/login/page.tsx`, `registro/page.tsx` — autenticacion separada para Marcianos
- `src/app/marciano/page.tsx` — dashboard: estado del mes, cortes/consumiciones usados, historial de visitas
- `src/app/marciano/turnos/page.tsx`, `turnos/nuevo/page.tsx` — reserva y listado de turnos propios
- `src/app/marciano/perfil/page.tsx`, `seguridad/page.tsx`, `recuperar/page.tsx`, `reset/page.tsx` — perfil y gestion de cuenta
- `src/proxy.ts` — rutas `/marciano/*` aisladas del resto, acceso solo para rol `marciano`

Estado verificado (05/04/2026 sesion 17):

- rol `marciano` agregado a Better Auth y validado en proxy
- vinculacion via `clients.email` + `clients.userId`
- si el admin desactiva la membresia, el acceso al portal queda revocado
- briefing pre-corte sigue siendo privado para barberos — no expuesto en el portal
- reserva reutiliza la logica de `turnos` existente con prefill de datos de sesion Marciana
- reprogramacion y cancelacion de turnos propios operativas

### Avatar Alien Trap — Marciano (sesion 19, 13/04/2026)

Implementado en:

- `src/lib/marciano-avatar.ts` — `generateAvatar()` via Replicate `easel/ai-avatars` (version pineada `27ebf241`) + upload a Vercel Blob
- `src/lib/types.ts` — campo `favoriteColor?: string` agregado a `InterrogatoryAnswers`
- `src/app/marciano/(portal)/estilo/_InterrogatorioFlow.tsx` — nueva pregunta 12 "color favorito" (FlowState `color-favorito`), barra de progreso a 12, pantalla saving con aviso de ~30s
- `src/app/marciano/(portal)/estilo/_Question.tsx` — nuevo tipo `choice-color` con swatches visuales
- `src/app/marciano/(portal)/estilo/_FaceCapture.tsx` — `onCapture` devuelve `frameBase64` ademas de shape y metrics
- `src/app/marciano/(portal)/estilo/actions.ts` — `saveStyleProfileAction` acepta `frameBase64` y `favoriteColor`, genera avatar post-save si `client.avatarUrl` es null
- `src/app/marciano/(portal)/page.tsx` — avatar card en dashboard cuando `client.avatarUrl` existe
- `REPLICATE_API_TOKEN` agregado en `.env.local` y Vercel dashboard

Estado verificado (13/04/2026):

- build limpio sin errores
- el avatar se genera una sola vez (idempotente: check `!client.avatarUrl`)
- si Replicate falla, el perfil igual se guarda sin error visible al usuario
- modelo elegido: `easel/ai-avatars` — licencia comercial ("production use"), descartados `fofr/face-to-sticker` y `tencentarc/photomaker` por licencia non-commercial
- costo estimado: ~$0.01-0.05/imagen, 100 imgs/mes = menos de $5/mes
- plan completo en `docs/plans/avatar-alien-marciano.md`

### Inbox Turnos Pendientes en Hoy (sesion 19, 13/04/2026)

- `src/app/(barbero)/hoy/_TurnosPendientesInbox.tsx` — nuevo componente para confirmar/rechazar turnos pendientes directamente desde la pagina Hoy
- `src/app/(barbero)/hoy/page.tsx` — integra `TurnosPendientesInbox` con filter de `turnosPendientes`
- `src/app/(admin)/turnos/page.tsx` — turnos Marciano pendientes con opacity reducida en grilla

### Cut Book Marciano

Implementado en (07/04/2026):

- galeria de fotos de cortes vinculada al perfil de cada cliente VIP en `/clientes/[id]/post-corte`
- foto upload via Vercel Blob corregido: loguea el error real de Blob en lugar de ocultarlo
- historial de cortes con fotos visible para el barbero antes del corte (briefing)

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

Estado verificado (02/04/2026 sesion 14):

- el formulario publico `/reservar/[slug]` incluye campo de sugerencia de cancion y selector de extras (productos del catalogo via checkboxes); los extras se guardan en `turnos_extras` al confirmar la reserva
- `TurnoCard` muestra badge fucsia "Marciano" cuando `turno.esMarcianoSnapshot` es `true`; el snapshot se guarda en `actions.ts` al momento de crear el turno desde la reserva publica

### Navegacion

Implementado en:

- `src/components/navigation/RoleBottomNav.tsx` — bottom nav unificado por rol (reemplaza AdminBottomNav que fue removido)
- `src/app/(admin)/negocio/page.tsx`

Estado verificado (04/04/2026 sesion 16):

- la navegacion es un bottom nav fijo con 6 tabs para barbero (Hoy, Caja, Clientes, Turnos, Musica, Progreso) y 6 tabs para admin (agrega Negocio)
- el tab "Negocio" agrupa todo lo que pertenece al rol de owner: dashboard, cierre, inventario, liquidaciones, mi-resultado, repago, configuracion, gastos-rapidos
- `/negocio` es un hub de links agrupados por categoria: Ventas y caja, Inventario, Barberos, Pagos, Configuracion
- esta estructura implementa la separacion PRD entre operacion del dia (Hoy/Caja/Clientes/Turnos) y gestion del negocio (Negocio), sin necesitar dos secciones literales en la nav
- `AdminBottomNav` removido del codebase — `RoleBottomNav` es la unica implementacion vigente

### Pagina Hoy (barbero)

Implementado en:

- `src/app/(barbero)/hoy/page.tsx` - hub de inicio del barbero: turnos del dia, acceso rapido a caja, resumen de la jornada
- `src/components/hoy/HoyActionStrip.tsx` - strip de acciones rapidas

Estado (04/04/2026 sesion 16):

- `/hoy` es la pantalla principal del barbero al iniciar el dia
- integra turnos visibles del actor, atenciones del dia y accion rapida de registro

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

### Micro-interacciones de Botones (sesion 22, 15/04/2026)

Implementado en:

- `src/app/globals.css` — 5 keyframes nuevos: `a51-spin`, `a51-btn-success`, `a51-btn-error`, `a51-check-draw`, `a51-btn-scale-in`
- `src/components/ui/ActionButton.tsx` — componente core reutilizable con state machine interna

`ActionButton` soporta dos modos:
- **Self-managed** (`onAction: () => Promise<void>`): maneja pending/success/error internamente, auto-reset
- **External** (`isPending` + `actionStatus`): renderiza el estado que pasa el padre desde `useActionState`

Variantes disponibles: `neon`, `ghost`, `danger`, `subtle`.

Estados visuales: spinner SVG (arco, no círculo genérico), checkmark animado con stroke-draw, X en error, ring pulse flash al resolver.

Botones actualizados:

- `configuracion/DeleteButton.tsx` — reescrito: dark theme correcto (antes usaba `bg-red-50 text-red-600`), `window.confirm` reemplazado por confirm inline dark-themed
- `configuracion/ToggleActivoButton.tsx` — reescrito: dark theme correcto (antes usaba `bg-emerald-50 text-emerald-700`), ahora usa `ActionButton`
- `caja/CerrarCajaButton.tsx` — spinner SVG agregado en estado pending
- `caja/AnularButton.tsx` — spinner SVG agregado en estado pending
- `liquidaciones/[id]/_MarcarPagadaButton.tsx` — spinner SVG agregado en estado pending
- `musica/SpotifyConnectButton.tsx` — spinner SVG agregado en estado pending

Estado verificado (15/04/2026):

- TypeScript limpio en todos los archivos modificados/creados
- `DeleteButton` y `ToggleActivoButton` ya no rompen el dark theme con clases light

### Historial de Cortes + Progreso del Barbero (sesion 23, 16/04/2026)

Implementado en:

- `src/db/schema.ts` — tabla `barber_cuts_log` con índice `(barberoId, fecha)`
- `src/lib/barber-progress.ts` — `getLevel(totalCuts)`: Rookie (0–49) → Junior (50–149) → Senior (150–299) → Master (300+)
- `src/app/(barbero)/mi-progreso/page.tsx` — nivel badge, barra de progreso, grid de últimos 20 cortes con fotos
- `src/app/(barbero)/mi-progreso/nuevo/page.tsx` — wrapper server component con auth check
- `src/app/(barbero)/mi-progreso/nuevo/_NuevoCorteForm.tsx` — form cliente: servicio, cliente (opcional), fecha, notas, foto con preview y validación 5MB
- `src/app/(barbero)/mi-progreso/nuevo/actions.ts` — `registrarCorteAction`: upload a Vercel Blob path `barber-cuts/{barberoId}/{timestamp}.jpg`, insert en DB, revalidate + redirect
- `src/components/navigation/RoleBottomNav.tsx` — tab "Progreso" (TrophyIcon) agregado al array de barbero; barbero pasa a `grid-cols-6` igual que admin

Rutas nuevas:
- `/mi-progreso`
- `/mi-progreso/nuevo`

### Portfolio del Barbero en la Landing (sesion 23, 16/04/2026)

Implementado en:

- `src/db/schema.ts` — tabla `barbero_portfolio_items` con `barberoId`, `fotoUrl`, `caption`, `orden`
- `src/app/(admin)/configuracion/barberos/[id]/editar/actions.ts` — `subirFotoPortfolioAction` (upload múltiple a Blob, límite 12, max 8MB/foto) + `eliminarFotoPortfolioAction`; ambas con `requireAdminSession()`
- `src/app/(admin)/configuracion/barberos/[id]/editar/_PortfolioAdmin.tsx` — grid de fotos, form upload múltiple, contador N/12, botón eliminar, `router.refresh()` post-upload
- `src/app/(admin)/configuracion/barberos/[id]/editar/page.tsx` — query portfolio en `Promise.all`, render `_PortfolioAdmin` debajo del form existente
- `src/components/turnos/PortfolioGallery.tsx` — grid 2/3 cols con `next/image` y captions
- `src/app/reservar/[slug]/page.tsx` — query portfolio items en `Promise.all`, sección condicional entre el hero y el form de reserva

### Activos del Local (sesion 23, 16/04/2026)

Implementado en:

- `src/db/schema.ts` — tabla `barber_shop_assets` (nombre, categoria, precioCompra, fechaCompra, proveedor, notas, estado)
- `src/app/(admin)/negocio/activos/actions.ts` — `crearAssetAction` + `darDeBajaAssetAction`; categorías: Mobiliario, Equipamiento, Iluminación, Herramientas, Tecnología, Otros
- `src/app/(admin)/negocio/activos/nuevo/_NuevoAssetForm.tsx` — form cliente con 6 campos
- `src/app/(admin)/negocio/activos/nuevo/page.tsx` — wrapper server component con auth check
- `src/app/(admin)/negocio/activos/page.tsx` — resumen total invertido + desglose por categoría (clickeable como filtro URL), lista completa con badge estado, botón "Dar de baja"
- `src/app/(admin)/negocio/activos/_DarDeBajaButton.tsx` — botón cliente para baja sin borrar registro
- `src/app/(admin)/negocio/page.tsx` — link "Equipamiento" agregado a `utilityLinks`

Rutas nuevas:
- `/negocio/activos`
- `/negocio/activos/nuevo`

Migración `0012_salty_santa_claus.sql` aplicada a Neon (db:push 16/04/2026).

### Nav Dividida para Pinky — Admin+Barbero (sesion 25, 16/04/2026)

Implementado en:

- `src/components/navigation/RoleBottomNav.tsx` — nav admin rediseñada: 6 ítems en 2 grupos separados por divisor vertical. Grupo operativo: Hoy, Caja, Cierre, Gasto. Grupo gestión: Gestión (dashboard+), Config. Barbero sin cambios.
- `src/proxy.ts` — redirect admin desde `/` va a `/hoy` (no `/dashboard`) porque Pinky es admin+barbero y `/hoy` es su pantalla de entrada diaria.

Concepto validado: Pinky tiene rol admin Y barbero. Gabote solo barbero. Was es asesor.

### Vista Hoy — HoyDashboard (sesion 24-25, 16/04/2026)

Implementado en:

- `src/app/(barbero)/hoy/_HoyDashboard.tsx` — reescritura completa como Client Component con layout full-screen mobile-first
- `src/app/(barbero)/hoy/page.tsx` — server component delegando a HoyDashboard
- `src/app/(barbero)/hoy/_TurnosPendientesInbox.tsx` — `TurnoConAcciones` exportada como tipo público

Layout: barra superior (fecha + KPIs del día), botón COBRAR dominante (abre overlay), grid 2 columnas (TURNOS + MÚSICA), footer con próximo turno. Sin scroll en la vista principal.

### QuickCheckoutPanel — Drum Picker + Propina (sesion 25, 16/04/2026)

Implementado en:

- `src/components/caja/QuickCheckoutPanel.tsx` — reescritura completa

Cambios:
- **Drum picker de precio**: scroll vertical con `scroll-snap-type: y mandatory`, saltos de $500 ARS, estilo iOS alarm clock. Ítems adyacentes dimados (40%/18% opacity, scale 88%/76%). Se inicializa en el precio base del servicio seleccionado y se regenera con `useMemo` al cambiar de servicio.
- **4 boxes de medio de pago**: grid 2×2 en lugar del cycler. El activo resaltado en verde.
- **Display de propina**: cuando `precio > basePrice` aparece `Corte $X.XXX + Propina $X.XXX` en ámbar debajo del drum.

### Comisión Gabote — Solo sobre Precio Base (sesion 25, 16/04/2026)

Implementado en:

- `src/lib/caja-atencion.ts` — `baseParaComision = Math.min(precioCobrado, servicio.precioBase)`. La comisión del barbero se calcula sobre el precio base del servicio, no sobre la propina. Si el cliente paga propina, esa diferencia no entra en el 60% de Gabote.

### Formato de Fechas DD/MM/YYYY (sesion 25, 16/04/2026)

Corregidos 5 archivos que usaban formateo manual o timezone incorrecto, reemplazados por `formatFecha()` de `@/lib/fecha`:

- `configuracion/gastos-fijos/page.tsx`
- `configuracion/temporadas/page.tsx`
- `configuracion/servicios/[id]/historial/page.tsx`
- `negocio/activos/page.tsx`
- `finanzas/page.tsx`

## 7. Verificacion tecnica

Resultado del build:

- `npm run db:push` ejecutado con exito el 30/03/2026 (sesion 13) — migration Fase 6 aplicada (tipo, categoria_visual en gastos)
- `npm run build` ejecutado con exito el 30/03/2026 (sesion 13) — ultimo build verificado explicitamente
- compilacion OK, TypeScript OK, generacion de paginas OK a partir de sesion 13
- `src/proxy.ts` reemplaza la convencion vieja de `middleware.ts`
- `next.config.ts` ya fija `turbopack.root`
- el build incluye las rutas `/clientes`, `/clientes/[id]`, `/clientes/[id]/post-corte`, `/clientes/nuevo`, `/api/clients/search`, `/api/clients/upload-photo` y `/api/clients/[id]/briefing`
- el build incluye las rutas `/reservar/[slug]`, `/turnos`, `/turnos/disponibilidad`, `/api/turnos/disponibles` y `/api/turnos/reservar`

Advertencias encontradas durante build:

- no quedaron advertencias funcionales de Next sobre root de Turbopack ni sobre `middleware`
- `dotenv` removido de `db/index.ts` — Next.js carga `.env.local` automaticamente, el import manual causaba crash en cliente
- `gastos-rapidos.ts` separado en `gastos-rapidos.ts` (constantes, client-safe) y `gastos-rapidos-server.ts` (db-dependent, server-only) — previene que `db` se bundlee en el cliente
- QA Playwright verificado en produccion: dashboard, mi-resultado, FAB, registro de gasto rapido

Fixes aplicados post-sesion 17 (07-08/04/2026):

- bug UTC medianoche corregido en todos los formatters de fecha del codebase — `new Date("YYYY-MM-DD")` parsea como UTC y mostraba el dia anterior en Argentina; corregido con formateo explicito en zona horaria `America/Argentina/Buenos_Aires`
- UI de turnos: toolbar compacta + timeline denso — reduccion de ruido visual sin cambios funcionales
- `CLAUDE.md` actualizado en sesion 18 con seccion de Arquitectura: route groups, nav, auth, lib files, Music Engine, fecha/timezone, Marciano

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
- `docs/plans/go-live-seed-capacitacion.md` - preparacion operativa pre go-live (seed real + validacion + capacitacion)
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
- Prioridad Absoluta Marciano, Consumiciones Marciano y Pantalla Musical verificadas en codigo (sesion 15, 02/04/2026)
- Music Engine v3 (Strategy C), Beats Mode (YouTube), pagina Hoy y redesign UI implementados (sesion 16, 04/04/2026)
- Fase 7 - Portal Marciano implementado con routes, autenticacion, dashboard VIP, reservas y gestion de cuenta (sesion 17, 05/04/2026)
- Cut Book Marciano, redesign Post-Corte, fix Date UTC medianoche, UI diet en Turnos (post-sesion 17, 07/04/2026)
- Music Engine v3 modular split (post-sesion 17, 07/04/2026)
- CLAUDE.md actualizado con seccion de Arquitectura (sesion 18, 08/04/2026)
- **TODAS LAS FASES COMPLETAS** — sistema listo para operacion (deadline: mayo 2026)
- Avatar Alien Trap para Marcianos implementado y deployado (sesion 19, 13/04/2026)
- Inbox de turnos pendientes en Hoy implementado y deployado (sesion 19, 13/04/2026)
- UI polish gastos-rapidos y repago, panel asesor documentado (sesion 20, 15/04/2026)
- Panel asesor verificado en detalle: reportes P&L/Flujo/Temporadas revisados; link "Administrar temporadas" agregado; P&L identificado como incompleto — pendiente revision (sesion 21, 15/04/2026)
- P&L y Flujo mensual correctamente mapeados: cuota Memas vinculada al repago real, costos fijos integrados desde ambas fuentes, TC configurable (sesion 22, 15/04/2026)
- proximos pasos: seed de datos reales; capacitacion de usuarios (Pinky/Gabote); go-live
- siguiente plan operativo: `docs/plans/go-live-seed-capacitacion.md`
- `YOUTUBE_API_KEY` ya configurada en Vercel dashboard (15/04/2026)
- iteracion futura opcional: integrar Beats Mode al Music Engine (colas, modos); Web Playback SDK para reproduccion automatica en pantalla musical; notificaciones de turno para Marcianos (Resend)
- iteracion futura avatar: pin de version Replicate a actualizar cuando salga version nueva; opcion de reset de avatar desde panel admin; mostrar avatar en StyleDNAReveal; ajuste de prompt si resultado no es suficientemente cartoon (migrar a fal.ai IP-Adapter si necesario)

### Sesion 22 — P&L y Flujo correctamente mapeados (15/04/2026)

**P&L — Cuota Memas**

- `cuotaMensual` hardcodeado en seed ($400.000) reemplazado por logica real
- si la cuota del mes ya fue pagada → usa `montoPagado` de `repagoMemasCuotas` (ARS real)
- si no → proyecta `cuotaTotal` del cronograma de amortizacion × `tcReferencia`
- `tcReferencia` (default 1400) ahora vive en `configuracion_negocio` como campo configurable
- migration `0011_add_tc_referencia.sql` aplicada en Neon

**P&L — Costos operativos**

- P&L antes solo leia tabla `gastos` (gastos rapidos)
- ahora suma tambien `costos_fijos_valores` via inner join con `costosFijosNegocio`
- cada costo fijo entra con su categoria real (alquiler, sueldos, servicios, etc.)
- ambas fuentes se mezclan en el mismo `categoriaMap` y total `gastosFijosMes`

**Flujo mensual — Costos fijos**

- `getFlujoMensual` antes solo incluia gastos rapidos como egresos
- ahora suma los costos fijos del mes e imputa el total el dia 1 (convencion correcta para gastos mensuales sin fecha especifica)

**Visual — Navegacion P&L**

- "← Dashboard" rediseñado como pill con SVG chevron, borde sutil, hover verde
- "Anterior / Siguiente" rediseñados con `rounded-[20px]`, SVG arrows, hover brand green
- mes central levemente mas grande (`text-base font-bold`)

### Sesion 21 — Review Panel Asesor + fix menor Temporadas (15/04/2026)

- Revision detallada de los 3 reportes del panel asesor: P&L, Flujo mensual, Temporadas
- P&L identificado como incompleto: estructura confusa, "Cuota Memas" sin contexto — pendiente reescritura
- Flujo mensual: correcto, solo lectura, depende de cierres diarios
- Temporadas: link "Administrar temporadas" agregado al pie de la lista (antes solo aparecia en estado vacio)
- Pendiente sesion siguiente: redisenar P&L con estructura mas clara y completa

### Sesion 20 — Panel Asesor + UI Polish (15/04/2026)

**Panel Asesor (Was)**

- rol `asesor` ya existia en Better Auth pero no estaba documentado en el PRD
- el panel asesor es una vista reducida del admin con acceso a: Dashboard, Liquidaciones, Finanzas, Configuracion
- acceso controlado por `src/proxy.ts` y `src/lib/asesor-action.ts`
- rutas compartidas con admin — el asesor ve las mismas paginas pero sin tabs operativos (Inventario, Negocio, etc.)
- nav del asesor: 4 tabs renombrados — **Hoy** (`/dashboard`), **Resultado** (`/mi-resultado`), **Costos** (`/finanzas`), **Ajustes** (`/configuracion`) — Liquidaciones reemplazada por Resultado (sesion 21)
- creacion de cuenta asesor: correr `npx tsx src/db/create-asesor-user.ts` con `.env.local` configurado (o `WAS_PASSWORD=xxx npx tsx ...` para password custom). Crea o actualiza el usuario `contact@memas.agency` con rol `asesor`. El script es idempotente — si ya existe, actualiza password y rol sin romper nada.

**Decision de negocio confirmada (sesion 21, 15/04/2026)**

- Gabote cobra **60%** de cada atencion; la casa retiene **40%** (menos fees de medio de pago)
- No hay alquiler fijo mensual para Gabote — el 40% de retencion compensa esa diferencia
- El codigo en `src/lib/bep.ts` ya usaba 40% correctamente; el PRD y la skill a51-qa tenian un error (decian 75%/25%) — corregido en esta sesion

**UI Polish — Gastos Rapidos**

- `CategoryChip` rediseñado: pills compactos (`min-h-[40px]`, `rounded-full`), solo emoji + label visible, count y total en `title` tooltip nativo
- `CategoriaEmojiGrid`: `grid-cols-4` siempre (antes `grid-cols-2 sm:grid-cols-4`), labels truncadas antes del "/", botones `min-h-[52px]`
- `GastoRapidoModal` simplificado: eliminado hero card con SummaryCards, eliminado aside "Lectura rapida/Estado", layout columna unica, `max-w-lg`, nota reducida a 2 rows, botones full-width
- Boton "Ver gastos" eliminado del FAB cuando esta embebido en la misma pagina (`showHistoryLink={false}`)
- Bug fix: `topCategory` mostraba "Cafe / capsulas $0" sin datos — corregido con `.find(c => c.total > 0)`

**UI Polish — Repago**

- `_RegistrarPagoForm` simplificado: eliminado layout de dos columnas anidado que causaba overlap, eliminado aside "Resumen previo" y "Checklist", eliminadas MiniMetrics redundantes (ya visibles en la pagina), eliminado header duplicado
- Preview inline USD→ARS: aparece solo cuando ambos campos tienen valor (`u$d X × $TC → $ARS`)
- Formulario ahora es columna unica: 3 botones rapidos + monto + TC con pills + nota + submit
- Bug data: `repago_memas.cuotas_pagadas = 1` con `repago_memas_cuotas` vacia por registro de prueba — resuelto via SQL en Neon (15/04/2026)

### Fase 7 - Portal Marciano (expandida, 05/04/2026)

Portal separado para clientes VIP (Marcianos). Estado actual:

**Acceso**

Implementado en esta iteracion:

- rol `marciano` agregado a Better Auth
- registro separado en `/marciano/registro`
- vinculacion via `clients.email` + `clients.userId`
- aislamiento de rutas Marciano por `proxy.ts`
- Los Marcianos se registran solos con email y contraseña
- Login en ruta separada: `/marciano/login`
- Al activarse como Marciano por el admin, el cliente puede crear su cuenta linkando por email
- Si el admin desactiva el status Marciano, el acceso al portal se revoca

**Que pueden ver**

Implementado en esta iteracion:

- dashboard `/marciano` con estado del mes
- historial reciente de visitas
- catalogo de servicios y productos del local
- el briefing pre-corte sigue privado para barberos
- Su estado Marciano del mes: cortes usados, consumiciones restantes
- Historial de visitas
- Catalogo de servicios y productos del local
- El briefing pre-corte es privado (solo visible para barberos)

**Que pueden hacer**

Implementado en esta iteracion:

- reservar turno dentro del portal en `/marciano/turnos/nuevo`
- reservar con datos precompletados desde la sesion Marciana
- ver proximos turnos propios en `/marciano/turnos`
- reprogramar turnos propios
- cancelar turnos propios
- editar su perfil en `/marciano/perfil`
- cambiar su contrasena en `/marciano/seguridad`
- pedir recuperacion de contrasena en `/marciano/recuperar` y resetearla en `/marciano/reset`

**Scope activo ya implementado para Portal Marciano**

- integrar el flujo de reserva dentro de `/marciano/*`
- prellenar la reserva con datos de la sesion Marciana
- mostrar proximos turnos propios
- permitir reprogramar turnos propios
- permitir cancelar turnos propios
- agregar recuperacion y cambio de contrasena

**Diferido para una etapa posterior**

- notificaciones basicas de confirmacion y recordatorio

**Fuera del scope inmediato de Portal Marciano**

- extras musicales o preferencia de cancion como experiencia propia del portal
- biblioteca de disenos exclusivos dentro del portal
- sorteos operativos dentro del portal

**Estructura tecnica**

Implementado en esta iteracion:

- grupo de rutas `src/app/marciano/*`
- layout propio para el portal Marciano
- schema ampliado con `clients.email` y `clients.userId`
- la reserva sigue reutilizando la logica existente de `turnos`

**Estructura tecnica propuesta**
- Nuevo route group `(marciano)` con su propio layout y nav
- Nuevo rol `'marciano'` en better-auth (sin acceso a rutas de barbero ni admin)
- `clients` ya existe en DB — solo se agrega `userId` para linkear al account
- La reserva de turno reutiliza la logica existente de `turnos`

**Decisiones de onboarding y coexistencia (04/04/2026)**
- Onboarding: el admin activa al Marciano ingresando su email; el sistema crea la cuenta y el cliente recibe acceso
- `/reservar/[slug]` y el portal Marciano conviven: el link del barbero es para cualquier cliente, el portal es exclusivo para Marcianos autenticados
- Requiere configurar envio de emails transaccionales — proveedor elegido: Resend (pendiente, no es prioridad ahora)

---

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

## 11.bis Pendientes / backlog QA

- **Auditoria de CTAs por rol en `/hoy`** — pendiente. Stub en `docs/qa/hoy-roles-audit.md`. Bloquea el rename de copys de `/hoy` definido en `docs/qa/cta-navigation-audit.md` v1.2 (decision #5). Necesario antes de implementar los cambios de prioridad alta sobre `/hoy`.

## 12. Fuente de verdad

Orden de verdad recomendado:

1. `docs/PRD-Plan.md`
2. `docs/PRD-Live.md`
3. `docs/plans/`
4. codigo real en `a51-barber/`
