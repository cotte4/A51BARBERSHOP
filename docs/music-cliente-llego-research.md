# Research: automatizar "cliente llegó y suena"

Fecha: 2026-04-06
Objetivo: definir cómo llevar el flujo actual desde "propuesta visible" a "automatización real y confiable".

## Resumen ejecutivo

Hoy el sistema ya tiene casi todas las piezas técnicas para reproducir música:

- `turnos` guarda `spotifyTrackUri`
- `clienteLlegoAction()` emite eventos
- el motor musical sabe:
  - detectar provider/player
  - reproducir playlists
  - reproducir tracks
  - encolar tracks
  - alternar Jam
  - volver de Jam a Auto

Lo que falta no es "integración con Spotify desde cero". Falta unir dos contratos:

1. el evento operativo de llegada
2. la decisión automática de qué hacer según el modo actual

La propuesta recomendada es:

- convertir `clienteLlegoAction()` en un trigger musical real
- agregar una capa explícita de `handleClienteLlego(...)` dentro de `music-engine`
- distinguir resultado operativo real:
  - playback_started
  - queued_in_jam
  - proposal_created
  - waiting_for_recovery
  - missing_track_uri
- usar `syncMusicEngine()` como cierre del flujo, pero no como único disparador del runtime
- dejar un heartbeat liviano como red de seguridad, no como dependencia principal

## Estado actual en código

### 1. El evento de llegada existe, pero hoy no reproduce

Archivo: `src/app/(admin)/turnos/actions.ts`

La función `clienteLlegoAction()` hoy:

- valida que el turno exista y esté confirmado
- toma `sugerenciaCancion`
- inserta un registro en `pantallaEvents`
- inserta un `musicEvents` con:
  - `eventType: "turno.cliente_llego"`
  - `spotifyTrackUri`
  - `proposalStatus: "pending"`

Pero no hace ninguna de estas cosas:

- no llama a `queueTrack()`
- no llama a `spotifyAdapter.play()`
- no decide según `auto` / `dj` / `jam`
- no dispara takeover inmediato

Conclusión: hoy "cliente llegó" crea visibilidad, no automatización.

### 2. El motor musical ya tiene primitives suficientes

Archivo: `src/lib/music-engine.ts`

Ya existen estas capacidades:

- `syncMusicEngine()`
- `ensureAutoPlayback(deviceId)`
- `dispatchQueuedItems(mode, deviceId)`
- `activateDjMode(...)`
- `activateJamMode(...)`
- `setAutoMode(...)`
- `queueTrack(...)`
- `acceptMusicProposal(...)`
- `playPlaylistNow(...)`
- `markCompletedDispatchedItems(...)`
- `maybeReturnJamToAuto(...)`

Eso significa que el gap principal es de orquestación, no de infraestructura.

### 3. La consola de música sigue pensada alrededor de propuestas

Archivo: `src/components/musica/MusicOperationConsole.tsx`

La UI actual asume este flujo:

1. llega el cliente
2. aparece una propuesta pendiente
3. alguien decide "A DJ" o "A Jam"

Eso está bien como fallback o supervisión manual, pero hoy bloquea la promesa de automatización.

## Qué limita Spotify

Fuentes oficiales usadas:

