# Plan: Testing Branch — Seed + Integration + E2E
Date: 28/04/2026
Status: draft

## What this builds

A dedicated `testing` branch with three layers of automated testing that don't exist today:
1. A seed script that populates the DB with a realistic month of A51 activity (both barberos, mixed payment methods, Marciano clients, product sales).
2. Integration tests that assert the financial formulas produce the correct numbers — commissions, cierre diario, BEP, Gabote daily liquidation.
3. End-to-end tests via Playwright that simulate a real user session through the browser (register an atención, close the caja, view the dashboard).

When complete, you can run `npm run test:integration` and know in seconds whether a code change broke the financial logic.

---

## Prerequisites

- [ ] `src/db/seed.ts` already exists and creates users + config — the testing seed builds on top of it (does not replace it)
- [ ] Playwright available as a dev dependency (to be installed in Phase 3)
- [ ] A separate `.env.test` pointing to a test Neon branch (or the same DB with a `test_` prefix on data) — the seed must be safe to re-run without corrupting production data

---

## Phase 1 — Activity Seed Script

**Goal:** One script that inserts a realistic month of operation, runnable via `npx tsx src/db/seed-activity.ts`.

### What to generate

| Entity | Volume | Notes |
|---|---|---|
| Clientes | 20 | Mix: 5 Marcianos, 15 regulares |
| Atenciones (Pinky) | ~60 | Corte and Corte+Barba, all payment methods |
| Atenciones (Gabote) | ~40 | Same services, simulate 60% commission |
| Ventas de productos | ~30 | 2–3 products, mix efectivo/MP QR |
| Cierres diarios | 20 días hábiles | One cierre per working day |
| Gastos rápidos | 8 | Mix fijo/variable |
| Turnos | 15 | Mix: confirmed, cancelled, pending |

### Edge cases to include in seed data

- At least 2 atenciones with `comisionBarberoMonto = null` (incomplete records — tests that the cierre skips aporte for those)
- At least 1 atención paid with Posnet crédito (3.5% fee — tests payment commission math)
- At least 1 Marciano client with consumición (tests Marciano toggle logic)
- At least 1 day where Gabote has 0 atenciones (tests empty day edge case)
- Prices stored as snapshots — one price change mid-month (tests that old atenciones use old price)

### File structure

```
a51-barber/src/db/seed-activity.ts   — main script
a51-barber/src/db/seed-helpers.ts    — shared date helpers, random pickers
```

### How to run

```bash
cd a51-barber
npx tsx src/db/seed-activity.ts
```

Must be idempotent (safe to re-run — deletes testing data before re-inserting, keyed by a `seeded_by = 'test'` marker or a dedicated test client name prefix).

---

## Phase 2 — Integration Tests

**Goal:** TypeScript test functions that import the financial logic directly and assert correct output. No HTTP, no browser. Run via `npx tsx src/tests/integration/run.ts`.

