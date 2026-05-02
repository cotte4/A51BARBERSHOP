# A51 Testing Checklist — Pre-Designer Handoff

Fecha: May 2026. Run through every surface before handing off to the designer. Log any break with the route + what happened.

## Bugs found during testing

1. **`/musica` hydration error #418** — `formatDateTime` in `MusicOperationConsole` used `Intl.DateTimeFormat` without `timeZone`, causing SSR/client mismatch. **Fixed 2026-05-02** (commit `1429419`).
2. **`Salir` button intercepted** — `FullScreenOverlay` kept `fixed inset-0 z-50` active on closed state (`translate-y-full`), eating pointer events on iOS. **Fixed 2026-05-02** (commit `1429419`), added `pointer-events-none` when closed.
3. **Liquidaciones PDF** — `Descargar PDF` on `/liquidaciones/[id]` downloaded as `.txt` in Playwright. Likely client-side PDF generation (print API). **Verify in real browser** before marking resolved.
4. **TEST artifact** — `TEST - Borrar (editado)` product created in inventario during testing. Delete manually from `/inventario`.

---

## 1. Auth & access

- [ ] Login as admin → lands on `/hoy`
- [ ] Login as barbero → lands on `/hoy`, no negocio tab visible
- [ ] Logout → lands on landing or login
- [ ] Marciano login → lands on `/marciano`
- [ ] Unauthenticated access to `/hoy` → redirects to login
- [ ] Unauthenticated access to `/negocio` → redirects

---

## 2. Home operativo — `/hoy`

- [ ] Foco del momento renders correctly
- [ ] Movimientos recientes appear
- [ ] Alertas de turnos/stock/cierre show if applicable
- [ ] Métricas rápidas del día populate
- [ ] Atención express registro works
- [ ] Resumen mensual personal visible for linked barbero

---

## 3. Caja

- [ ] `/caja` loads today's caja state
- [ ] Nueva atención: open as modal from caja, fill form, submit → appears in caja
- [ ] Venta de producto: open as modal, select product, submit → stock decrements
- [ ] Editar atención: edit an existing entry → changes persist
- [ ] Anular atención: anular → entry marked correctly
- [ ] Cerrar caja: close today → generates cierre record
- [ ] Cierre PDF: download PDF of a past cierre → file downloads correctly

---

## 4. Clientes

- [ ] `/clientes` list loads with search working
- [ ] RetentionBanner appears (if there are candidates)
- [ ] Alta de cliente: create new → appears in list
- [ ] Perfil: open a client → all sections load (datos, historial, auditoría, avatar)
- [ ] Avatar upload: upload photo → updates
- [ ] Activar/quitar Marciano: toggle and verify state change
- [ ] Post-corte form: submit → saves
- [ ] Archivar cliente: archive → removed from main list

---

## 5. Turnos — `/turnos` (admin)

- [ ] Agenda loads for today's date
- [ ] Filtros por estado work (pendiente, confirmado, etc.)
- [ ] Scope personal/equipo toggle works
- [ ] Timeline por bloques renders correctly
- [ ] Quick create on a free slot → creates turno
- [ ] Confirmar turno → status changes
- [ ] Rechazar turno → status changes
- [ ] Completar turno → status changes
- [ ] "Cliente llegó" event → fires event (check pantalla if possible)
- [ ] Disponibilidad: generate slots → appear in agenda
- [ ] Borrar slots no ocupados → clears correctly

---

## 6. Reserva pública — `/reservar/[slug]`

- [ ] Page loads without encoding errors (THIS IS A KNOWN BUG — log it)
- [ ] Service selection works
- [ ] Extras selection works
- [ ] Form submit → turno created as pendiente
- [ ] Invalid/missing slug → 404 or redirect

---

## 7. Música — `/musica`

- [ ] Page loads, shows current mode (Auto / Soy DJ / Jam)
- [ ] Mode switch works
- [ ] Spotify search: search a track → results appear
- [ ] Add to queue → appears in queue
- [ ] Pause/resume controls respond
- [ ] Skip works
- [ ] Estado del runtime/provider/player shows accurate state
- [ ] NOTE: Auto playback on "cliente llegó" is NOT expected to work yet — log as known gap, not a bug

---

## 8. Pantalla pública — `/pantalla`

- [ ] Page loads and polls for latest llegada
- [ ] QR para votar renders
- [ ] Próximas canciones list shows
- [ ] Ranking del mes shows
- [ ] `/pantalla/votar/[eventId]` loads and accepts a vote

---

## 9. Portal Marciano

- [ ] `/marciano/registro` → register a new Marciano → confirmation
- [ ] `/marciano/login` → login with Marciano account
- [ ] Portal home: perfil, turnos, beneficios load
- [ ] Nuevo turno from Marciano portal → creates with `prioridad_absoluta` flag
- [ ] Cambiar contraseña flow works
- [ ] Recuperar contraseña flow: sends email (or mock)

---

## 10. Admin — Negocio & Reporting

- [x] `/negocio` hub loads (plata hoy, pagos equipo, stock crítico, gastos, cuotas)
- [x] `/dashboard` loads KPIs
- [x] `/dashboard/flujo` loads monthly flow
- [x] `/dashboard/pl` loads P&L, CSV export downloads, PDF downloads
- [x] `/dashboard/temporadas` loads

---

## 11. Inventario

- [x] List loads with products
- [x] Alta de producto → appears in list
- [x] Detalle + movimiento → stock changes correctly
- [x] Editar producto → changes persist
- [x] Rotación view loads

---

## 12. Liquidaciones

- [x] List loads
- [ ] Nueva liquidación: create → appears (skipped — existing data sufficient)
- [x] Detalle loads — PDF triggered but downloaded as `.txt` in Playwright; verify in real browser (see bug #3)

---

## 13. Gastos

- [x] Gastos rápidos FAB opens modal → log a gasto → appears in historial
- [x] Gastos fijos: list, edit → work (`/configuracion/gastos-fijos`, not `/gastos-fijos`)
- [x] Repago Memas: page loads, cronograma de 12 cuotas visible, registrar pago form works

---

## 14. Configuración

- [x] Barberos: list loads (Gabote + Pinky), Editar links present
- [x] Servicios: list loads (4 activos), precios + historial de cambios visible
- [ ] Adicionales: not tested individually — visible in servicios list
- [x] Medios de pago: list loads (5/5 activos, comisiones)
- [x] Temporadas: list loads (Otoño 2026 activa), Editar/Eliminar present
- [x] Configuración música: Spotify conectado + player esperado visible

---

## Post-checklist: Designer prep

After all items above are logged:
1. Fix encoding bug on `/reservar/[slug]` — highest priority visual issue
2. Document which screens have UX debt (use `docs/feature-map-ux.md` section 5 as the list)
3. Take screenshots of every surface for the Figma handoff
4. Give designer access to the Vercel URL + a test barbero account + a test admin account
