# A51 Barber - Mapa de funcionalidades

Fecha de relevamiento: 2026-04-06
Base analizada: `a51-barber/`
Objetivo: darle a producto y UX un mapa de lo que ya existe, dónde está en el código y qué zonas todavía tienen deuda o cierre parcial.

## 1. Vista general del producto

La app no es una sola interfaz. Hoy está partida en 5 superficies principales:

1. Staff operativo barbero/admin
   Rutas base: `src/app/(barbero)` y `src/app/(admin)`
   Núcleo diario: hoy, caja, clientes, turnos, música.

2. Negocio / reporting admin
   Rutas base: `src/app/(admin)/dashboard`, `src/app/(admin)/negocio`, `src/app/(admin)/liquidaciones`, `src/app/(admin)/inventario`, `src/app/(admin)/repago`, `src/app/(admin)/configuracion`

3. Reserva pública
   Ruta base: `src/app/reservar/[slug]`
   Permite pedir turno sin login.

4. Pantalla pública del local
   Ruta base: `src/app/pantalla`
   Muestra canciones asociadas a llegadas y permite votación QR.

5. Portal cliente "Marciano"
   Ruta base: `src/app/marciano`
   Login, registro, recuperación y portal autenticado con perfil, turnos y beneficios.

## 2. Mapa funcional por dominio

### 2.1 Landing y acceso

- Landing pública
  Ruta: `src/app/page.tsx`
  Componentes: `src/components/landing/PublicLandingHero.tsx`, `src/components/landing/PublicLandingDetails.tsx`
  Estado: implementado.
  Comportamiento: si el usuario ya tiene sesión va a `/hoy`; si es marciano va a `/marciano`; si no, ve landing con CTA a reserva pública y login.

- Login staff
  Ruta: `src/app/login/page.tsx`
  Estado: implementado.

- Auth backend
  Ruta API: `src/app/api/auth/[...all]/route.ts`
  Soporte: `src/lib/auth.ts`, `src/lib/auth-client.ts`
  Estado: implementado.

### 2.2 Home operativo del staff

- Home "Hoy"
  Ruta: `src/app/(barbero)/hoy/page.tsx`
  Estado: implementado y bastante maduro.
  Incluye:
  - foco operativo del momento
  - movimientos recientes
  - alertas de turnos/stock/cierre
  - métricas rápidas del día
  - comando rápido para registrar atención express
  - resumen mensual personal si hay barbero vinculado

- Shell operativo y navegación por rol
  Layouts: `src/app/(barbero)/layout.tsx`, `src/app/(admin)/layout.tsx`
  Navegación: `src/components/navigation/RoleBottomNav.tsx`
  Estado: implementado.
  Secciones visibles desde nav: hoy, caja, clientes, turnos, música y negocio para admin.

### 2.3 Caja, atención y cierre diario

- Caja del día
  Ruta: `src/app/(barbero)/caja/page.tsx`
  Acciones: `src/app/(barbero)/caja/actions.ts`
  Componentes clave:
  - `src/components/caja/QuickCheckoutPanel.tsx`
  - `src/components/caja/AtencionForm.tsx`
  - `src/components/caja/VentaProductoForm.tsx`
  - `src/components/caja/CerrarCajaButton.tsx`
  - `src/components/caja/AnularButton.tsx`
  Estado: implementado.

- Nueva atención
  Rutas:
  - `src/app/(barbero)/caja/nueva/page.tsx`
  - `src/app/(barbero)/caja/@modal/(.)nueva/page.tsx`
  Estado: implementado.
  Nota: usa parallel routes + intercepting routes para abrir como modal desde caja.

- Venta de producto
  Rutas:
  - `src/app/(barbero)/caja/vender/page.tsx`
  - `src/app/(barbero)/caja/@modal/(.)vender/page.tsx`
  Estado: implementado.

- Edición de atención
  Ruta: `src/app/(barbero)/caja/[id]/editar/page.tsx`
  Estado: implementado.

- Cierre de caja
  Rutas:
  - `src/app/(barbero)/caja/cierre/page.tsx`
  - `src/app/(barbero)/caja/cierre/[fecha]/page.tsx`
  PDF: `src/app/api/pdf/cierre/[fecha]/route.ts`
  Componente PDF: `src/components/pdf/CierrePDF.tsx`
  Estado: implementado.

### 2.4 Clientes y memoria operativa

- Listado y búsqueda de clientes
  Ruta: `src/app/(barbero)/clientes/page.tsx`
  Componentes:
  - `src/components/clientes/ClientSearch.tsx`
  - `src/components/clientes/ClientCard.tsx`
  - `src/components/clientes/RetentionBanner.tsx`
  Estado: implementado.
  Incluye base visible, recientes y retención para admin.

