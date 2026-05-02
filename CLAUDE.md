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

---

## Current State (May 2026)

The app is live on Vercel. Core is mature. Open issues before designer handoff:

### Known bugs / debt
- **Music automation not closed** — `clienteLlegoAction()` fires events to pantalla and `musicEvents` but does NOT trigger real Spotify playback. Treat music as manually supervised for now. See `planning/features/music-auto-jam-completion.md`.
- **Encoding bug on reserva pública** — `src/app/reservar/[slug]/page.tsx` shows corrupted characters in visible text. Fix before designer review.
- **Gastos rápidos migration dependency** — `src/app/(admin)/gastos-rapidos/actions.ts` errors if migration hasn't been applied. Run `db:push` if missing.

### UX maturity by surface
- Operación diaria (hoy, caja, turnos, clientes): **mature**
- Negocio / admin reporting: **mature**
- Configuración: **mature**
- Portal Marciano: **mature**
- Reserva pública: **functional but has encoding bug + needs UX pass**
- Pantalla pública: **functional**
- Música: **functional but automation incomplete**

### Functional gaps (not blocking, but relevant for designer)
- No dedicated reprogramación de turno flow
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
- `src/components/navigation/RoleBottomNav.tsx` is the **only** bottom nav. It renders 5 tabs for barbero and 6 for admin.
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
