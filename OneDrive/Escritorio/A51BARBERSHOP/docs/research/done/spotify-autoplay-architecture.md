# Spotify Auto-Play Architecture Research
**Question:** What is the most reliable architecture for auto-playing a specific Spotify track when a barber presses "Llegó"?

**Date:** 2026-04-04
**Codebase state:** Next.js 16.2.1 App Router, Neon/Drizzle, Vercel serverless, Better Auth

---

## Current State Analysis

### What exists today

**Two separate OAuth flows, both browser-only:**

1. `/pantalla` page — Web Playback SDK approach
   - Tokens stored in `localStorage` of the TV browser under `spotify_access_token` / `spotify_refresh_token`
   - SDK initializes a virtual Spotify device ("A51 Barber Pantalla") in the TV browser tab
   - When a `pantallaEvent` is polled, `searchAndPlay()` is called: searches via REST API then calls `PUT /me/player/play` with the SDK's `deviceId`
   - Refresh logic exists but is fragile: if `spotifyReady` is false (SDK not initialized), it falls back to opening a popup or showing a manual URL

2. `/musica` SpotifyStudio — REST API approach
   - Tokens stored in `localStorage` via `spotify-session.ts` (keys: `spotify_access_token`, `spotify_refresh_token`, `spotify_token_expires_at`, `spotify_selected_device_id`)
   - Manages real physical devices via `GET /me/player/devices`
   - Admin selects the physical speaker (`device_id` persisted in localStorage)
   - Full playback control: search, play track, play playlist, pause, skip, etc.
   - Works reliably because it targets a known physical device, not a virtual SDK device

**Critical schema observation:**
The `turnos` table already has `spotify_track_uri` (text) — the URI can be pre-resolved and stored when the barber confirms the turno, so the "Llegó" trigger does not need to search Spotify at fire time.

**The `/api/spotify/search-track` route** uses Client Credentials (app-level token, no user required) to search tracks. This means track URI resolution is possible server-side without any user OAuth token.

**The `/api/spotify/refresh` route** is a pure proxy: it receives a `refreshToken` in the POST body and calls Spotify's token endpoint. It has no DB storage — it just relays the new token to whoever called it.

---

## Option Evaluation

### Option 1 — Keep Web Playback SDK on /pantalla (improve current)

**How it works today:**
- TV browser tab runs the Spotify JS SDK
- SDK registers a virtual device, gets a `device_id`
- On `pantallaEvent` poll hit, `searchAndPlay()` fires: search → REST play call targeting that virtual device
- Audio comes out of the TV's speakers/browser

**Reliability in production (Vercel):**
- The server is irrelevant here — all logic runs client-side in the TV browser. No Vercel constraint applies to the playback call itself.
- However, the SDK has several known failure modes: browser must remain the active tab (not minimized or screen-saver-locked), autoplay policies on some Chromium versions require a prior user gesture before audio starts, `initialization_error` fires silently on non-Premium accounts.
- The 10-second timeout in `spotify-sdk.ts` (`setTimeout` checking `window.Spotify`) is a hard failure path: if the CDN is slow or the TV has a cached stale script, the SDK never initializes.
- `spotifyReady` is a React state flag that must be `true` at poll time. If the tab restarts (TV reboot, browser update, session expiry), `spotifyReady` resets to `false` and playback silently degrades to popup/manual URL.

**Setup complexity:**
- Admin must manually open `/pantalla` on the TV, click "Conectar Spotify", complete OAuth in the TV browser, wait for SDK to initialize, confirm the green status badge.
- Must be repeated after any TV browser session reset.

**Requires Premium?** Yes. The Web Playback SDK is Premium-only. Without it, `account_error` fires and `spotifyReady` stays false.

**Token expiry mid-day:**
- `refreshAccessToken()` in `pantalla/page.tsx` is called automatically when a playback call fails with a 401. This works correctly if the refresh token is still valid.
- The refresh token is not rotated unless Spotify decides to rotate it (the `/api/spotify/refresh` route handles rotation correctly). Risk: if the TV browser clears localStorage (privacy mode, crash, OS update), both tokens are gone and no auto-recovery is possible.

**Text string vs track URI:**
- Currently uses `searchAndPlay(event.cancion, ...)` which searches at play time (text search → first result). Adds ~300–500ms latency and is subject to Spotify search ranking returning the wrong track.
- `spotifyTrackUri` column in `turnos` is already available but not used here.

**Verdict:** Fragile. Works in ideal conditions (TV tab always open, Premium, SDK loaded, user-gestured once). Breaks silently in at least 4 ways.

