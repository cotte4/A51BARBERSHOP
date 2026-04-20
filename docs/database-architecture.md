# Database Architecture

Updated: 2026-04-20

This document is the operational map for the A51 Barber database. Product truth lives in `../docs/PRD-Plan.md` and live implementation status lives in `../docs/PRD-Live.md`; this file focuses on how the database is shaped and operated.

## Stack

- Database: Neon PostgreSQL
- ORM: Drizzle ORM
- Migration tool: drizzle-kit
- Auth tables: Better Auth through Drizzle adapter
- Runtime access: `src/db/index.ts`
- Schema source: `src/db/schema.ts`
- Migration SQL: `src/db/migrations`

Runtime uses the pooled/serverless Neon connection in `DATABASE_URL`. Drizzle migrations should prefer `DATABASE_URL_UNPOOLED` when available, as configured in `drizzle.config.ts`.

## Domain Shape

The schema is intentionally one database for one shop, not a multi-tenant SaaS model.

### Auth and Actors

- `user`, `session`, `account`, `verification`
- `barberos`

Roles are stored on `user.role` through Better Auth. Operational identity for staff is linked through `barberos.user_id`.

### Core Operations

- `servicios`
- `servicios_adicionales`
- `servicios_precios_historial`
- `medios_pago`
- `atenciones`
- `atenciones_adicionales`
- `atenciones_productos`
- `cierres_caja`

Important rule: monetary rows keep snapshots. A historical attention must not change if service prices, payment fees, or barber commission settings change later.

### Inventory

- `productos`
- `stock_movimientos`

Product sales are represented through `atenciones_productos` and stock movements. Product cost snapshots are required for historical margin accuracy.

### Clients and Marcianos

- `clients`
- `visit_logs`
- `client_profile_events`
- `client_briefing_cache`
- `marciano_beneficios_uso`

`clients.user_id` links a Marciano portal account to the operational client profile. `clients.es_marciano` gates Marciano-only behavior.

### Turnos

- `turnos`
- `turnos_extras`
- `turnos_disponibilidad`
- `turnos_reserva_intentos`

The active-slot uniqueness rule is enforced with a partial unique index on pending/confirmed appointments.

### Music

- `music_provider_connections`
- `music_players`
- `music_mode_state`
- `music_schedule_rules`
- `music_queue_sessions`
- `music_queue_items`
- `music_runtime_status`
- `music_auto_resume_state`
- `music_events`
- `jukebox_proposals`
- `jukebox_queue`

Music state is operational data, not financial data. It can tolerate more recomputation than caja, inventory, and OVNIS.

### Finance and Assets

- `gastos`
- `categorias_gasto`
- `liquidaciones`
- `repago_memas`
- `repago_memas_cuotas`
- `configuracion_negocio`
- `costos_fijos_negocio`
- `costos_fijos_valores`
- `capital_movimientos`
- `barber_shop_assets`
- `barber_shop_asset_payments`

Daily caja and monthly reports must remain explainable from transactional rows plus closing snapshots.
Liquidaciones are generated through `src/lib/liquidaciones-service.ts`; generation uses a per-barber transaction lock before checking overlapping periods.
Repago Memas payments run through `src/lib/repago-service.ts`; payment registration is serialized with a transaction lock.
Marciano style configuration writes run through `src/lib/marciano-style-service.ts`.

### OVNIS

- `ovnis_balance`
- `ovnis_pending_credits`
- `ovnis_transactions`
- `ovnis_redemption_items`
- `ovnis_redemptions`
- `ovnis_ruleta_prizes`
- `ovnis_ruleta_spins`
- `ovnis_games`
- `ovnis_bets`

OVNIS is a closed internal economy. `ovnis_transactions` is the ledger. `ovnis_balance` is a derived/current-state table maintained for fast reads.

## Critical Invariants

### Caja

- `cierres_caja.fecha` is unique.
- A closed day should not accept new caja writes.
- Attention totals must be explainable from `atenciones`, `atenciones_adicionales`, and `atenciones_productos`.
- `cierres_caja.resumen_barberos` is a snapshot of the daily close, not the source for future recomputation.

### Inventory

- Product sales decrement `productos.stock_actual`.
- Product sale stock movements must store the historical unit cost snapshot.
- Stock should not go negative through application flows.
- Caja product writes run inside transactions and stock decrements include an availability guard.
- Admin inventory product/stock writes run through `src/lib/inventario-service.ts`.

### Turnos

- One barber cannot have two active appointments at the same date/time.
- `pendiente` and `confirmado` are active states.
- `completado` and `cancelado` release the active slot.

### Marcianos