**Framework:** No external test framework needed for Phase 1 — use simple `assert` functions with a custom runner. If Vitest is already in the project, use it; otherwise add it as a dev dependency (it's Vite-native, works with Next.js projects without config).

### Test file structure

```
a51-barber/src/tests/
  integration/
    cierre-finance.test.ts       — buildCierreResumen assertions
    gabote-liquidacion.test.ts   — daily liquidation math
    bep.test.ts                  — break-even point logic
    marciano-beneficios.test.ts  — corte limit + consumicion limit per month
  run.ts                         — test runner (calls all suites, reports pass/fail)
```

### Test cases — cierre-finance.test.ts (highest priority)

```
cierre: Gabote corte $13.000 efectivo
  → comision_gabote = $7.800 (60%)
  → aporte_casa = $5.200 (40%)
  → comision_medio_pago = $0
  → caja_neta = $13.000

cierre: Gabote corte $13.000 MP QR (6%)
  → comision_medio_pago = $780
  → comision_gabote = $7.800 (stays 60% of precio_final, not reduced by fee)
  → aporte_casa = $13.000 - $7.800 - $780 = $4.420

cierre: Pinky corte $13.000 cualquier medio
  → aporte_casa_por_servicio_pinky = 0
  → ingreso_neto_pinky = precio - comision_medio_pago
  → no liquidacion de empleado

cierre: venta producto $5.000, costo $2.000, MP QR
  → venta_bruta = $5.000
  → comision_mp = $300
  → caja_neta_producto = $4.700
  → margen = $4.700 - $2.000 = $2.700

cierre: atencion con comisionBarberoMonto = null
  → aporte_casa skipped for that record
  → other records unaffected

cierre: dia mixto (Pinky 3 cortes + Gabote 2 cortes + 1 venta producto)
  → verify caja_neta_dia = sum of all netos
  → verify aporte_economico_casa_dia = aporte_servicios_gabote + margen_productos
```

### Test cases — gabote-liquidacion.test.ts

```
dia tipico: 5 cortes Gabote, mix efectivo + MP
  → monto_a_pagar = suma(comision_gabote_por_servicio)
  → no alquiler de banco descontado
  → no arrastre de dias previos

dia sin atenciones: Gabote no trabaja
  → liquidacion = $0 (no error, no negative)
```

### Test cases — bep.test.ts

```
BEP mensual basico
  → gastos_fijos + cuota_memas = break_even_total
  → cortes_necesarios = ceil(total / precio_promedio / (1 - comision_gabote_pct))
```

### Test cases — marciano-beneficios.test.ts

```
Marciano: primer corte del mes → beneficio disponible
Marciano: segundo corte del mes → sin beneficio (solo 1 corte gratis por mes)
Marciano: consumicion en dia con corte → disponible
Marciano: consumicion sin corte ese dia → no disponible (depende de regla de negocio vigente)
```

---

## Phase 3 — End-to-End Tests (Playwright)

**Goal:** Simulate real user sessions through the browser. Catches routing errors, form validation bugs, and UI state issues that integration tests miss.

**Dependency:** Install Playwright as dev dependency — `npm install -D @playwright/test`

### File structure

```
a51-barber/src/tests/
  e2e/
    playwright.config.ts
    barbero-caja-flow.spec.ts     — register atencion + view caja
    admin-cierre-flow.spec.ts     — close the day, verify totals shown
    admin-dashboard.spec.ts       — verify KPIs load, no broken numbers
    marciano-portal.spec.ts       — login as Marciano, book a turno
```

### E2E flows to cover

**Flow 1: Barbero registers an atención (happy path)**
1. Login as Gabote
2. Navigate to `/caja/nueva`
3. Fill service, price, payment method
4. Submit → confirm it appears in `/caja`

**Flow 2: Admin closes the day**
1. Login as Pinky
2. Navigate to `/caja/cierre`
3. Verify summary shows correct barbero breakdown
4. Confirm cierre → verify redirect and locked state

**Flow 3: Dashboard loads without errors**
1. Login as Pinky
2. Navigate to `/dashboard`
3. Assert KPI cards render with numeric values (not NaN, not "–")
4. Assert Gabote's summary and Pinky's summary are both present

**Flow 4: Marciano portal**
1. Login as a Marciano test user
2. Navigate to `/marciano`
3. Book a turno
4. Verify confirmation screen

---

## Implementation tasks (ordered)

### Phase 1 — Seed (do this first)
1. Create `seed-helpers.ts` with date generators and random pickers
2. Write `seed-activity.ts` — clients, atenciones, cajas, cierres, gastos
3. Include all edge cases listed above
4. Test: run the script, browse the app, verify it looks lived-in

### Phase 2 — Integration (do after seed exists)
5. Add Vitest as dev dependency (`npm install -D vitest`)
6. Write `cierre-finance.test.ts` — this is the highest priority
7. Write `gabote-liquidacion.test.ts`
8. Write `bep.test.ts`
9. Write `marciano-beneficios.test.ts`
10. Add `"test:integration": "vitest run src/tests/integration"` to `package.json`
11. Run all tests — fix any formula bugs found

### Phase 3 — E2E (do last)
12. Install Playwright, configure `playwright.config.ts`
13. Write `barbero-caja-flow.spec.ts`
14. Write `admin-cierre-flow.spec.ts`
15. Write `admin-dashboard.spec.ts`
16. Write `marciano-portal.spec.ts`
17. Add `"test:e2e": "playwright test"` to `package.json`

---

## Acceptance criteria

- [ ] `npm run test:integration` passes all suites with zero failures
- [ ] Each integration test includes the expected number and the formula it's asserting
- [ ] The activity seed generates at least 20 working days of data
- [ ] E2E: all 4 flows pass on localhost
- [ ] No test modifies production data — all seed data is clearly identifiable and deletable
- [ ] A new developer can run `npx tsx src/db/seed-activity.ts && npm run test:integration` from scratch and see results

---

## Edge cases to handle

- Re-running seed doesn't create duplicate data (idempotent)
- Prices use snapshots — tests verify historical price is used, not current price
- Gabote's `comisionBarberoMonto = null` records don't inflate `aporte_casa`
- Empty day (Gabote didn't work) produces $0 liquidation, not an error
- Timezone: all dates use `America/Argentina/Buenos_Aires`

---

## Out of scope

- Performance / load testing
- Security penetration testing
- Testing music / Spotify flows
- Testing avatar generation (external API, non-financial)
- CI/CD pipeline integration (GitHub Actions) — that's a separate phase
- Visual regression testing