- Alta de cliente
  Ruta: `src/app/(barbero)/clientes/nuevo/page.tsx`
  Componente: `src/components/clientes/ClientCreateForm.tsx`
  Estado: implementado.

- Perfil de cliente
  Ruta: `src/app/(barbero)/clientes/[id]/page.tsx`
  Componentes:
  - `src/components/clientes/ClientProfileHeader.tsx`
  - `src/components/clientes/ClientAvatarUploader.tsx`
  - `src/components/clientes/VisitHistory.tsx`
  - `src/components/clientes/ClientProfileAuditLog.tsx`
  - `src/components/clientes/MarcianosBriefing.tsx`
  Acciones: `src/app/(barbero)/clientes/actions.ts`
  Estado: implementado y profundo.
  Incluye:
  - edición de datos base
  - tags y preferencias
  - avatar
  - historial
  - auditoría
  - archivado
  - activación/quita de Marciano
  - lectura del estado del portal Marciano

- Post-corte
  Ruta: `src/app/(barbero)/clientes/[id]/post-corte/page.tsx`
  Componente: `src/components/clientes/PostCorteForm.tsx`
  Estado: implementado.

- APIs de clientes
  Rutas:
  - `src/app/api/clients/search/route.ts`
  - `src/app/api/clients/upload-photo/route.ts`
  - `src/app/api/clients/[id]/briefing/route.ts`
  Estado: implementado.

### 2.5 Turnos y agenda

- Agenda operativa
  Ruta: `src/app/(admin)/turnos/page.tsx`
  Acciones: `src/app/(admin)/turnos/actions.ts`
  Componentes:
  - `src/components/turnos/TurnoCard.tsx`
  - `src/components/turnos/QuickTurnoSlotCard.tsx`
  Estado: implementado.
  Incluye:
  - vista por fecha
  - filtros por estado
  - scope personal/equipo
  - timeline por bloques
  - quick create sobre slots libres
  - confirmar, rechazar, completar
  - evento "cliente llegó"

- Gestión de disponibilidad
  Ruta: `src/app/(admin)/turnos/disponibilidad/page.tsx`
  Componente: `src/components/turnos/DisponibilidadGrid.tsx`
  Estado: implementado.
  Incluye generación masiva de slots y borrado de slots no ocupados.

- Reserva pública
  Ruta: `src/app/reservar/[slug]/page.tsx`
  Componente: `src/components/turnos/ReservaForm.tsx`
  APIs:
  - `src/app/api/turnos/disponibles/route.ts`
  - `src/app/api/turnos/reservar/route.ts`
  Estado: implementado.
  Incluye elección de servicio, extras y solicitud de turno.

- Turnos para portal Marciano
  Rutas:
  - `src/app/marciano/(portal)/turnos/page.tsx`
  - `src/app/marciano/(portal)/turnos/nuevo/page.tsx`
  Componentes:
  - `src/components/marciano/MarcianoReservaForm.tsx`
  - `src/components/marciano/MarcianoTurnoCard.tsx`
  Soporte: `src/lib/marciano-turnos.ts`
  Estado: implementado.

### 2.6 Música del local

- Consola operativa de música
  Ruta: `src/app/(barbero)/musica/page.tsx`
  Componente principal: `src/components/musica/MusicOperationConsole.tsx`
  Componentes auxiliares:
  - `src/components/musica/MusicStateBadge.tsx`
  - `src/components/musica/BeatsStudio.tsx`
  Acciones: `src/app/(barbero)/musica/actions.ts`
  Soporte: `src/lib/music-engine.ts`, `src/lib/spotify-server.ts`, `src/lib/spotify-api.ts`, `src/lib/music-provider.ts`
  Estado: implementado pero no totalmente cerrado.
  Lo que sí existe:
  - modos Auto / Soy DJ / Jam
  - playlists
  - cola activa
  - búsqueda de tracks en Spotify
  - proposals desde turnos
  - controles pause/resume/skip
  - estado del runtime, provider y player

- Configuración de música
  Ruta: `src/app/(admin)/configuracion/musica/page.tsx`
  Componente: `src/components/configuracion/MusicConfigPanel.tsx`
  APIs:
  - `src/app/api/music/state/route.ts`
  - `src/app/api/spotify/callback/route.ts`
  - `src/app/api/spotify/refresh/route.ts`
  - `src/app/api/spotify/search-track/route.ts`
  - `src/app/api/youtube/search-beat/route.ts`
  Estado: implementado.
  Lo que maneja:
  - conexión Spotify
  - estado del player
  - sync del dashboard musical
  - configuración del negocio para música

