# QuickCheckoutPanel v2 — Cobro Express Mobile-First

**Estado:** completado (16/04/2026) — drum picker + propina añadidos sesión 25
**Prioridad:** alta (flujo usado 20+ veces/dia)
**Archivos principales:**
- `src/components/caja/QuickCheckoutPanel.tsx` (reescritura)
- `src/components/hoy/HoyActionStrip.tsx` (se elimina — absorbido por HoyDashboard)
- `src/components/ui/FullScreenOverlay.tsx` (nuevo — reemplaza Modal para este flujo)

---

## Problema

El panel de cobro rapido actual muestra una grilla de servicios (2 columnas) + grilla de medios de pago (3-4 columnas) + boton de confirmar. En mobile, el barbero tiene que scrollear dentro del modal, tocar multiples botones, y procesar demasiada informacion visual para algo que deberia ser < 5 segundos.

## Solucion — 3 pasos, sin scroll

### Paso 1: Scroller horizontal de servicios

- Strip horizontal con snap scroll (`overflow-x-auto snap-x snap-mandatory`)
- Cada slide: card de ~120px de ancho con nombre del servicio + precio en grande
- Un toque selecciona y muestra el precio en el hero central
- El servicio activo tiene borde verde + sombra glow
- En mobile, swipe natural; en desktop, tambien funciona con scroll lateral

**Layout del slide:**
```
┌─────────────┐
│  Servicio    │  ← eyebrow muted
│  Corte       │  ← nombre bold
│  $12.500     │  ← precio brand color
└─────────────┘
```

### Paso 2: Boton ciclador de medio de pago

- **Un solo boton** que muestra el medio actual: icono + nombre
- Toque = cicla al siguiente medio de pago en orden
- Visual: boton pill con borde, fondo sutil, icono a la izquierda
- Label de comision debajo en texto muted solo si > 0%
- Si hay 2-3 medios, ciclar es mas rapido que elegir de una grilla

**Estados:**
```
[ 💵 Efectivo ]  →  tap  →  [ 🔄 Transferencia ]  →  tap  →  [ 💳 MP / 3% ]
```

### Paso 3: Boton grande de confirmar

- Ocupa todo el ancho, height ~64px
- Muestra "Cobrar $XX.XXX" cuando ambos estan seleccionados
- Deshabilitado y gris si falta servicio o medio de pago
- Verde neon con glow cuando esta listo
- Estado pending: "Registrando..." con opacity reducida

### Hero de precio (centro del panel)

- Encima de los 3 pasos: numero grande central con el monto
- `font-display text-5xl font-bold text-[#8cff59]`
- Si no hay servicio seleccionado: "--" en zinc-600
- Debajo: label "Servicio + Medio" como resumen en una linea

## Layout completo del panel (vertical, mobile-first)

```
┌──────────────────────────────────┐
│         $12.500                  │  ← hero precio
│    Corte clasico · Efectivo      │  ← resumen
│                                  │
│  [Corte] [C+Barba] [Barba] [..] │  ← scroller horizontal
│                                  │
│     [ 💵 Efectivo ]              │  ← boton ciclador centrado
│       Sin comision               │
│                                  │
│  ┌──────────────────────────┐    │
│  │    Cobrar $12.500        │    │  ← boton confirmar
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

## Criterios de aceptacion

- [ ] El panel entra completo en viewport mobile (375px) sin scroll interno
- [ ] Seleccionar servicio via swipe horizontal funciona con snap
- [ ] Medio de pago se cicla con un toque (no abre otra pantalla/grid)
- [ ] Boton confirmar muestra monto real y envia `servicioId`, `medioPagoId`, `precioCobrado`
- [ ] Estado pending bloquea interaccion y muestra feedback visual
- [ ] Error se muestra inline sin romper el layout
- [ ] El server action `registrarAtencionExpressAction` recibe los mismos campos que antes

## Decisiones validadas (16/04/2026)

- **Full-screen overlay** en vez de modal clasico (tipo app, no tipo web)
- **Scroller horizontal** confirmado — hoy hay 3 servicios pero puede crecer
- Variant `embedded` ya no se necesita (HoyActionStrip desaparece) — el panel siempre se renderiza dentro de un FullScreenOverlay

## Restricciones

- No cambiar la server action — mismo payload, solo cambia la UI
- No agregar dependencias nuevas — solo CSS scroll-snap nativo
