@AGENTS.md

# A51 Barber Shop — Agent Instructions

## Quick Start

### Deploy
Push to `master` → Vercel auto-deploys. Use `/a51-ship` skill for pre-flight (typecheck + lint + build) before pushing.

```bash
# Pre-flight before any push
npm run typecheck
npm run lint
npm run build
```

### Was doesn't run this locally
The app runs on Vercel. If you need to run locally anyway: `npm run dev` (port 3000). Requires `.env.local` — never committed, ask Was for values.

### Required env variables (`.env.local`)
- `DATABASE_URL` — Neon PostgreSQL pooled connection
- `DATABASE_URL_UNPOOLED` — for Drizzle migrations only
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` — auth
- `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` — music engine
- `CRON_SECRET` — Vercel cron jobs
- `ANTHROPIC_API_KEY` — AI features

### Database
```bash
npm run db:generate   # generate migration SQL after schema changes
npm run db:migrate    # apply migrations (use this, not db:push, for production)
npm run db:push       # local iteration / emergency only — bypasses reviewed SQL
npm run db:studio     # Drizzle Studio data browser
```

### Tests
```bash
npm run test:dal           # DAL access ownership smoke test
npm run test:ovnis         # OVNIS economy unit tests
npm run test:ovnis:flows   # OVNIS flow-level DB smoke tests (hits live DB)
npm run verify:refactor    # typecheck + lint (run before any refactor commit)
```

**Escribir en la base pide confirmación**: hay una sola base (local = prod). `seed-prod`, los tests E2E y los scripts de `scripts/local/` llaman a `confirmarEscrituraEnProd()` (`src/db/confirmar-prod.ts`): en la terminal piden escribir "si"; sin terminal solo corren con `CONFIRMO_PROD=si`. Todo script nuevo que inserte o borre datos tiene que llamarla. `scripts/local/` está en `.gitignore`: ahí van los scripts propios de Was (ej. la demo del torneo: `npx tsx scripts/local/demo-torneo-llenar.ts` / `demo-torneo-limpiar.ts`).

---

## Current State (July 2026)

The app is live on Vercel. Core is mature. **Barber-side launch readiness completed 2026-07-09** (spec: `../docs/specs/barber-launch-audit.md`): repago financial integrity, journey simplification (J1-J8), copy/theme polish, and flow tests — all shipped to prod, migrations 0032-0034 applied.

### Repago Memas — modelo vigente: primero el capital, el interés aparte (desde 2026-09-29)
- Plan: **u$d 1.770 · 10% anual · 12 cuotas de referencia** (capital fijo u$d 147,50). El cronograma alemán NO es obligación mensual: solo fija el **tope de interés** (u$d 95,88 = interés total del cronograma) y la **cuota sugerida** (u$d 147,50).
- **Todo lo pagado baja la deuda**: falta = préstamo − pagado. Es la cuenta que hace el tesorero a mano; la pantalla la muestra literal ("1.770 prestados − X devueltos = Y").
- **Interés aparte**: se acumula por días desde el **primer pago**, `deuda del tramo × 10% × días / 365`, con tope u$d 95,88. NO se descuenta de los pagos; **se define al final** (cobrarlo, parte o nada). Al devolver todo, deja de correr. Decisión de Was (2026-09-29), después de que el tesorero no pudiera reconciliar un interés descontado en silencio.
- **Fuente de verdad = la lista de pagos** (fecha + USD entregado). `calcularEstadoRepago()` en `src/lib/amortizacion.ts` (pura, testeada) recalcula todo. Cache por fila: `capital_pagado` = USD del pago, `interes_pagado` = 0, `numero_cuota` = número de pago. Cache del repago: `saldo_pendiente`, `cuotas_pagadas` (= cuotas de referencia cubiertas), `pagado_completo` (= capital devuelto). `registrarCuotaRepagoMemas()` reescribe todo el historial tras cada pago; `recalcularRepagoMemas()` lo hace sin agregar pagos (usar si cambia la regla).
- USD entregado por fila: USD → `monto_ingresado`; ARS → `monto_ingresado / tc_dia` (a centavos). `monto_pagado` = equivalente ARS al TC del día (lo usa el P&L).
- **Registrar pago**: fecha editable (≤ hoy, ≥ último pago), TC editable (sugerido: blue promedio de DolarAPI), confirmación con "falta hoy − este pago = falta después". Se **rechaza** un pago mayor a lo que falta. El éxito dice qué se registró y cuánto falta.
- **P&L**: descuenta solo la suma de pagos reales del mes (ARS). Mes sin pagos = 0.
- **Calendario de cuotas** (`calcularCalendarioCuotas()`, puro y testeado): reparte lo devuelto en las cuotas de referencia en orden, desde `repago_memas.fecha_inicio` (cuota 1 = agosto 2026). La cuota de cada mes se puede pagar durante ese mes; queda **atrasada** recién cuando el mes terminó. Situación: `adelantado` / `al_dia` / `atrasado` / `devuelto`. La sugerencia del form es completar la próxima cuota, o ponerse al día si hay atraso. No cambia ningún número de la deuda: solo mide contra el plan. Sirve para cualquier cantidad de cuotas.
- UI: `_CuotasPlan.tsx` (tira de N cuotas con marca "hoy", 6 por fila en mobile y 12 en desktop) reemplaza la barra de %. Etiquetas y colores de situación compartidos en `src/components/repago/situacion.ts` (también los usa `/negocio`; ahí ya no hay pill roja "Hay deuda").
- **Sección Interés en `/repago` (2026-09-30), al hueso**: solo "El préstamo u$d 1.770" + "Los intereses u$d 95,88" (el tope) + "Los intereses se pagan al final. Si terminan de devolver antes, son menos." Sin acumulado por días, sin tramos, sin cajas ni desplegables: Was los probó y los rechazó por confusos para alguien que no sabe de finanzas. El acumulado real (`estado.interesAcumulado`) se sigue calculando pero no se muestra.
- Pendiente: **no hay flujo para cobrar el interés** una vez devuelto el capital. Al diseñarlo, el monto a cobrar es `interesAcumulado` (≤ tope), no el tope. Se diseña cuando Was defina qué se cobra.
- Pantalla diseñada con la vara de `~/CasamodaProject/.claude/skills/revisar-pantalla` (una tarea, una acción, sin copias repetidas).
- Tests: `src/tests/integration/repago-capital-primero.test.ts` (los 3 pagos reales de prod).

### Caja y cierre — una pantalla cada uno (2026-09-30)
Pinky nunca usó la app porque vio Caja "muy complicada" (en prod hay 28 atenciones, la última de mayo 2026, y 1 solo cierre). Se rehízo con el criterio de repago: un número, una acción, la cuenta a la vista.
- **`/caja`**: "Hoy entraron $X" (bruto de servicios + productos), botón **Cobrar**, link "Vender producto", la lista "Lo de hoy" que **suma exactamente el total**, y "Cerrar caja" al final (solo admin). Misma pantalla para admin y barbero; el barbero ve solo sus servicios ("Hoy cobraste"). Desglose por barbero solo si trabajó más de uno. Tocar una fila muestra Editar/Anular.
- La lista y el total salen de `armarCajaDelDia()` en `src/lib/caja-dia.ts` (pura, testeada en `caja-dia.test.ts`): el producto vendido dentro de una atención suma en esa fila; anuladas se listan tachadas y no suman; las reversiones no son filas.
- **Cada cosa en un solo lugar**: Cierre salió de la barra de abajo (es el último paso de Caja); el gasto vive solo en la barra (sin flotantes en Caja); cobrar es un solo formulario (`QuickCheckoutPanel`) con tres puertas: Hoy, Caja (`/caja/nueva`) y la ficha del cliente.
- **Default del cobro**: servicio y medio más usados en 30 días; si no hay cobros recientes, los más usados del historial (antes caía en el primer servicio de la tabla, Tintura, el más caro).
- **`/caja/cierre`**: una pantalla (`_CierreForm.tsx`). "En efectivo debería haber $X" (efectivo cobrado − gastos rápidos), "¿Cuánto contaste?", la diferencia en una frase, Cerrar caja con doble toque. El conteo sigue siendo obligatorio y se guarda en `cierres_caja.efectivo_contado`; la diferencia avisa (ámbar si pasa de $500) pero no bloquea.
- No se muestran en Caja: neto, comisiones de medios, margen. Eso es de Negocio / P&L.
- **Resto de las pantallas de plata, mismo criterio (2026-09-30)**:
  - `/negocio`: una lista de 5 números, cada uno lleva a donde se trabaja (Caja, gastos, liquidaciones, repago, inventario) + "Más". "Hoy entraron" es el mismo bruto que muestra Caja.
  - `/dashboard` ("Números"): cortes de hoy, cuántos faltan para cubrir los gastos del día, y el mes. Ya no repite caja ni stock.
  - `/mi-resultado`: "Tus cortes este mes" + "La barber este mes" como suma a la vista (parte de la casa + ganancia de productos − gastos = queda para la barber).
  - `/liquidaciones`: "Falta pagarle al equipo" = liquidaciones sin pagar + **días trabajados que ninguna liquidación cubre** (`getPendienteEquipo`, `src/lib/liquidaciones-service.ts`). Los barberos cobran por día y a mano: cada día sin pagar tiene "Pagado", que genera la liquidación de ese día y la marca pagada. Antes solo contaba liquidaciones generadas, y como la del día se genera al cerrar la caja (que en prod nunca se cerró) daba $0.
- **Lo que le toca al barbero (regla de Was, 2026-10-21)**, en `calculateAtencionCommission` (`src/lib/finance/commission.ts`), única fuente también para la vista previa del formulario de cobro: su % sobre el precio de lista (o lo cobrado si fue menos) + **toda la propina** (lo cobrado por encima del precio de lista) − **la comisión de MP o tarjeta, que la absorbe el barbero**. Al local le queda precio de lista × (1 − %). Los cobros anteriores al 2026-10-21 quedaron guardados con la regla vieja (sin propina ni descuento de MP). El barbero ve "Te toca hoy / este mes" en su Caja.
  - `/dashboard/pl` y su PDF: mismas cuentas, etiquetas en castellano llano ("Lo que entró", "Comisiones de MP y tarjeta", "Queda este mes"). En pantalla el título es "El mes completo".
  - `/finanzas`: el capital como suma (pusieron los socios − retiros − compras del Hangar = queda / se usó de más); movimientos legibles en el celular.
  - Header del modo barbero: solo marca, fecha, nombre y Salir.
- **Una sola definición de "queda para la barber"**: `getKpisMes` ahora resta también los costos fijos de Finanzas, igual que `getPL` (antes Números y Mi resultado daban distinto).
- Pendiente: importar los meses históricos desde la planilla de Was; con datos reales, repasar estas pantallas.

### Torneo FIFA y portal cerrado (desde 2026-10-07)
- Plan: `planning/features/torneo-fifa-umbrella.md` (7 slices). Torneo EA FC presencial: inscripción pública sin cuenta en `/torneo`, panel de Pinky en `/torneo-admin` (botón "Pagó", cupo 16 por orden de pago), sorteo y cuadro en `src/lib/torneo.ts` (puro, testeado) y `src/lib/torneo-juego.ts`.
- **El portal de clientes (`/marciano/*`, `/ar-lab`) está cerrado por defecto**: `src/lib/launch-mode.ts`, se abre con `PORTAL_CLIENTE_ABIERTO=true`. La landing muestra el torneo y tarjetas "Próximamente" inertes.
- **También cerrados con el mismo flag**: `/reservar` y sus APIs (`/api/turnos/reservar`, `/api/turnos/disponibles`, `/api/reservar/access`). La landing pone el torneo primero y el resto como carteles "Próximamente".
- **Anti-spam de la inscripción**: honeypot + 20 intentos/10 min por IP (memoria) + tope de 40 inscripciones/10 min en la base. Test de humo: `npm run test:torneo:smoke` (no correr con un torneo real creado).
- **Lista de espera y reemplazo (2026-10-08)**: con 16 pagados el formulario sigue abierto y quedan en lista de espera (puesto por llegada, tope 51 anotados, "El que sigue" en el panel). Un jugador sorteado se puede reemplazar **solo antes del primer partido** (`src/lib/torneo-reemplazo.ts`): el nuevo hereda equipo y cruce, paga la cuota y el que se baja queda `estadoPago = "baja"`. Un mismo teléfono/cliente no se anota dos veces.
- **Alias, marcador y catálogo (2026-10-08)**: el alias (2–20 caracteres, obligatorio) es lo único que se ve en la tele y los celulares; el nombre completo solo en el panel (`nombresPublicos` en `src/lib/torneo.ts`, migración 0043). Pinky carga los goles de cada cruce; si empatan elige quién ganó los penales (marca "pen."), y se corrige mientras el partido siguiente no se jugó. Los equipos salen de un catálogo cerrado de 24 clubes con escudo (`CATALOGO_CLUBES` en `src/lib/torneo-escudos.ts`, PNG en `public/equipos/`, normalizados por tamaño óptico: ver su LEEME.md); el panel los elige en una grilla.
- **Sorteo en dos fases y tele (2026-10-08)**: ruleta de equipos (1 toque por jugador, 16) y luego cruces (1 por toque, 8) = 24 pasos (`progresoReveal` en `src/lib/torneo-juego.ts`; sorteos viejos cuentan solo cruces). Tele: `_Reveal.tsx`, `_Campeon.tsx`, `_Espera.tsx`; three.js compartido en `src/app/torneo/_pelota3d.ts` y regla de movimiento reducido en `_movimiento.ts`. Panel de Pinky rediseñado (`_Panel`, `_PagoButton`, `_Sorteo`). `LoadingScreen` es CSS puro (corre antes de hidratar).
- **Torneo de ensayo**: `scripts/seed-torneo-prueba.ts` crea "Prueba · Torneo FIFA A51" (16 pagados + 3 en espera). Solo los torneos cuyo nombre empieza con "Prueba" se pueden borrar desde `/torneo-admin`. La base es una sola (local y producción): cuidado con lo que se crea.
- **Jukebox sobre Spotify (2026-10-15)**: la gente busca en Spotify sin cuenta (credencial de la app, `src/lib/spotify-catalogo.ts`), toca un tema y listo (nombre opcional). Suena en la app de Spotify del local (celu bloqueado o parlante): `/musica/jukebox` ya no reproduce nada, solo muestra y controla (conectar cuenta, pausa/play, saltar, quitar, aprobar, sumar temas como DJ con "Que siga"/"Al final").
  - La cola vive en `jukebox_queue`; a Spotify se le pasa **de a un tema y tarde** (Spotify no deja borrar de su cola): con la lista del local sonando, enseguida; con un tema pedido sonando, a 45 s del final. Lo mandado queda con candado (`sent_to_spotify_at`). Lógica pura y testeada: `decidirJukebox` en `src/lib/jukebox-decidir.ts`.
  - **Latido** (`latidoJukebox`, `src/lib/jukebox-spotify.ts`): lo disparan los sondeos de `/api/jukebox/now`, `/mine`, `/staff` y la tele del torneo (cada 10 s). Solo uno cada 4 s habla con Spotify (`reclamarTurno`, UPDATE atómico en `jukebox_runtime`) y deja una foto que leen los demás. No depende de ninguna pantalla abierta en particular.
  - Mientras la jukebox tiene temas vivos, el modo Auto no toca Spotify (`jukeboxOcupaSpotify` en `syncMusicEngine`).
  - **Salida de emergencia**: "¿Problemas con Spotify?" → modo YouTube (`jukebox_runtime.source`): suena en el celu del staff con la pantalla abierta; el video de cada tema se busca recién cuando le toca (`src/lib/jukebox-youtube.ts`, ~100 temas/día de cuota).
  - La cuenta conectada se ve en la pantalla ("Spotify de X"). App de Spotify en modo desarrollo: cada cuenta que se conecte tiene que estar anotada en User Management del dashboard de Spotify y ser Premium.
- **Por qué ruta propia (2026-10-15)**: al volver atrás, Next reusa el payload RSC cacheado de la página (doc glossary: "reused during browser back/forward"; `force-dynamic` no lo evita), así que la cola/propuestas aparecían viejas, el tab volvía a Spotify y el audio pedía otro toque. Ahora `/musica/jukebox` sondea `GET /api/jukebox/staff` cada 3 s (la verdad es el servidor, no las props), y en modo YouTube arranca sin sonido (el audio exige un toque) y desmonta el player al salir. Regla: estado vivo = polling a una API `no-store`, no props de un Server Component.
- **Landing y jukebox con movimiento (2026-10-17)**: cuota $5.100 (default de `torneos.cuota_ars`, migración 0047). `/torneo`: el ovni chupa la pelota y la escupe cada ~9,5 s (`abduccion` en `_EscenaOvni.tsx`, también en la tele), alien rosa neón, inscripción con nombre y apellido. Efectos de Motion Primitives portados sin librería en `src/components/motion/` (TextEffect, BorderTrail, Magnetic). `/jukebox`: el vinilo se raya con el dedo/mouse (`Maquina` en `_JukeboxClient.tsx`).
- **La música sí está implementada**: `clienteLlegoAction` ya dispara la reproducción (el punto de "Known bugs" sobre música quedó viejo).

### Horario semanal y turnos libres (desde 2026-10-20)
- Los turnos libres **se calculan**, no se cargan: `barbero_horario_semanal` (rangos por día de la semana, se repiten) + `barbero_dia_especial` (una fecha: "no se trabaja" u otro horario; sin barbero = feriado del local) + turnos pendientes/confirmados. Lógica pura y testeada en `src/lib/horario.ts` (`rangosDelDia`, `calcularTurnosLibres`; tests en `src/tests/integration/horario.test.ts`); la carga de la base en `cargarAgenda()` de `src/lib/turnos.ts`.
- Arranques cada 30 min (`PASO_TURNOS_MIN`); reserva pública y portal desde mañana hasta 30 días (`DIAS_RESERVA_ADELANTE`). El solapamiento se mide por intervalo: un turno de 60 a las 11 bloquea las 11:30 (antes no).
- El id de un horario libre es `"fecha|hora"` (`armarHorarioId`/`leerHorarioId`): reservar recalcula y valida con `isHorarioLibre()` justo antes de guardar. "Tomar" en `/turnos` usa la duración del servicio elegido.
- Pantalla: `/turnos/disponibilidad` = "Mi horario" (cada barbero el suyo; la dueña elige barbero con `?barbero=` y carga feriados del local). Si un día no tiene lugar, la reserva ofrece "Ver el <próximo día con lugar>".
- `turnos_disponibilidad` (filas por fecha, se vencían: en prod se acabaron en mayo) quedó sin uso; borrarla en una migración posterior. Horario de Pinky (mar–sáb 10–19) sembrado en la migración 0049.
- QA con agentes-persona contra un branch de Neon: `qa/PERSONAS.md`. Chequeo de esquema vs base: `npm run db:check:esquema`.

### Estudio — los temas de Was y Pinky (desde 2026-10-22)
- `/estudio`, privado: solo los emails de `ESTUDIO_EMAILS` (layout con `notFound()`, APIs con 401). Meta 51 temas. MP3 320 directo de FL en el Blob **privado** `a51-estudio` (`ESTUDIO_READ_WRITE_TOKEN`, no el `BLOB_READ_WRITE_TOKEN` de fotos); el audio se pide a `/api/estudio/temas/[id]/audio`, que responde 302 a un link firmado de 6 h.
- Se usa como playlist de Spotify: ranking compartido (`estudio_temas.orden`, modo Ordenar con framer-motion `Reorder`), escuchas en `estudio_escuchas` (cuentan a los 30 s sonando de verdad), buscador, chips de género y aleatorio. Reglas puras y testeadas en `src/lib/estudio-lista.ts`.
- Player (`_Reproductor.tsx`): un solo `<audio>` + Media Session (pantalla bloqueada, Bluetooth). **La reproducción no pasa por Web Audio** (iOS lo suspende con la pantalla bloqueada).
- La nave (`_Nave.tsx`, `_naveKit.ts`, `_naveShow.ts`, `_naveMateriales.ts`): visualizador three.js que lee `currentTime` contra un análisis precalculado (`_analisis.ts`). Todo procedural, MSAA + entorno PMREM + resolución adaptativa. **Fotosensibilidad**: nada que cambie la luminosidad de un área grande sigue al bombo (usa `brillo`, lento), destellos con tope de 2/s; después de tocarla, medir luminancia cuadro a cuadro (ningún salto ≥ 0,10). Prompt de pulido y método de prueba: `planning/features/estudio-nave-pulido.md`.
- **Modo nave interactivo (2026-10-24)**, plan en `planning/features/estudio-nave-interactiva.md`:
  - UI: sin título ni "Volver" arriba; el botón de la barra dice "Playlist" (vuelve a la lista). En modo nave la barra se baja sola a los 3,5 s (sale con la manija de abajo o, en compu, acercando el mouse); en pausa queda visible. Pista "Tocá todo · Mantené apretada la nave para jugar" las primeras 3 veces.
  - Tocar (solo en modo nave): cada actor tiene `clase` y `radio`; `_naveToque.ts` pone empujones con resorte y la reacción por clase. La pelota tocada pasa a física (jueguitos, cuenta toques). Mouse que pasa o dedo que barre empujan; la gente (aliens, rave, piloto) mira al puntero (`kit.mirada`).
  - Nodriza: se arrastra y vuelve sola; mantenerla apretada 0,75 s arranca el juego (`_naveJuego.ts` + `_Marcador.tsx`): meteoritos en los bombos, lluvia con hueco en el drop, orbes, 3 vidas, récord por tema en la base (ver "Flota").
  - Piso con 5 biomas y 9 estructuras (`_naveTerreno.ts`), escenas de los costados y nebulosa (`_naveEscenas.ts`).
- **Flota, hangar y récord por tema (2026-10-24)**, plan en `planning/features/estudio-nave-flota.md`:
  - 6 modelos en `_naveFlota.ts` (`crearNave(kit, modelo)`; `crearOvni` = platillo). Fichas, habilidades y escalones de destrabe en `src/lib/estudio-naves.ts` (puro: lo usa también el server). Los escalones son tentativos: ajustarlos cuando Was y Pinky jueguen.
  - Mundo por tema: `mundoDeTema(temaId)` en `_naveMundo.ts` (paleta, bioma inicial, naves dominantes en `kit.flota`).
  - Juego: habilidad por nave, ayudas (`_naveAyudas.ts`), jefe en el drop (`_naveJefe.ts`), escoltas con racha 20 (`_naveEscoltas.ts`). Hangar (`_Hangar.tsx`) solo desde el cartel de fin del juego. Sin cámara lenta: rompe el sincronismo con los bombos.
  - Récord por tema y nave elegida en la base: `estudio_partidas` y `estudio_hangar` (migración 0052), consultas en `src/lib/estudio-juego.ts`. El destrabe se valida en el server. El récord viejo de `localStorage` no se migró.
- **Shaders de la nave: nada de `pow` de algo que pueda ser negativo ni dividir por `fwidth()` sin tope.** Un solo píxel NaN, el bloom lo desparrama y el cuadro sale entero en negro (un parpadeo). Pasó con el rayo de los ovnis (`1.0 - abs(dot)` < 0 por redondeo) y se encontró midiendo luminancia por cuadro con `readPixels` justo después de `composer.render()`.

### Known bugs / debt
- **Music**: `clienteLlegoAction()` ya dispara la reproducción (ver "Torneo FIFA y portal cerrado"). La jukebox pública suena en el Spotify del local (ver "Jukebox sobre Spotify"); falta probarla en el local con el celu bloqueado un rato largo. Detalle: `planning/features/music-auto-jam-completion.md`.
- Stock ledger is append-only since 2026-07: anulaciones/ediciones insert compensating movements (never DELETE); sales aggregates must sum `-cantidad`, never `Math.abs`. Standalone product sales are anulable by admin from /caja (reversión with `referencia_type = 'stock_movimiento'`).

### UX maturity by surface
- Operación diaria (hoy, caja, turnos, clientes): **mature**
- Negocio / admin reporting: **mature**
- Configuración: **mature**
- Portal Marciano: **mature**
- Repago Memas: **mature** (capital primero, interés aparte con tope, tested)
- Reserva pública: **functional, needs UX pass** (encoding bug fixed in 425ecc2)
- Pantalla pública: **functional**
- Música: **functional** (jukebox público auditado para uso externo, 2026-10-07)
- Torneo FIFA (`/torneo`, `/torneo-admin`, `/torneo/pantalla`): **built, pending rehearsal en el local**

### Functional gaps (not blocking, but relevant for designer)
- Mover y cancelar turnos (desde 2026-10-20): en `/turnos` cada barbero mueve ("Mover": solo horas libres del mismo barbero y duración, sin contar el lugar que ya ocupa) o cancela con motivo sus turnos pendientes y confirmados; la dueña, los de todos. No hay rol mostrador ni agenda compartida para barberos (decisión de Was, QA tema 3). Mover no avisa al cliente: `turno_notification_events` solo acepta confirmado/cancelado.
- Marciano portal: unclear if client can cancel/reschedule from UI
- Email notifications exist (`src/lib/email.ts`) but no outbound CRM surface
- Retention candidates visible but no contact tracking flow

### Designer handoff context
The designer works in Figma + Claude Code. The full UX inventory is in `docs/feature-map-ux.md` — section 7 has the recommended epics for a UX pass. The 5 main surfaces and their maturity levels are documented there.

## Design System

### Visual Identity
A51 is a **dark, premium barbershop app**. The aesthetic is: near-black backgrounds, a neon green brand accent (`#8cff59`), and high-contrast white text. Think control panel, not dashboard.

### Color Tokens (defined in `src/app/globals.css`)
```
--background:       #121212   — page background
--surface:          #18181b   — card / panel base
--surface-elevated: #27272a   — elevated elements inside panels
--border:           #34343a   — default border color
--muted:            #a1a1aa   — secondary/placeholder text
--brand:            #8cff59   — neon green accent (CTAs, active states, highlights)
--brand-strong:     #b6ff84   — lighter green for hover/gradient tips
--foreground:       #f5f7f5   — primary text (near-white)
```

Use Tailwind's `zinc-*` scale for grays. Prefer `zinc-400` for secondary text, `zinc-800` for subtle borders, `zinc-950` for ultra-dark insets.

### CSS Utility Classes (use these, don't reinvent)
| Class | Use |
|---|---|
| `.app-shell` | Outermost page wrapper (has green radial gradient) |
| `.panel-card` | Primary card / section container |
| `.panel-soft` | Subtle inner panel (lower contrast) |
| `.neon-button` | Primary CTA — green gradient with glow |
| `.ghost-button` | Secondary CTA — dark bg, green border |
| `.eyebrow` | Section labels — uppercase, wide tracking, muted color |
| `.font-display` | Display/heading font (headline size text) |

### Border Radius Convention
- Page sections / major cards: `rounded-[28px]`
- Inner cards / sub-panels: `rounded-[22px]` or `rounded-2xl`
- Badges / pills: `rounded-full`
- Buttons: `rounded-[20px]` or `rounded-2xl`

### Typography
- Section eyebrow: `eyebrow text-xs font-semibold` (uppercase, tracked)
- Section heading: `font-display text-xl font-semibold text-white` (or `text-2xl` / `text-3xl` for heroes)
- Body / label: `text-sm text-zinc-400`
- Numbers / KPIs: `font-display text-2xl font-bold text-white` (or `text-3xl`)
- Brand-colored value: `font-semibold text-[#8cff59]`

### Layout
- Max content width: `max-w-5xl mx-auto`
- Page padding: `px-4 py-6`
- Section gap: `gap-6` on the main flex column
- Inner card padding: `p-5`
- Bottom nav is fixed — always add `pb-24` to `<main>` so content isn't hidden behind it

### Interactive States
All `<a>` and `<button>` elements have a 160ms ease transition (global). On hover:
- Links inside lists: `hover:bg-white/4` or `hover:bg-white/5`
- Text links: `hover:text-[#8cff59] hover:underline`
- Cards: `hover:-translate-y-0.5` (subtle lift)
- Active nav item: `bg-[#8cff59] text-[#07130a]` (inverted)

### Status / Alert Colors
- Success / on target: `border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]` (green)
- Warning / low stock: `border-amber-500/35 bg-amber-500/10 text-amber-300`
- Info / neutral: `border-white/10 bg-white/8 text-stone-200`
- Error: `border-red-500/35 bg-red-500/10 text-red-300`

### Icons
Inline SVG only — no icon library. Pattern:
```tsx
function MyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      {/* paths */}
    </svg>
  );
}
```
`strokeWidth="1.9"` is the standard. Never use filled icons unless it's the active state.

### Page Layout Pattern
Every page follows this structure:
```tsx
<div className="app-shell min-h-screen">
  <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
      <BrandMark href="..." subtitle="..." />
      {/* optional right slot */}
    </div>
  </header>
  <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
    {/* sections */}
  </main>
