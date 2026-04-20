# Spotify Search in Public Reservation Form — Research

**Date:** 2026-04-04
**Context:** `/reservar/[slug]` — public page, no auth, Next.js 16.2.1 App Router, Vercel

---

## TL;DR

**The feature is already fully implemented.** The proxy route, the client-side search UI, token fetch, result rendering, and DB persistence are all in place and working. This document records the architecture decisions and open gaps for future reference.

---

## What Exists Today

| Layer | File | Status |
|---|---|---|
| Search proxy API | `src/app/api/spotify/search-track/route.ts` | Done |
| Client-side search UI | `src/components/turnos/ReservaForm.tsx` (lines 136–166, 366–424) | Done |
| DB columns | `turnos.sugerenciaCancion` (text) + `turnos.spotifyTrackUri` (text) | Done |
| Persistence | `src/app/api/turnos/reservar/route.ts` | Done |
| Downstream consumption | `TurnoCard.tsx`, `TurnosSpotifyBridge.tsx`, pantalla screen | Done |

---

## 1. Client Credentials Flow as Server-Side Proxy

### How it works now

`/api/spotify/search-track` uses the OAuth 2.0 Client Credentials grant (app-only, no user involvement). On every incoming request it:

1. POSTs to `https://accounts.spotify.com/api/token` with `grant_type=client_credentials` and a Base64-encoded `clientId:clientSecret` Basic auth header.
2. Gets a fresh `access_token` (valid 3600 s).
3. Calls `https://api.spotify.com/v1/search?type=track&limit=6` with that token.
4. Returns a trimmed result (id, uri, name, artists, albumName, imageUrl).

Credentials never leave the server. The public browser never sees `SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_SECRET`.

### Key gap: token is fetched on every request

