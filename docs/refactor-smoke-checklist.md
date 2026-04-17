# Refactor Smoke Checklist

Use this checklist after each scoped refactor slice. The goal is to confirm that the app still compiles and the most sensitive flows still behave correctly.

## Automated Checks

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build` if no other build or dev process is holding the project state

## Manual Smoke: Caja

- [ ] Open `/caja`
- [ ] Confirm movement list renders
- [ ] Confirm quick checkout panel renders without crashing
- [ ] Create or edit one atencion flow up to the confirmation step
- [ ] Validate totals and payment labels still render

## Manual Smoke: Turnos Admin

- [ ] Open `/turnos`
- [ ] Confirm agenda or list loads
- [ ] Trigger a safe interaction that uses current filters or availability views
- [ ] Validate no obvious regressions in action feedback

## Manual Smoke: Reserva Publica

- [ ] Open `/reservar/[slug]`
- [ ] Change service and date
- [ ] Confirm available slots reload
- [ ] Search a Spotify track
- [ ] Submit a reservation through the happy path

## Manual Smoke: Clientes

- [ ] Open one client profile
- [ ] Confirm header, audit data, and visit history render
- [ ] Open post-corte flow and confirm form interactivity

## Manual Smoke: Musica

- [ ] Open `/musica`
- [ ] Confirm dashboard state renders
- [ ] Confirm search and queue controls mount correctly
- [ ] Validate no immediate runtime or hydration errors

## Notes

- If `npm run build` is blocked by another active Next process, record that separately instead of treating it as an application failure.
- Do not batch refactors across `caja`, `reservas`, and `musica` in the same validation pass.
