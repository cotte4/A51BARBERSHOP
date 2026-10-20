#!/usr/bin/env bash
# Levanta la app en localhost:3000 contra el branch de Neon "qa-agentes" (.env.qa.local), nunca prod.
# Las variables de proceso ganan sobre .env.local en Next; las vacías apagan todo lo que sale afuera
# (Spotify, mails, IA, Replicate, Blob, webhook de bugs, YouTube).
set -euo pipefail
cd "$(dirname "$0")/.."

PROD_ENDPOINT="ep-cold-darkness-ac2v9rww"
# Línea por línea y no con `source`: las URLs de Neon traen `&`, que bash leería como comando.
while IFS='=' read -r clave valor; do
  [[ -z "$clave" || "$clave" == \#* ]] && continue
  export "$clave=${valor%$'\r'}"
done < .env.qa.local
if [[ -z "${DATABASE_URL:-}" || "$DATABASE_URL" == *"$PROD_ENDPOINT"* ]]; then
  echo "Frenado: DATABASE_URL no es el branch de QA." >&2
  exit 1
fi

export PORTAL_CLIENTE_ABIERTO=true
export BETTER_AUTH_URL=http://localhost:3000
export NEXT_PUBLIC_APP_URL=http://localhost:3000
export INTERNAL_SUPPORT_DISABLE_LLM=true
for v in SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET NEXT_PUBLIC_SPOTIFY_CLIENT_ID RESEND_API_KEY RESEND_FROM_EMAIL \
  ANTHROPIC_API_KEY REPLICATE_API_TOKEN REPLICATE_WEBHOOK_SIGNING_SECRET BLOB_READ_WRITE_TOKEN \
  INTERNAL_BUG_WEBHOOK_URL YOUTUBE_API_KEY YOUTUBE_API_KEY_BEATS NEXT_PUBLIC_YOUTUBE_API_KEY CRON_SECRET; do
  export "$v="
done
unset QA_PASSWORD

exec npx next dev -p 3000
