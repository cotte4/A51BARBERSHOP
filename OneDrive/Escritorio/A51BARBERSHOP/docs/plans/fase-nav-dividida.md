# Plan: Navegación Dividida para Pinky

**Fecha:** 30/03/2026
**Estado:** completado — fix sesión 25: /hoy añadido al nav admin (Pinky es admin+barbero)
**PRD ref:** Sección 8, Fase 1 — Navegación de Pinky

---

## Contexto actual

### Admin (Pinky)
- **Bottom nav** fija con 3 ítems: Inicio (`/dashboard`), Finanzas (`/mi-resultado`), Ajustes (`/configuracion`)
- El dashboard funciona como hub: tiene cards de acceso rápido a Caja, Inventario, Liquidaciones, reportes, etc.
- Componente: `src/components/admin/AdminBottomNav.tsx`
- Diseño: pill flotante dark con accent neon verde (#8cff59)

### Barbero (Gabote)
- **Top nav** inline en header: Caja, Marcianos (+ Turnos y Config si es admin)
- Componente: inline en `src/app/(barbero)/layout.tsx`
- Diseño: dark header con links horizontales

### Problema
Pinky tiene que navegar por el dashboard para encontrar la caja. Lo operativo del día (cobrar un corte, cerrar caja, registrar gasto) está mezclado con lo analítico (P&L, inventario, liquidaciones). Necesita llegar a la caja en 1 tap.

## Objetivo

Dividir la navegación de Pinky en dos secciones claras:
- **Operación del día**: lo que usa minuto a minuto mientras trabaja
- **Gestión del negocio**: lo que consulta cuando quiere analizar o administrar

---

## Cambios

### 1. Rediseño de AdminBottomNav

**Archivo:** `src/components/admin/AdminBottomNav.tsx`

Pasar de 3 ítems genéricos a una nav con **5 ítems** organizados visualmente:

```
┌──────────────────────────────────────────────────────┐
│  ✂️ Caja   📋 Cierre   💸 Gasto  │  📊 Gestión   ⚙️ │
│  ─── operación del día ───────   │  ── negocio ──    │
└──────────────────────────────────────────────────────┘
```

**Ítems de "Operación del día" (izquierda):**

| Ruta | Label | Icono |
|---|---|---|
| `/caja` | Caja | Scissors / ✂️ |
| `/caja/cierre` | Cierre | ClipboardCheck / 📋 |
| `/gastos-rapidos` | Gasto | Cash / 💸 |

**Ítems de "Gestión" (derecha, separados visualmente):**

| Ruta | Label | Icono |
|---|---|---|
| `/dashboard` | Gestión | BarChart / 📊 |
| `/configuracion` | Config | Cog / ⚙️ |

**Separador visual:** línea vertical sutil o gap mayor entre los dos grupos.

**Active state:** mantener el estilo `neon-button` actual para el ítem activo.

**Detección de activo:**
- `/caja` y `/caja/nueva` y `/caja/vender` y `/caja/[id]/editar` → Caja activo
- `/caja/cierre` y `/caja/cierre/[fecha]` → Cierre activo
- `/gastos-rapidos` → Gasto activo
- `/dashboard`, `/liquidaciones`, `/inventario`, `/repago`, `/mi-resultado`, `/turnos`, `/clientes` → Gestión activo
- `/configuracion/*` → Config activo

### 2. Reorganizar el Dashboard como hub de gestión

**Archivo:** `src/app/(admin)/dashboard/page.tsx`

El dashboard deja de ser el punto de entrada principal (eso ahora es `/caja`). Pasa a ser la **vista de gestión del negocio**.

**Cambios:**
- Eliminar los action cards de "Cobrar corte" y "Gasto rápido" del hero (ya están en la bottom nav)
- Mantener la sección de KPIs del día y del mes
- Mantener el grid de links secundarios: Liquidaciones, Inventario, Mi Resultado, Repago, Turnos, Clientes
- Mantener reportes: P&L, Flujo, Temporadas
- Mantener alertas de stock
- Subtitle del BrandMark: "Base de control" → mantener (tiene sentido como hub de gestión)

### 3. Redirect por defecto

**Archivo:** `src/proxy.ts`

Cambiar el redirect de admin al abrir la app:
```ts
// Antes
if (userRole === "admin") return NextResponse.redirect(new URL("/dashboard", ...))

// Después
if (userRole === "admin") return NextResponse.redirect(new URL("/caja", ...))
```

Pinky abre la app → cae directo en la caja. Para ver gestión, toca "Gestión" en la nav.

### 4. Link "Volver" en páginas de gestión

Actualmente varias páginas (mi-resultado, liquidaciones, inventario, etc.) tienen un link "← Dashboard" en el header.

**No cambiar:** el link sigue yendo a `/dashboard` porque desde gestión es lógico volver al hub de gestión. La bottom nav ya cubre la navegación global.

---

## Layout compartido Pinky-Gabote

**No cambiar** el layout de `(barbero)`. Cuando Pinky está en `/caja`, usa el layout de barbero con el header que ya tiene "Caja" y "Marcianos". La bottom nav de admin se superpone (ya lo hace hoy).

Verificar que no haya conflicto visual entre el header del barbero layout y la bottom nav del admin layout cuando Pinky está en `/caja`.

---

## Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/components/admin/AdminBottomNav.tsx` | Rediseño completo: 5 ítems en 2 grupos |
| `src/proxy.ts` | Redirect admin de `/dashboard` a `/caja` |
| `src/app/(admin)/dashboard/page.tsx` | Sacar action cards duplicados |

## Verificación

- [ ] Pinky abre la app → cae en `/caja`
- [ ] Bottom nav muestra 5 ítems con separación visual
- [ ] Caja, Cierre y Gasto están accesibles en 1 tap
- [ ] Dashboard se abre desde "Gestión"
- [ ] Desde Dashboard se navega a Liquidaciones, Inventario, etc.
- [ ] Gabote NO ve la bottom nav de admin
- [ ] Active state correcto en cada ruta
- [ ] Mobile: ítems son touch-friendly (min 44px)
- [ ] `npm run build` sin errores