- [Start/Resume Playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Add Item to Playback Queue](https://developer.spotify.com/documentation/web-api/reference/add-to-queue)
- [Get Playback State](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback)
- [Transfer Playback](https://developer.spotify.com/documentation/web-api/reference/transfer-a-users-playback)

Hallazgos importantes:

- Spotify exige Premium para controlar playback.
- `PUT /me/player/play` permite iniciar track o contexto en un `device_id`.
- `POST /me/player/queue` permite agregar una track a la cola.
- `GET /me/player` permite leer estado actual y device activo.
- `PUT /me/player` permite transferir playback a otro device.
- Spotify advierte que el orden de ejecución no está garantizado cuando se mezclan varios endpoints de Player.
- Spotify también advierte que `device_id` no debe asumirse eterno; hay que revalidarlo periódicamente.

Implicación práctica:

- no conviene basar el takeover en secuencias frágiles del tipo pause -> queue -> play -> skip si no hay verificación intermedia.
- hay que diseñar con polling/lectura posterior del playback state.

## Problema real a resolver

No alcanza con "cuando llegue, reproducí".

Hay que definir comportamiento por modo:

### En `auto`

Esperado:

- si el turno tiene `spotifyTrackUri`, el sistema debería sonar esa track en el player del local
- después debería recuperar el contexto de Auto

Riesgo actual:

- `ensureAutoPlayback()` sólo sabe mantener playlists por horario
- no hay noción de "interrupción temporal" ni de "luego reanudar Auto"

### En `jam`

Esperado:

- no romper la lógica colaborativa
- sumar el track del cliente en una forma predecible

Riesgo actual:

- `queueTrack()` y `dispatchQueuedItems()` funcionan, pero el evento de llegada no entra ahí automáticamente

### En `dj`

Esperado:

- respetar takeover manual
- el dueño del modo DJ debería decidir si la track del cliente entra al frente, al fondo o sólo como propuesta

Riesgo actual:

- si automatizamos sin contrato claro, podríamos pisar la intención del operador

## Opciónes de arquitectura

### Opción A: seguir con proposals manuales

Ventajas:

- mínimo riesgo
- casi sin cambios

Desventajas:

- no cumple el objetivo
- mantiene la dependencia humana

Conclusión:

- no recomendable si queremos automatización real

### Opción B: disparar playback directo desde `clienteLlegoAction()`

Ventajas:

- simple
- rápido
- menos latencia entre "llegó" y "suena"

Desventajas:

- mezcla reglas de música dentro de `turnos`
- duplica lógica del motor
- hace más difícil evolucionar `auto/jam/dj`

Conclusión:

- útil como parche corto, pero no como diseño final

### Opción C: `clienteLlegoAction()` llama a un caso de uso del motor

Flujo:

1. `turnos` valida dominio del turno
2. registra evento en pantalla
3. llama a `handleClienteLlego({ turnoId, spotifyTrackUri, ... })`
4. `music-engine` decide:
   - reproducir
   - encolar
   - dejar proposal
   - marcar waiting_for_recovery
5. devuelve resultado estructurado a `turnos`
6. `turnos` muestra feedback correcto

Ventajas:

- separa responsabilidades
- evita duplicar lógica
- deja lugar a fallback manual
- es consistente con la arquitectura actual

Conclusión:

- es la opción recomendada

## Diseño recomendado

### 1. Crear un caso de uso explícito

Agregar en `src/lib/music-engine.ts` algo de este estilo:

```ts
type ClienteLlegoResult =
  | { kind: "playback_started"; mode: "auto" | "dj"; eventId: string }
  | { kind: "queued_in_jam"; eventId: string; queueSessionId: string }
  | { kind: "proposal_created"; reason: string; eventId: string }
  | { kind: "waiting_for_recovery"; reason: string; eventId: string }
  | { kind: "missing_track_uri"; eventId: string };

async function handleClienteLlego(input: {
  turnoId: string;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
  triggeredByUserId: string;
}) {}
```

Esta función debería ser la única autoridad sobre el comportamiento musical de la llegada.

### 2. Contracto por modo

#### `auto`

Si hay player listo y `spotifyTrackUri`:

- reproducir track directamente con `spotifyAdapter.play({ kind: "track" ... })`
- persistir contexto de Auto para retomarlo
- marcar una "interrupción activa"
- devolver `playback_started`

Si no hay player o provider:

- guardar proposal
- devolver `waiting_for_recovery`

#### `jam`

Si hay `spotifyTrackUri`:

- insertar en cola Jam
- decidir si va al frente o al final
  - recomendación: al frente sólo si no hay nada sonando
  - si ya hay Jam en marcha, al final con prioridad normal
- devolver `queued_in_jam`

Si no hay `spotifyTrackUri`:

- proposal

#### `dj`

Recomendación de producto:

- no tomar control automáticamente si DJ está activo
- crear proposal con copy claro o agregar a cola DJ detrás de lo actual según flag de configuración

Mi sugerencia:

- por defecto: proposal
- opcional a futuro: setting "DJ acepta automáticamente llegadas"

### 3. Persistir estado de interrupción de Auto

Hoy falta una noción de:

- qué playlist/contexto estaba sonando en Auto
- si fue interrumpido por una llegada
- cuándo volver

Hay dos caminos:

#### Camino corto

Reusar `musicModeState.pendingContextRef` / `pendingContextLabel`

Problema:

- hoy eso ya se usa para DJ
- semánticamente mezcla dos cosas distintas

#### Camino recomendado

Agregar una pequeña tabla o estado dedicado, por ejemplo:

- `music_runtime_context`
  - `id`
  - `resumeMode`
  - `resumeContextRef`
  - `resumeContextLabel`
  - `interruptionSource`
  - `interruptionTrackRef`
  - `resumeAfterTrackEnd`
  - `updatedAt`

Esto deja claro cuándo el sistema está "temporalmente fuera de Auto".

### 4. Hacer que `syncMusicEngine()` también resuelva la recuperación

Además de lo que ya hace, `syncMusicEngine()` debería:

- detectar si una interrupción por llegada terminó
- si terminó, restaurar Auto
- si el provider/device volvió a estar listo y había una llegada esperando, ejecutar esa acción pendiente

Eso vuelve al sync un reconciliador del sistema, no sólo un player sync.

### 5. Agregar eventos más específicos

Hoy casi todo cae en `musicEvents` genéricos.

Conviene sumar eventos como:

- `turno.cliente_llego.received`
- `turno.cliente_llego.playback_started`
- `turno.cliente_llego.queued`
- `turno.cliente_llego.waiting_for_recovery`
- `turno.cliente_llego.proposal_created`
- `music.auto.interrupted_for_arrival`
- `music.auto.resumed_after_arrival`

Eso ayuda para:

- debugging
- auditoría
- feedback de UI

### 6. Cambiar el feedback en `TurnoCard`

Archivo: `src/components/turnos/TurnoCard.tsx`

En vez de un único mensaje tipo "canción enviada a pantalla", mostrar resultado real:

- "Suena ahora en el local"
- "Entró a la cola Jam"
- "Quedó como propuesta en Música"
- "Spotify no está listo; quedó pendiente para recuperación"
- "Falta vincular la track de Spotify"

## Cómo lo implementaría por etapas

### Etapa 1: vertical slice real

Objetivo:

- que `clienteLlego` ya no sea proposal-only

Cambio:

- crear `handleClienteLlego(...)`
- llamarlo desde `clienteLlegoAction()`
- en `auto`: reproducir directamente si hay player y track URI
- si no se puede: fallback a proposal

No tocar todavía:

- recuperación elegante de Auto
- heartbeat adicional
- reglas finas de DJ/Jam

Resultado:

- primer salto real de valor

### Etapa 2: recuperación de Auto

Objetivo:

- que el local vuelva solo a la playlist por horario

Cambio:

- persistir contexto previo
- detectar fin del track/interrupción
- reanudar regla activa

Resultado:

- experiencia completa en `auto`

### Etapa 3: contrato definitivo para Jam y DJ

Objetivo:

- que el comportamiento sea predecible y no sorprenda al staff

Cambio:

- Jam: llegada entra automáticamente a la cola
- DJ: proposal o auto-queue según setting

### Etapa 4: runtime más autónomo

Objetivo:

- reducir dependencia de abrir `/musica`

Cambio:

- disparar `syncMusicEngine()` desde:
  - `clienteLlegoAction()`
  - cambios de modo
  - altas de queue
  - cambios de schedule
- sumar heartbeat liviano contra `POST /api/music/state`

Importante:

- el heartbeat debería ser safety net, no el core del sistema

## Riesgos concretos

### 1. Orden no garantizado de Spotify Player API

La documentación oficial repite que el orden de ejecución no está garantizado entre endpoints de Player.

Implica:

- evitar secuencias muy largas sin chequeo
- confirmar playback state después de comandos importantes

### 2. Device del local inestable

Spotify aclara que `device_id` puede cambiar o dejar de ser válido.

Implica:

- `syncPlayersFromSpotify()` tiene que seguir siendo parte del flujo
- no conviene cachear a ciegas el `providerPlayerId`

### 3. Modo DJ puede quedar ambiguo

Sin una decisión de producto, automatizar llegadas en DJ puede sentirse como bug.

### 4. Recuperación de Auto puede volverse frágil si se sobrecarga `pendingContextRef`

Por eso prefiero separar estado de "pending DJ playlist" de estado de "resume after arrival".

## Recomendación final

La mejor forma de unir "cliente llegó" con "suena" en este repo es:

1. No mover lógica musical a `turnos`
2. Crear `handleClienteLlego(...)` en `music-engine`
3. Resolver automáticamente sólo los casos seguros
4. Mantener proposal como fallback, no como flujo principal
5. Persistir estado de interrupción para que Auto se recupere solo
6. Usar `syncMusicEngine()` como reconciliador posterior a cada evento importante

## Implementación sugerida en archivos

- `src/app/(admin)/turnos/actions.ts`
  Cambiar `clienteLlegoAction()` para que llame al motor y devuelva resultado real.

- `src/lib/music-engine.ts`
  Agregar:
  - `handleClienteLlego(...)`
  - persistencia de interrupción/resume
  - nuevos eventos
  - recuperación de Auto

- `src/db/schema.ts`
  Agregar tabla o estado para resume/interruption.

- `src/components/turnos/TurnoCard.tsx`
  Ajustar copy y feedback.

- `src/components/musica/MusicOperationConsole.tsx`
  Mantener proposals solo para fallback/manual override, no como camino obligatorio.

## Fuentes

- Código local:
  - `src/app/(admin)/turnos/actions.ts`
  - `src/lib/music-engine.ts`
  - `src/lib/spotify-server.ts`
  - `src/lib/spotify-api.ts`
  - `src/components/musica/MusicOperationConsole.tsx`
  - `planning/features/music-auto-jam-completion.md`

- Spotify oficial:
  - [Start/Resume Playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
  - [Add Item to Playback Queue](https://developer.spotify.com/documentation/web-api/reference/add-to-queue)
  - [Get Playback State](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback)
  - [Transfer Playback](https://developer.spotify.com/documentation/web-api/reference/transfer-a-users-playback)
