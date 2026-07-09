# Internal Support Copilot Knowledge (Curated)

This document is the curated knowledge source for the internal copilot.  
It is intentionally concise and operational, not a full PRD dump.

## Operating Scope

- Audience: `barbero`, `asesor`, `admin`.
- Excluded: public client-facing Marciano surfaces.
- Route scope: `/hoy`, `/caja`, `/clientes`, `/turnos`, `/musica`, `/dashboard`, `/negocio`, `/configuracion`, `/liquidaciones`, `/inventario`, `/repago`, `/mi-resultado`, `/gastos-rapidos`, `/finanzas`.

## Supported Intents

- `how_to_use`: quick guidance and deep links by current route.
- `bug_report`: structured bug intake with expected vs actual.
- `feature_request`: structured product gap proposal.
- `implementation_idea`: structured technical proposal with impact.

## Guidance Principles

- Keep responses short and actionable.
- Prefer route-aware deep links instead of long explanations.
- Route users into structured forms so reports are triage-ready.
- Never expose sensitive or non-internal data in responses.

## Current Deep-Link Catalog

- Caja: `/caja`, `/caja/nueva`, `/caja/vender`
- Turnos: `/turnos`, `/turnos/disponibilidad`
- Clientes: `/clientes`, `/clientes/nuevo`
- Negocio: `/negocio`, `/negocio/soporte`, `/negocio/go-live`
