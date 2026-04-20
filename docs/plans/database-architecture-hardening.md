# Database Architecture Hardening

**Status:** In Progress
**Created:** 2026-04-20
**Priority:** High
**Project:** A51 Barber

## Problem Statement

The database architecture is functional and already supports the current operation, but the audit found a few production-hardening gaps:

- OVNIS cron endpoints are configured in Vercel but expose only `POST`, while Vercel Cron invokes `GET`.
- Production migration workflow is not explicit enough; `db:push` exists and can be misused against production.
- The database shape and invariants are spread across PRD/code instead of one operational architecture note.
- RLS exists as a permissive backup, not as row-level authorization enforcement.
- Authorization is mostly enforced near actions and pages; a DAL should gradually centralize sensitive read/write rules.

## Current State

- Stack: Next.js 16, Neon PostgreSQL, Drizzle ORM, Better Auth, Vercel.
- Schema: single source in `src/db/schema.ts`.
- Migrations: generated SQL under `src/db/migrations`.
- OVNIS tables/constraints/indexes exist and pass `npm run db:check:ovnis`.
- Security: route/proxy/action checks are the main enforcement layer; `src/db/rls.sql` is not strict.

## Proposed Solution

Split the fixes into four phases so the production bug gets handled immediately, and security/database refactors remain reviewable.

## Implementation Plan

### Phase 1 - Cron Compatibility

- [x] Add `GET` handlers to OVNIS cron endpoints.
- [x] Keep the existing `POST` handlers as manual/backward-compatible aliases.
- [x] Preserve `CRON_SECRET` authorization checks.
- [x] Verify with typecheck/build.

### Phase 2 - Operating Guardrails

- [x] Add a database architecture document with domains, invariants, live checks, and known risks.
- [x] Document migration policy: generate reviewed migrations for production; reserve `db:push` for local/emergency use.
- [x] Add a `db:migrate` script so the safer production command is visible.

### Phase 3 - DAL Authorization Hardening

- [x] Introduce a `server-only` DAL module for current actor/role resolution.
- [x] Route existing admin/asesor/caja/client/Marciano auth helpers through the DAL.
- [x] Move OVNIS admin actions to direct DAL checks.
- [x] Move client visibility and access checks into `src/lib/dal/clients.ts`.
- [x] Move turnos actor and barber ownership checks into `src/lib/dal/turnos.ts`.
- [x] Move remaining caja-specific sensitive reads/writes behind a domain DAL.
- [x] Route caja pages through the same caja DAL actor/closed-day gates.
- [x] Move standalone product-sale writes into a transactional caja service.
- [x] Guard product stock decrements against concurrent oversell.
- [x] Move admin inventory product/stock writes into a server-only inventory service.
- [x] Route inventory actions through shared admin DAL checks.
- [x] Move liquidaciones generation/payment writes into a server-only finance service.
- [x] Add per-barber transactional locking to prevent overlapping liquidacion races.
- [x] Move Repago Memas payment writes into a server-only transactional service.
- [x] Add a transaction lock to serialize Repago Memas payment registration.
- [x] Move Marciano style configuration writes into a server-only service.
- [x] Remove remaining admin direct session reads from Server Actions.
- [ ] Keep Server Actions as thin mutation boundaries that call DAL/services.
- [x] Add focused tests/smoke checks for role-specific data access.

### Phase 4 - Strict RLS Design

- [ ] Replace permissive `USING (true)` policies with real row filters only after DAL coverage is stable.
- [ ] Decide how to set per-request role/client context with Neon pooling constraints.
- [ ] Keep service-role/admin jobs explicit and auditable.
- [ ] Add a database smoke check that confirms forbidden rows are blocked.

## Technical Details

### Files

- `src/app/api/cron/ovnis/*/route.ts`
- `vercel.json`
- `package.json`
- `docs/database-architecture.md`
- `src/db/rls.sql`
- `src/lib/dal/authz.ts`
- `src/lib/dal/clients.ts`
- `src/lib/dal/caja.ts`
- `src/lib/dal/turnos.ts`
- `src/lib/inventario-service.ts`
- `src/lib/liquidaciones-service.ts`
- `src/lib/repago-service.ts`
- `src/lib/marciano-style-service.ts`
- `scripts/test-dal-access.ts`
- future: more `src/lib/dal/*` domain modules

### Database Changes

No schema migration is required for Phase 1 or Phase 2.

## Testing Plan

- [x] `npm run typecheck`
- [x] `npm run test:dal`
- [x] `npm run db:check:ovnis`
- [x] `npm run test:ovnis`
- [x] `npm run lint`
- [x] `npm run build`

## Success Criteria

- [x] Vercel can invoke OVNIS cron routes with `GET`.
- [x] Manual `POST` cron calls still work.
- [x] Database architecture and migration policy are documented.
- [x] The next security work has a bounded Phase 3/4 path.

## Notes

Strict RLS should not be rushed. The current runtime uses Neon pooled/serverless connections, and any future `SET app.current_role` approach must be designed around transaction/session behavior.