---

### Option 2 — Server-side token store + Connect API (fire-and-forget from server)

**How it works:**
- OAuth is completed once (from any browser). The callback stores `access_token`, `refresh_token`, `expires_at`, and `device_id` in Neon (new table, e.g. `spotify_session` with a single row).
- When "Llegó" fires → barber's browser calls `POST /api/turnos/:id/llego`
- That API route: (1) reads token from DB, (2) refreshes if expired, (3) calls `PUT https://api.spotify.com/v1/me/player/play` with the stored `device_id` and track URI
- The physical speaker plays the track. No browser dependency.

**Reliability in production (Vercel):**
- Vercel serverless is stateless between requests — no in-memory caching. This is a non-issue here because tokens are read from Neon on every request. Each invocation reads fresh, writes fresh.
- The call chain is: DB read → (optional) Spotify token refresh → Spotify play API. All three are fast HTTP calls. Total latency ~200–600ms. Acceptable for a "Llegó" button press.
- No browser tab, no SDK, no autoplay policy, no localStorage. The physical Spotify device (the speaker) is already active if Spotify is running on it.

**Setup complexity:**
- One-time: Pinky opens `/musica` (or a new `/admin/spotify-connect` page), connects Spotify OAuth. The callback writes tokens + device_id to DB instead of localStorage.
- Admin selects the physical device once in SpotifyStudio — that selection is also persisted to DB.
- Never needs to be repeated unless the refresh token is revoked (Spotify revokes refresh tokens only when the user manually disconnects from Spotify's app permissions page, or after extended inactivity — typically 60+ days for unused tokens).

**Requires Premium?** Yes, `PUT /me/player/play` requires Premium. But this is already the case — the shop has Pinky's Premium account.

**Token expiry mid-day:**
- Access tokens expire after 1 hour. The server-side route must check `expires_at` before calling Spotify. If expired: call `/api/token` with the `refresh_token`, get a new access token, write it back to DB, proceed.
- On Vercel, two simultaneous "Llegó" events could race to refresh the token. This is rare in a barbershop (one barber, one event at a time) but can be avoided with a short DB-level advisory lock or by accepting the race (both get a fresh token, the second write wins, no harm).
- Token rotation: Spotify may return a new `refresh_token` in the refresh response. The server must persist it back to DB. The current `/api/spotify/refresh` proxy already passes through `refreshToken` in the response — a server-side equivalent must do the same.

**Text string vs track URI:**
- Best path: resolve the track URI at turno confirmation time (when the barber enters the song name), not at "Llegó" time. The existing `spotify_track_uri` column in `turnos` is the right place. The existing `/api/spotify/search-track` route uses Client Credentials (no user OAuth) to search — this can be called during turno creation.
- Fallback: if `spotify_track_uri` is null, the "Llegó" server handler calls `/v1/search` with Client Credentials (already implemented) to resolve the text to a URI, then plays it. Adds ~300ms but is self-contained server-side.

**Verdict:** Most reliable architecture. No browser dependency, works even if the TV tab is closed, survives restarts. The only hard dependency is that the physical Spotify device (speaker) must be active (Spotify app running on it).

---

### Option 3 — Unify both OAuth sessions (share SpotifyStudio tokens with /pantalla)

**How it works:**
- Admin connects Spotify once via `/musica`. Tokens in localStorage.
- `/pantalla` page reads those same localStorage tokens via `spotify-session.ts` (same keys).
- On `pantallaEvent`, `/pantalla` calls a new API route `/api/spotify/play` that receives the token from the client and fires `PUT /me/player/play` targeting the stored `device_id`.
- No SDK needed on `/pantalla`.

**Reliability in production (Vercel):**
- Still client-side token storage. The API route itself is stateless — it just proxies the play call. Reliability is still bound to whatever browser has the localStorage.
- `/pantalla` and `/musica` must be opened in the same browser (same origin, same localStorage). If `/pantalla` is on the TV and `/musica` is on the admin's phone, localStorage is not shared.
- If `/musica` is also open on the TV, then the tokens are in the TV's localStorage and `/pantalla` can read them. But this requires the admin to always connect Spotify on the TV — not the admin's phone or laptop.

**Setup complexity:**
- Admin must connect Spotify on the TV browser (same device as `/pantalla`). This defeats the purpose of having a separate admin panel.
- Alternatively: use a URL param or QR code to pass tokens from `/musica` to `/pantalla` — but that's a security problem (tokens in URLs are exposed in server logs and browser history).

**Requires Premium?** Yes.

**Token expiry mid-day:**
- Same as Option 1: the TV browser's localStorage refresh logic applies. No improvement over the current state.

**Text string vs track URI:**
- Same as current: search at play time unless `spotifyTrackUri` is pre-resolved.

**Verdict:** A half-measure. It removes the SDK dependency but keeps the browser/localStorage dependency. It does not solve the fundamental reliability problem. It also creates a setup constraint that conflicts with the admin UX (admin must be on the TV to connect).

---

## Recommendation: Option 2

**Option 2 (server-side token store + Connect API) is the clear winner.**

### Why

1. **No browser dependency for playback.** Once the token and device_id are in the DB, any "Llegó" press from any barber's phone fires the track. The TV screen does not need to be open. The Spotify SDK does not need to be loaded.

2. **Survives everything.** TV reboot, browser crash, screen saver, OS update — none of these affect playback. The only thing that can break it is (a) Spotify Premium lapsing, (b) the physical speaker going offline, or (c) the refresh token being manually revoked.

3. **One-time admin setup.** Pinky connects Spotify once from any browser. Done. The session lives in the DB.

4. **Vercel serverless is perfectly suited for this.** Each "Llegó" request reads fresh tokens from Neon, refreshes if needed, writes back, fires the play call. No in-memory state required. Latency is acceptable.

5. **Pre-resolved track URIs eliminate search latency.** The `spotify_track_uri` column already exists in `turnos`. Use the existing `/api/spotify/search-track` (Client Credentials) at turno confirmation time to resolve the text to a URI. "Llegó" becomes a pure play call with a known URI — no search step, sub-200ms response.

### How token refresh works in Vercel serverless

There is no in-memory cache between requests. Every invocation is cold. The pattern is:

```
GET spotify_session from DB
  → if access_token_expires_at < now + 30s:
      POST https://accounts.spotify.com/api/token (refresh_token from DB)
      → write new access_token, expires_at, and (if returned) new refresh_token back to DB
PUT https://api.spotify.com/v1/me/player/play (access_token, device_id, track_uri)
```

The DB write-back of the refreshed token is critical. Without it, every request would refresh (hitting Spotify's rate limits) and eventually the refresh token would be invalidated. With it, the access token is valid for 1 hour and the DB is the single source of truth.

### What the DB schema needs

A new table (single row, identified by a constant key like `'default'`):

```sql
CREATE TABLE spotify_session (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ,
  device_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

This is minimal and adds no complexity to the existing Drizzle schema.

### What the admin setup flow looks like

1. Admin opens `/musica` (SpotifyStudio) — already exists.
2. Clicks "Conectar Spotify" — already exists. The OAuth callback (`/api/spotify/callback`) currently redirects with tokens in the URL query string. It needs one change: also write the tokens to the new `spotify_session` DB table before redirecting.
3. Admin selects the physical speaker in SpotifyStudio — the `pickDevice` action also writes `device_id` to `spotify_session`. No new UI required.
4. From this point, "Llegó" works server-side forever (until refresh token is revoked).

### What happens when the track is a text string (not a URI)

- If `turnos.spotify_track_uri` is pre-populated (best case): the "Llegó" handler uses it directly.
- If `spotify_track_uri` is null: the handler calls `GET /v1/search?q=...&type=track` using a Client Credentials token (already implemented in `/api/spotify/search-track`). Takes ~300ms extra. Still fully server-side, no browser involved.

### The /pantalla page in Option 2

The `/pantalla` page becomes display-only: it polls `pantallaEvents`, shows the track name/client, renders the QR code for voting, displays the album art. The `spotifyReady` / SDK initialization blocks can be removed entirely. The TV browser no longer needs Spotify credentials. This is a significant simplification.

---

## Summary Table

| Criterion | Option 1 (SDK) | Option 2 (Server DB) | Option 3 (Unified localStorage) |
|---|---|---|---|
| Browser must be open for playback | Yes (TV tab) | No | Yes (TV tab) |
| Survives TV reboot | No | Yes | No |
| Requires SDK initialization | Yes | No | No |
| Single OAuth setup | No (TV only) | Yes (any browser) | No (TV only) |
| Token storage | TV localStorage | Neon DB | TV localStorage |
| Vercel serverless compatible | N/A (client-side) | Yes, by design | N/A (client-side) |
| Pre-resolve track URI possible | Yes (partial) | Yes (cleanest) | Yes (partial) |
| Admin setup steps | 3 (TV browser) | 1 (any browser) | 2 (TV browser) |
| Silent failure modes | 4+ | 1 (speaker offline) | 3+ |
| Code changes required | Medium | Medium + 1 DB table | Small |
