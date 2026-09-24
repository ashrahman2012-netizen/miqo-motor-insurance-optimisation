#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROOF="$ROOT/dist/desktop-g1-pglite-proof"
RUNTIME="$ROOT/dist/desktop-g1/runtime"
DATA="$PROOF/pgdata"
mkdir -p "$PROOF"

export MIQO_DATA_CLASSIFICATION=SYNTHETIC
export MIQO_LIVE_PROVIDERS_ENABLED=false

NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 \
NEXT_PUBLIC_ADMIN_WEB_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_GATE=DB-G10-SYNTHETIC-ADMIN \
npm run build -w @miqo/customer-web

MIQO_DATA_CLASSIFICATION=SYNTHETIC \
MIQO_SYNTHETIC_ADMIN_GATE=DB-G10-SYNTHETIC-ADMIN \
NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_KEY=DB-G10-SYNTHETIC-ADMIN \
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 \
npm run build -w @miqo/admin-web

node scripts/desktop-g1-stage-runtime.mjs
bash scripts/desktop-g1-stage-node.sh

NODE="$RUNTIME/node/node"
CUSTOMER_SERVER="$RUNTIME/customer/apps/customer-web/server.js"
ADMIN_SERVER="$RUNTIME/admin/apps/admin-web/server.js"

mv "$ROOT/node_modules" "$ROOT/node_modules.dev-only"
RESTORED=0
API_PID=""; CUSTOMER_PID=""; ADMIN_PID=""
restore_modules(){
  if [[ "$RESTORED" = "0" && -d "$ROOT/node_modules.dev-only" ]]; then mv "$ROOT/node_modules.dev-only" "$ROOT/node_modules"; RESTORED=1; fi
}
cleanup(){
  for pid in "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID"; do [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true; done
  wait "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID" 2>/dev/null || true
  restore_modules
}
trap cleanup EXIT

MIQO_PGLITE_DATA_DIR="$DATA" \
MIQO_MIGRATIONS_DIR="$RUNTIME/api/migrations" \
"$NODE" "$RUNTIME/api/migrate-pglite.mjs" | tee "$PROOF/migration.log"

start_api(){
  MIQO_DB_BACKEND=pglite \
  MIQO_PGLITE_DATA_DIR="$DATA" \
  MIQO_DATA_CLASSIFICATION=SYNTHETIC \
  MIQO_LIVE_PROVIDERS_ENABLED=false \
  MIQO_SYNTHETIC_ADMIN_KEY=DB-G10-SYNTHETIC-ADMIN \
  CUSTOMER_WEB_URL=http://127.0.0.1:3000 \
  ADMIN_WEB_URL=http://127.0.0.1:3001 \
  PORT=4000 "$NODE" "$RUNTIME/api/server.cjs" >"$PROOF/api.log" 2>&1 &
  API_PID=$!
}
start_api
(
  cd "$(dirname "$CUSTOMER_SERVER")"
  PORT=3000 HOSTNAME=127.0.0.1 "$NODE" server.js
) >"$PROOF/customer.log" 2>&1 &
CUSTOMER_PID=$!
(
  cd "$(dirname "$ADMIN_SERVER")"
  MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_SYNTHETIC_ADMIN_GATE=DB-G10-SYNTHETIC-ADMIN \
  PORT=3001 HOSTNAME=127.0.0.1 "$NODE" server.js
) >"$PROOF/admin.log" 2>&1 &
ADMIN_PID=$!

for url in http://127.0.0.1:4000/health http://127.0.0.1:3000/prototype http://127.0.0.1:3001/; do
  ready=0
  for _ in $(seq 1 120); do
    if curl --silent --max-time 2 "$url" >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
  done
  [[ "$ready" = "1" ]] || { cat "$PROOF/api.log"; exit 1; }
done

curl --fail --silent http://127.0.0.1:4000/health | tee "$PROOF/api-health.json"
grep -q '"databaseBackend":"pglite"' "$PROOF/api-health.json"
test ! -d "$ROOT/node_modules"

PROFILE_JSON="$(curl --fail --silent -X POST http://127.0.0.1:4000/profiles)"
printf '%s' "$PROFILE_JSON" > "$PROOF/profile.json"
PROFILE_ID="$(printf '%s' "$PROFILE_JSON" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).profileId))')"
VERSION_ID="$(printf '%s' "$PROFILE_JSON" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).versionId))')"

curl --fail --silent -X PUT -H 'content-type: application/json' -d '{"value":"DRV-SYN-G1"}' "http://127.0.0.1:4000/profile-versions/$VERSION_ID/facts/main_driver_id" >/dev/null
curl --fail --silent -X PUT -H 'content-type: application/json' -d '{"value":8000}' "http://127.0.0.1:4000/profile-versions/$VERSION_ID/facts/annual_mileage" >/dev/null
curl --fail --silent -X PUT -H 'content-type: application/json' -d '{"value":"2018-04-16"}' "http://127.0.0.1:4000/profile-versions/$VERSION_ID/facts/licence_held_since" >/dev/null
curl --fail --silent -X POST "http://127.0.0.1:4000/profiles/$PROFILE_ID/validate" >/dev/null
curl --fail --silent -X POST "http://127.0.0.1:4000/profiles/$PROFILE_ID/lock" >/dev/null

kill "$API_PID"; wait "$API_PID" || true; API_PID=""
start_api
for _ in $(seq 1 120); do curl --fail --silent http://127.0.0.1:4000/health >/dev/null 2>&1 && break; sleep 1; done
curl --fail --silent -H 'x-miqo-synthetic-admin: DB-G10-SYNTHETIC-ADMIN' "http://127.0.0.1:4000/admin/profiles/$PROFILE_ID" | tee "$PROOF/restart-profile.json"
grep -q '"LOCKED"' "$PROOF/restart-profile.json"

restore_modules

npx playwright test -c playwright.desktop.config.ts \
  sp4-customer-recommendation-journey.spec.ts \
  sp4-admin-end-to-end-trace.spec.ts \
  db-g10-synthetic-admin.spec.ts \
  db-g10-abuse-regression.spec.ts

kill "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID" 2>/dev/null || true
wait "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID" 2>/dev/null || true
API_PID=""; CUSTOMER_PID=""; ADMIN_PID=""

printf '{"g1_3":"PASS","g1_4":"PASS","databaseBackend":"PGLITE","externalPostgresRequired":false,"dockerRequired":false,"restartPersistence":"PASS","boundary":"SYNTHETIC_ONLY"}\n' > "$PROOF/pglite-proof.json"
trap - EXIT
cat "$PROOF/pglite-proof.json"