</div>
```

### Form / Input Style
Forms must match the dark theme — never use light `bg-white` or `border-gray-200`. Use:
- Container: `panel-card rounded-[28px] p-5`
- Inputs: `w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none`
- Labels: `text-sm font-medium text-zinc-300`
- Submit button: `neon-button rounded-[20px] px-5 py-3 font-semibold`
- Back link: `text-sm text-zinc-400 hover:text-[#8cff59]` (not gray-400 / gray-600)

---

## Code Style

### Language & Framework
- **TypeScript** everywhere. No `any` unless absolutely necessary.
- **Next.js App Router** — pages are Server Components by default. Add `"use client"` only when you need browser APIs, `useState`, or event handlers.
- **Drizzle ORM** for all DB access. Never write raw SQL.
- **Tailwind CSS v4** — utility classes inline. No CSS modules, no styled-components.

### File Naming
- Pages: `page.tsx` (Next.js convention)
- Client components with a leading underscore are co-located in the same route folder: `_MyClientComponent.tsx`
- Shared components: `src/components/<feature>/ComponentName.tsx`
- Server actions: `actions.ts` co-located with the route that uses them

### Component Patterns
- Prefer **Server Components** — fetch data at the top, pass as props. No `useEffect` for data fetching.
- Format helpers (e.g. `formatARS`, `formatFechaHoy`) are **file-local functions**, not exported utils, unless reused across 3+ files.
- Use `Promise.all([...])` for parallel DB queries on a page.
- Timezone: always use `"America/Argentina/Buenos_Aires"` for date formatting and Argentina date logic.

### Imports Order
```
// 1. Next.js / React
import Link from "next/link";
import { headers } from "next/headers";

// 2. Third-party
import { eq, and } from "drizzle-orm";

// 3. Internal — lib / db
import { db } from "@/db";
import { auth } from "@/lib/auth";

// 4. Internal — components
import BrandMark from "@/components/BrandMark";
import MyComponent from "@/components/feature/MyComponent";
```

### Dos and Don'ts
- **Do** use `formatARS` (Intl, `es-AR`, ARS currency) for all peso amounts.
- **Do** add `pb-24` to `<main>` so content clears the bottom nav.
- **Do** use `panel-card`, `panel-soft`, `neon-button`, `ghost-button`, `eyebrow` CSS classes.
- **Don't** use `bg-white`, `text-gray-*`, `border-gray-*` — these break the dark theme.
- **Don't** use emoji icons inside SVG nav — inline SVG only for navigation and UI icons.
- **Don't** add `console.log` or debug code to commits.
- **Don't** create new Tailwind config overrides — use CSS variables and the existing tokens.

---

## Architecture

### Route Groups & Permissions
- `src/app/(admin)/` — owner-only routes (dashboard, liquidaciones, inventario, negocio, configuracion, etc.)
- `src/app/(barbero)/` — barber-facing routes (hoy, caja, clientes, turnos, musica)
- `src/proxy.ts` — middleware that protects admin surfaces; don't bypass it
- Access validation for Server Actions: use `src/lib/admin-action.ts` (admin check) and `src/lib/caja-access.ts` (barber-owns-entry check) — never skip these

### Navigation
- `src/components/navigation/RoleBottomNav.tsx` is the **only** bottom nav. It renders 5 tabs para barbero and 7 para admin (4 operación: Hoy, Caja, Clientes, Gasto + 3 gestión). Cierre no es un tab: se entra desde Caja.
- `AdminBottomNav` was deleted. Never recreate it.
- `/negocio` is the admin hub — all owner-only tools live there, not in the bottom nav directly.

### Auth
- Stack: **Better Auth** (`src/lib/auth.ts`, `src/lib/auth-client.ts`)
- No Supabase auth — any reference to it in old docs is stale.
- Session reads happen server-side via `auth()` from `src/lib/auth.ts`.

### Key Lib Files
| File | Purpose |
|---|---|
| `src/lib/music-engine.ts` | Provider-agnostic music motor (modes: Auto, Soy DJ, Jam) |
| `src/lib/music-types.ts` | All music system types |
| `src/lib/music-provider.ts` | Provider interface (Spotify adapter in `spotify-*.ts`) |
| `src/lib/caja-finance.ts` | Cierre diario financial formulas |
| `src/lib/dashboard-queries.ts` | All financial KPI queries |
| `src/lib/bep.ts` | Break-even point logic |
| `src/lib/turnos.ts` | Turnos list queries and visibility rules |
| `src/lib/caja-atencion.ts` | Registro de atención + Marciano consumiciones |
| `src/lib/marciano-config.ts` | Marciano membership config |
| `src/lib/types.ts` | Shared domain types |

### Music Engine
- Architecture is provider-agnostic (Strategy pattern). Don't hardcode Spotify — go through the engine.
- Beats Mode (YouTube) is intentionally **separate** from the Music Engine for now — it lives in `BeatsStudio.tsx` only.
- Real-time updates use **polling every 3s** — SSE and WebSockets were discarded (incompatible with Vercel serverless). Don't introduce them.

### Date / Timezone
- Always use `"America/Argentina/Buenos_Aires"` for date formatting.
- UTC midnight bug: `new Date(dateString)` on a `YYYY-MM-DD` string parses as UTC midnight → shows previous day in Argentina. Fix: parse with explicit time or use `Date.UTC` correctly. This bug has been fixed across the codebase — don't reintroduce it.

### Marciano (VIP membership)
- Membership is activated manually by admin. Tracked in `marciano_beneficios_uso` (cortes + consumiciones per month).
- Briefing pre-corte exists only for Marcianos, cached in `client_briefing_cache`.
- `prioridad_absoluta` field in `turnos` — set automatically when a Marciano books.
- Consumiciones: only products with `esConsumicion = true` qualify; toggle only shows if `clientId` is set and client is Marciano.