- Pantalla musical pública
  Ruta: `src/app/pantalla/page.tsx`
  Ruta de voto: `src/app/pantalla/votar/[eventId]/page.tsx`
  APIs:
  - `src/app/api/turnos/pantalla-latest/route.ts`
  - `src/app/api/turnos/proximas-canciones/route.ts`
  - `src/app/api/turnos/ranking-canciones/route.ts`
  - `src/app/api/pantalla/votos/route.ts`
  - `src/app/api/pantalla/votos/[eventId]/route.ts`
  Estado: implementado.
  Incluye:
  - polling de última llegada
  - QR para votar canción
  - próximas canciones
  - ranking de canciones del mes

### 2.7 Negocio, métricas y reportes

- Dashboard admin
  Ruta: `src/app/(admin)/dashboard/page.tsx`
  Soporte: `src/lib/dashboard-queries.ts`, `src/lib/bep.ts`
  Estado: implementado.

- Flujo mensual
  Ruta: `src/app/(admin)/dashboard/flujo/page.tsx`
  Estado: implementado.

- P&L mensual
  Ruta: `src/app/(admin)/dashboard/pl/page.tsx`
  Exportaciones:
  - `src/app/api/export/csv/[mes]/route.ts`
  - `src/app/api/pdf/pl/[mes]/route.ts`
  Componente PDF: `src/components/pdf/PLPDF.tsx`
  Estado: implementado.

- Vista de temporadas
  Ruta: `src/app/(admin)/dashboard/temporadas/page.tsx`
  Estado: implementado.

- Portada de negocio
  Ruta: `src/app/(admin)/negocio/page.tsx`
  Estado: implementado y muy útil para UX porque resume prioridades reales del admin:
  - plata de hoy
  - pagos al equipo
  - stock crítico
  - gastos y cuotas
  - accesos de baja frecuencia

- Mi resultado
  Ruta: `src/app/(admin)/mi-resultado/page.tsx`
  Componentes:
  - `src/components/mi-resultado/ResultadoPersonal.tsx`
  - `src/components/mi-resultado/IngresosSummary.tsx`
  - `src/components/mi-resultado/EgresosSummary.tsx`
  Estado: implementado.

### 2.8 Inventario

- Lista principal
  Ruta: `src/app/(admin)/inventario/page.tsx`
  Acciones: `src/app/(admin)/inventario/actions.ts`
  Estado: implementado.

- Alta de producto
  Ruta: `src/app/(admin)/inventario/nuevo/page.tsx`
  Componente: `src/app/(admin)/inventario/_NuevoProductoForm.tsx`
  Estado: implementado.

- Detalle de producto y movimientos
  Ruta: `src/app/(admin)/inventario/[id]/page.tsx`
  Componente: `src/app/(admin)/inventario/[id]/_MovimientoForm.tsx`
  Estado: implementado.

- Edición de producto
  Ruta: `src/app/(admin)/inventario/[id]/editar/page.tsx`
  Estado: implementado.

- Rotación
  Ruta: `src/app/(admin)/inventario/rotacion/page.tsx`
  Estado: implementado.

### 2.9 Liquidaciones y pagos al equipo

- Listado y estado de liquidaciones
  Ruta: `src/app/(admin)/liquidaciones/page.tsx`
  Acciones: `src/app/(admin)/liquidaciones/actions.ts`
  Estado: implementado.

- Nueva liquidación
  Ruta: `src/app/(admin)/liquidaciones/nueva/page.tsx`
  Form principal: `src/app/(admin)/liquidaciones/nueva/_NuevaLiquidacionForm.tsx`
  Estado: implementado.

- Detalle e impresión de liquidación
  Ruta: `src/app/(admin)/liquidaciones/[id]/page.tsx`
  API PDF: `src/app/api/pdf/liquidacion/[id]/route.ts`
  Componente PDF: `src/components/pdf/LiquidacionPDF.tsx`
  Estado: implementado.

### 2.10 Gastos, repago y estructura del negocio

- Gastos rápidos
  Ruta: `src/app/(admin)/gastos-rapidos/page.tsx`
  Acciones: `src/app/(admin)/gastos-rapidos/actions.ts`
  Componentes:
  - `src/components/gastos-rapidos/GastoRapidoFAB.tsx`
  - `src/components/gastos-rapidos/GastoRapidoModal.tsx`
  - `src/components/gastos-rapidos/GastosHistorialModal.tsx`
  - `src/components/gastos-rapidos/CategoriaEmojiGrid.tsx`
  Estado: implementado.
  Observación: depende de una migración reciente; el código avisa si falta `db:push`.