- Portal access requires a linked `clients.user_id` and `clients.es_marciano = true`.
- Revoking Marciano status blocks future member-only actions, but should not delete historical rows.

### OVNIS

The economic invariant is:

```text
emittedTotal - burnedTotal == inBalance + inPendingBalance + inPendingRedemptions
```

Pending QR credits are intentionally excluded because they are promised but not issued until scanned. If they expire, they never enter the economy.

## Migration Policy

Use this flow for production-like database changes:

1. Change `src/db/schema.ts`.
2. Generate migration SQL with `npm run db:generate`.
3. Read the generated SQL before applying it.
4. Apply reviewed migrations with `npm run db:migrate`.
5. Run targeted smoke checks.

`npm run db:push` remains available for local iteration and emergency repair only. Do not use it as the normal production path because it bypasses reviewed migration SQL.

## Verification Commands

Use these before deploying database-sensitive work:

```bash
npm run typecheck
npm run test:dal
npm run db:check:ovnis
npm run test:ovnis
npm run lint
npm run build
```

For OVNIS flow-level database smoke testing:

```bash
npm run test:ovnis:flows
npm run db:smoke:ovnis
```

Those scripts touch the live database configured by `.env.local`; check the script behavior before running them against production.

## Cron Jobs

OVNIS scheduled jobs are configured in `vercel.json`:

- `/api/cron/ovnis/refund-bets`
- `/api/cron/ovnis/burn-stale`
- `/api/cron/ovnis/audit`

Vercel Cron invokes paths with `GET`. The route handlers also accept `POST` for manual calls, but `GET` is the production path. All cron routes require:

```text
Authorization: Bearer $CRON_SECRET
```

## Security Model

Current enforcement is application-first:

- Proxy/layouts provide navigation-level gates.
- Server Actions and Route Handlers validate role and actor before mutating.
- `src/lib/dal/authz.ts` is the central server-only actor resolution layer.
- `src/lib/dal/caja.ts` owns caja actor, closed-day, and barber ownership rules.
- `src/lib/dal/clients.ts` owns client visibility/access rules.
- `src/lib/dal/turnos.ts` owns turnos actor/ownership rules.
- Domain helpers such as `admin-action`, `caja-access`, `client-access`, and `marciano-portal` keep their public API but delegate session/role lookup to the DAL.
- Caja pages and actions use the caja DAL for actor and closed-day gates.
- OVNIS admin actions call the DAL directly for admin/asesor checks.

`src/db/rls.sql` currently enables permissive policies as a placeholder/backup and is not strict row-level security. This is acceptable only while all sensitive reads/writes are guarded in application code.

## Next Hardening Phases

### Phase 3 - DAL Authorization

Create a `server-only` data access layer for sensitive domains:

- current actor resolution
- role checks
- row ownership checks
- DTO-shaped reads for client-visible data

Initial status:

- Done: shared actor/session lookup in `src/lib/dal/authz.ts`.
- Done: existing admin/asesor/caja/client/Marciano helpers now use the DAL for session lookup.
- Done: OVNIS admin mutation actions now use direct DAL admin checks.
- Done: client visibility/access rules live in `src/lib/dal/clients.ts`.
- Done: turnos actor/ownership rules live in `src/lib/dal/turnos.ts`.
- Done: caja actor, closed-day, and barber ownership rules live in `src/lib/dal/caja.ts`.
- Done: caja pages and actions now use the caja DAL for actor/session-sensitive gates.
- Done: standalone product-sale writes moved into `src/lib/caja-atencion.ts` and stock decrements are guarded.
- Done: admin inventory writes moved into `src/lib/inventario-service.ts` and use shared admin DAL checks.
- Done: liquidaciones writes moved into `src/lib/liquidaciones-service.ts` with per-barber overlap locking.
- Done: Repago Memas payment writes moved into `src/lib/repago-service.ts` with serialized payment registration.
- Done: Marciano style configuration writes moved into `src/lib/marciano-style-service.ts`.
- Done: DAL ownership predicates have a focused smoke test in `scripts/test-dal-access.ts`.
- Remaining: keep thinning Server Actions so they call DAL/services instead of holding business rules inline.

Prioritize caja, clients, turnos, and OVNIS because they carry money, private client data, or ledger state.

### Phase 4 - Strict RLS

Strict RLS should come after DAL consolidation. Neon pooled connections and per-request session variables must be designed carefully before relying on `current_setting(...)` policies.

Recommended approach:

- Keep app-level DAL checks as the primary readable pattern.
- Add strict RLS for defense in depth.
- Use transaction-local context where possible.
- Add smoke checks proving unauthorized rows are blocked.

## References

- Next.js Route Handlers: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
- Next.js authorization/DAL guidance: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- PostgreSQL row security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