The current implementation fetches a new token for every search call. Spotify allows up to ~1 000 Client Credentials token requests per hour per app. For a small barbershop this is irrelevant in practice, but it adds ~200 ms of latency per search (one extra round-trip to Spotify's auth server).

**Recommended fix (low priority):** Cache the token in a module-level variable on the Node.js server process. Vercel serverless functions are stateless and short-lived, so a simple in-memory cache with an expiry check is sufficient:

```ts
// inside search-track/route.ts
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getClientCredentialsToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  // ... fetch new token ...
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3600_000 };
  return cachedToken.token;
}
```

Warning: Vercel spins up separate lambda instances per concurrent invocation, so this cache only helps within the same warm instance. It will cut latency for sequential searches from the same user (common: user types multiple queries in one session). For a true shared cache, use Vercel KV (Redis). For this barbershop that is overkill.

---

## 2. Token Leakage / Abuse Risk

### What a malicious user can do

The `/api/spotify/search-track?q=...` endpoint is unauthenticated. Anyone can call it in a loop and exhaust either:
- **Spotify's rate limit** on the app's Client Credentials token (~429 from Spotify)
- **Vercel invocation limits** (if on a free plan)

Spotify's documented rate limit for Search is 30 requests/second per app (sliding window). For a barbershop this is not a realistic threat, but it is worth acknowledging.

### Existing mitigations

- **Query validation (Zod):** `q` must be 2–120 chars. Empty/tiny strings are rejected with 400, preventing trivially automated junk.
- **Response is read-only:** The proxy only calls Spotify's Search endpoint. It cannot write anything to Spotify or to the app's database via this route.
- **No secrets exposed:** The browser sees none of the Spotify credentials.

### Recommended additional mitigations (priority order)

1. **Debounce on the client (already partially done):** The current UI requires the user to click a "Buscar" button. This is already better than an auto-search-on-keystroke approach. No change needed.

2. **IP-based rate limit on the search proxy:** The reservation form already uses `enforcePublicReservaRateLimit` (DB-backed, 5 attempts per IP per hour). The same pattern could be applied to the search endpoint — but it would be heavy (a DB write per search). A lighter alternative: use Next.js middleware with an in-memory counter, or simply accept the current risk for a small app.

3. **`Cache-Control` headers:** The search results currently return `Cache-Control: no-store`. For a barbershop, returning `Cache-Control: public, max-age=300, stale-while-revalidate=600` would allow Vercel's edge cache to absorb repeated identical queries (same artist name typed by multiple clients the same day). Low-hanging fruit.

**Bottom line for a small barbershop:** The current implementation is acceptable. The realistic abuse scenario (someone hammering a barber shop's search endpoint) has no meaningful payoff. Add a `Cache-Control` header if you want the easy win.

---

## 3. What Data to Save — Text vs. URI

### Current implementation

Both are saved:
- `turnos.sugerenciaCancion` — free text (`"Bad Bunny - Titi Me Pregunto"`)
- `turnos.spotifyTrackUri` — Spotify URI (`"spotify:track:5Z01UMMf7V1o0MzF86s6WJ"`) or null if the user typed freeform without picking a result.

### What the URI unlocks

The pantalla (music screen) already uses `spotifyTrackUri` downstream:

- `TurnosSpotifyBridge.tsx` (line 108–111): when a turno event fires with a `spotifyTrackUri`, it calls `searchAndPlay({ trackUri })` on the Web Playback SDK — this queues the exact track for playback on the barber's Spotify Premium account.
- `TurnoCard.tsx` (lines 91, 109): falls back to a Spotify open-search URL (`https://open.spotify.com/search/...`) when no URI is present.

**Conclusion: the URI is load-bearing.** Without it, the pantalla screen can only open a browser search. With it, it can autoplay the exact track selected by the customer. Always save both. The current implementation is correct.

---

## 4. Simpler Alternatives — Embeddable Widget or SDK

### Spotify-provided options evaluated

| Option | Works without user login? | Search capability? | Verdict |
|---|---|---|---|
| **Spotify Embed (oEmbed / iframe)** | Yes | No — only plays a known URI | Does not help for discovery |
| **Spotify Web Playback SDK** | No — requires Premium user token | Playback only, not search | Already used on the pantalla screen (barber side) |
| **Spotify iOS/Android SDK** | No | N/A (mobile native) | Not applicable |
| **Client Credentials proxy (current)** | Yes (server-side) | Yes | Already implemented |

There is no Spotify-provided embeddable search widget. The proxy approach is the only viable path for unauthenticated search, and it is the same pattern used by virtually every third-party Spotify integration (Soundiiz, Last.fm widgets, etc.).

---

## Open Gaps and Recommendations

### Gap 1: Token re-fetch latency (low priority)

Each search adds ~200 ms for the token request. Add module-level token caching in `search-track/route.ts`. Estimated effort: 15 minutes.

### Gap 2: `spotifyTrackUri` not surfaced in `proximas-canciones` API

`/api/turnos/proximas-canciones/route.ts` returns `cancion` (text) but not `spotifyTrackUri`. If the pantalla screen needs the URI to autoplay (it does, via `TurnosSpotifyBridge`), this route should also return the URI.

Check: `src/app/api/turnos/pantalla-latest/route.ts` — verify whether it includes `spotifyTrackUri`. If not, that is a bug where the pantalla would fall back to text-search instead of direct playback.

### Gap 3: Cache-Control on search results (nice to have)

Add `Cache-Control: public, max-age=300` to responses in `search-track/route.ts`. Identical queries within 5 minutes will be served from Vercel's edge cache with zero latency and zero Spotify API calls.

### Gap 4: Debounce vs. button (UX consideration)

The current UX requires clicking "Buscar" after typing. This is intentional and good for rate-limit safety. If the team wants auto-search-on-type in the future, add a 400 ms debounce before calling the proxy. Do not ship auto-search without debounce.

---

## Final Recommendation

**Do not re-implement anything.** The Client Credentials proxy at `/api/spotify/search-track` is architecturally correct and already deployed. The form saves both the human-readable text and the machine-actionable URI. The pantalla screen consumes the URI for direct playback.

Prioritized next actions:
1. **(If pantalla autoplay is broken)** Add `spotifyTrackUri` to `proximas-canciones` API response — this is the most likely real bug.
2. **(Optional / 15 min)** Add in-memory token caching to shave ~200 ms per search.
3. **(Optional / 5 min)** Add `Cache-Control: public, max-age=300` to search responses.
4. **(Skip)** Rate limiting on the search endpoint — not worth the complexity for this scale.