- Gastos fijos
  Rutas:
  - `src/app/(admin)/configuracion/gastos-fijos/page.tsx`
  - `src/app/(admin)/configuracion/gastos-fijos/nuevo/page.tsx`
  - `src/app/(admin)/configuracion/gastos-fijos/[id]/editar/page.tsx`
  Estado: implementado.

- Repago Memas
  Ruta: `src/app/(admin)/repago/page.tsx`
  Acciones: `src/app/(admin)/repago/actions.ts`
  Form principal: `src/app/(admin)/repago/_RegistrarPagoForm.tsx`
  Estado: implementado.

### 2.11 Configuración maestra

- Barberos
  Rutas:
  - `src/app/(admin)/configuracion/barberos/page.tsx`
  - `src/app/(admin)/configuracion/barberos/nuevo/page.tsx`
  - `src/app/(admin)/configuracion/barberos/[id]/editar/page.tsx`
  Form: `src/components/configuracion/BarberoForm.tsx`
  Estado: implementado.

- Servicios
  Rutas:
  - `src/app/(admin)/configuracion/servicios/page.tsx`
  - `src/app/(admin)/configuracion/servicios/nuevo/page.tsx`
  - `src/app/(admin)/configuracion/servicios/[id]/editar/page.tsx`
  - `src/app/(admin)/configuracion/servicios/[id]/historial/page.tsx`
  Form: `src/components/configuracion/ServicioForm.tsx`
  Extras: `src/components/configuracion/AdicionalManager.tsx`
  Estado: implementado.

- Medios de pago
  Rutas:
  - `src/app/(admin)/configuracion/medios-de-pago/page.tsx`
  - `src/app/(admin)/configuracion/medios-de-pago/nuevo/page.tsx`
  - `src/app/(admin)/configuracion/medios-de-pago/[id]/editar/page.tsx`
  Form: `src/components/configuracion/MedioPagoForm.tsx`
  Estado: implementado.

- Temporadas
  Rutas:
  - `src/app/(admin)/configuracion/temporadas/page.tsx`
  - `src/app/(admin)/configuracion/temporadas/nuevo/page.tsx`
  - `src/app/(admin)/configuracion/temporadas/[id]/editar/page.tsx`
  Form: `src/components/configuracion/TemporadaForm.tsx`
  Estado: implementado.

- Navegación de configuración
  Componente: `src/components/configuracion/ConfNavBar.tsx`
  Estado: implementado.

### 2.12 Portal Marciano

- Portal autenticado
  Rutas:
  - `src/app/marciano/(portal)/page.tsx`
  - `src/app/marciano/(portal)/perfil/page.tsx`
  - `src/app/marciano/(portal)/seguridad/page.tsx`
  - `src/app/marciano/(portal)/turnos/page.tsx`
  - `src/app/marciano/(portal)/turnos/nuevo/page.tsx`
  Componentes:
  - `src/components/marciano/MarcianoProfileForm.tsx`
  - `src/components/marciano/MarcianoChangePasswordForm.tsx`
  Estado: implementado.

- Portal público Marciano
  Rutas:
  - `src/app/marciano/(public)/login/page.tsx`
  - `src/app/marciano/(public)/registro/page.tsx`
  - `src/app/marciano/(public)/recuperar/page.tsx`
  - `src/app/marciano/(public)/reset/page.tsx`
  Componentes:
  - `src/components/marciano/MarcianoRegisterForm.tsx`
  - `src/components/marciano/MarcianoPasswordRecoveryForm.tsx`
  - `src/components/marciano/MarcianoPasswordResetForm.tsx`
  Estado: implementado.

## 3. Qué tablas/modelos de negocio existen

El esquema de `src/db/schema.ts` confirma que el dominio está bastante desarrollado. Hoy hay soporte de datos para:

- autenticación y roles
- barberos
- servicios y adicionales
- historial de precios
- temporadas
- medios de pago
- atenciones de caja
- productos e inventario
- cierres de caja
- gastos
- liquidaciones
- repago
- configuración del negocio
- clientes
- turnos
- disponibilidad de turnos
- pantalla musical y votos
- historial de visitas
- auditoría de cambios en perfil
- uso de beneficios Marciano
- cache de briefing de cliente
- motor de música con players, modo, reglas, cola, runtime y eventos

Conclusión: no es una app "chica con algunas pantallas"; ya es una operación bastante modelada.

## 4. Funcionalidades que parecen maduras

Estas áreas se ven sólidas porque tienen ruta, UI, acciones y soporte de datos:

- home operativo del día
- caja con atención, venta, anulación y cierre
- agenda de turnos con confirmación/rechazo/completado
- disponibilidad para reservas
- gestión de clientes y perfil profundo
- inventario y movimientos
- liquidaciones
- reportes negocio/admin
- configuración de maestros
- portal Marciano completo de punta a punta
- pantalla pública de música/votación

## 5. Funcionalidades con cierre parcial o deuda visible

### 5.1 Música automática real todavía no está cerrada

Esta es la deuda más clara del sistema.

Evidencia:

- `src/app/(admin)/turnos/actions.ts`
  `clienteLlegoAction()` hoy genera evento para pantalla y `musicEvents`, pero no dispara reproducción real.

- `planning/features/music-auto-jam-completion.md`
  deja explícito que siguen pendientes:
  - que `Llego` reproduzca o encole de verdad
  - que Auto/Jam no dependan de refrescar `/musica`
  - takeover más consistente de DJ/Jam
  - control `previous`
  - mensajes de UI alineados con el estado real

Impacto UX:

- el diseñador no debería asumir que "llegó cliente => suena automáticamente" ya está resuelto.
- hoy conviene tratar música como sistema operativo avanzado, pero todavía con puntos de supervisión manual.

### 5.2 Configuración/migraciones de gastos rápidos puede quedar desalineada

Evidencia:

- `src/app/(admin)/gastos-rapidos/actions.ts`
  devuelve error si falta aplicar la migración de esa fase.

Impacto:

- hay feature implementada, pero depende de consistencia de entorno/base.

### 5.3 Reserva pública y textos con problemas de encoding

Evidencia:

- `src/app/reservar/[slug]/page.tsx`
  muestra caracteres corruptos en textos visibles.

Impacto:

- no es una falta funcional, pero sí una deuda importante antes de una pasada UX/UI fina.

### 5.4 Hay mezcla de madurez visual entre superficies

Evidencia:

- `planning/features/ui-second-wave-operations.md`
  marca gran parte de la segunda ola como implementada, pero todavía deja QA manual pendiente.

Impacto:

- para UX conviene revisar coherencia entre:
  - operación diaria
  - configuración
  - portal Marciano
  - reserva pública

## 6. Posibles huecos funcionales o preguntas para relevar

Estas no son "roturas seguras", pero sí zonas a validar con negocio/UX:

- Comunicación con cliente
  Hay soporte de email en `src/lib/email.ts`, pero no vi una superficie clara de notificaciones operativas o CRM saliente dentro de la app.

- Reprogramación de turnos
  Vi creación, confirmación, rechazo y completado. No vi una superficie explícita de "reprogramar turno" como flujo dedicado.

- Cancelación/gestión del turno desde el portal Marciano
  El portal permite ver y crear turnos, pero habría que validar si el cliente puede cancelar o mover uno ya tomado desde UI.

- Modo multi-sucursal o multi-negocio
  No aparece como preocupación actual. Todo está modelado para un solo local.

- Automatizaciones de retención
  Hay lectura de candidatos a retención, pero no vi flujo explícito de campaña/seguimiento/estado de contacto.

- Gestión de roles más granular
  Hoy la lógica visible está muy centrada en `admin`, `barbero` y `marciano`.

## 7. Recomendación para trabajo con UX/UI

Si entra un diseñador ahora, yo separaría el mapa en estas épicas o sistemas:

1. Operación diaria
   Hoy, caja, turnos, clientes, música.

2. Negocio y control
   Negocio, dashboard, flujo, P&L, liquidaciones, repago, gastos, inventario.

3. Configuración
   Barberos, servicios, medios de pago, temporadas, música.

4. Experiencia pública
   Landing, reserva pública, pantalla del local.

5. Experiencia cliente Marciano
   Auth, portal, turnos, perfil, seguridad, beneficios.

También conviene marcar tres niveles para cada pantalla:

- madura
- madura pero con deuda de UX/copy
- funcional pero parcialmente cerrada

Con el relevamiento actual, la única zona que hoy pondría claramente en "funcional pero parcialmente cerrada" es música.

## 8. Siguiente paso sugerido

Para que esto le sirva todavía más al diseñador, el siguiente entregable ideal sería una matriz por pantalla con:

- objetivo de negocio
- usuario
- frecuencia de uso
- CTA principal
- CTA secundarias
- inputs
- outputs
- estados vacíos
- estados de error
- dependencias externas

Ese segundo documento ya sería casi un inventario UX completo listo para rediseño.
