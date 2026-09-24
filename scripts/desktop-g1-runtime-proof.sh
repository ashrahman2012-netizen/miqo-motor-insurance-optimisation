#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROOF="$ROOT/dist/desktop-g1-proof"
RUNTIME="$ROOT/dist/desktop-g1/runtime"
mkdir -p "$PROOF"

export DATABASE_URL="postgresql://miqo:miqo@127.0.0.1:5432/miqo"
export MIQO_DATA_CLASSIFICATION=SYNTHETIC
export MIQO_LIVE_PROVIDERS_ENABLED=false
export MIQO_SYNTHETIC_ADMIN_KEY=DB-G10-SYNTHETIC-ADMIN
export CUSTOMER_WEB_URL=http://127.0.0.1:3000
export ADMIN_WEB_URL=http://127.0.0.1:3001

npm run db:migrate

NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 NEXT_PUBLIC_ADMIN_WEB_URL=http://127.0.0.1:3001 NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_GATE=DB-G10-SYNTHETIC-ADMIN npm run build -w @miqo/customer-web

MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_SYNTHETIC_ADMIN_GATE=DB-G10-SYNTHETIC-ADMIN NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_KEY=DB-G10-SYNTHETIC-ADMIN NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 npm run build -w @miqo/admin-web

node scripts/desktop-g1-stage-runtime.mjs
bash scripts/desktop-g1-stage-node.sh

NODE="$RUNTIME/node/node"
test "$("$NODE" --version)" = "v22.16.0"

CUSTOMER_SERVER="$(find "$RUNTIME/customer" -name server.js -type f | head -n 1)"
ADMIN_SERVER="$(find "$RUNTIME/admin" -name server.js -type f | head -n 1)"
test -n "$CUSTOMER_SERVER"
test -n "$ADMIN_SERVER"

mv "$ROOT/node_modules" "$ROOT/node_modules.dev-only"
RESTORED=0
API_PID=""
CUSTOMER_PID=""
ADMIN_PID=""

restore_modules(){
  if [[ "$RESTORED" = "0" && -d "$ROOT/node_modules.dev-only" ]]; then
    mv "$ROOT/node_modules.dev-only" "$ROOT/node_modules"
    RESTORED=1
  fi
}
cleanup(){
  for pid in "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID"; do
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; fi
  done
  wait "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID" 2>/dev/null || true
  restore_modules
}
trap cleanup EXIT

PORT=4000 "$NODE" "$RUNTIME/api/server.mjs" >"$PROOF/api.log" 2>&1 &
API_PID=$!

(
  cd "$(dirname "$CUSTOMER_SERVER")"
  PORT=3000 HOSTNAME=127.0.0.1 "$NODE" server.js
) >"$PROOF/customer.log" 2>&1 &
CUSTOMER_PID=$!

(
  cd "$(dirname "$ADMIN_SERVER")"
  MIQO_DATA_CLASSIFICATION=SYNTHETIC   MIQO_SYNTHETIC_ADMIN_GATE=DB-G10-SYNTHETIC-ADMIN   PORT=3001 HOSTNAME=127.0.0.1 "$NODE" server.js
) >"$PROOF/admin.log" 2>&1 &
ADMIN_PID=$!

for url in http://127.0.0.1:4000/health http://127.0.0.1:3000/prototype http://127.0.0.1:3001/; do
  ready=0
  for _ in $(seq 1 120); do
    if curl --silent --max-time 2 "$url" >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
  done
  [[ "$ready" = "1" ]] || { echo "runtime endpoint failed: $url" >&2; exit 1; }
done

curl --fail --silent http://127.0.0.1:4000/health | tee "$PROOF/api-health.json"
grep -q '"dataClassification":"SYNTHETIC"' "$PROOF/api-health.json"
grep -q '"liveProvidersEnabled":false' "$PROOF/api-health.json"

# Runtime startup succeeded without the repository dependency tree.
test ! -d "$ROOT/node_modules"
printf '{"rootNodeModulesPresent":false,"stagedNode":"v22.16.0","customerStandalone":true,"adminStandalone":true,"apiBundle":true}\n' > "$PROOF/runtime-independence.json"

restore_modules

npx playwright test -c playwright.desktop.config.ts   sp4-customer-recommendation-journey.spec.ts   sp4-admin-end-to-end-trace.spec.ts   db-g10-browser-security.spec.ts   db-g10-synthetic-admin.spec.ts

kill "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID" 2>/dev/null || true
wait "$ADMIN_PID" "$CUSTOMER_PID" "$API_PID" 2>/dev/null || true
API_PID=""; CUSTOMER_PID=""; ADMIN_PID=""

for url in http://127.0.0.1:4000/health http://127.0.0.1:3000/prototype http://127.0.0.1:3001/; do
  if curl --fail --silent --max-time 2 "$url" >/dev/null 2>&1; then
    echo "staged runtime listener remains after shutdown: $url" >&2
    exit 1
  fi
done

printf '{"g1_1":"PASS","g1_2":"PASS","runtime":"standalone-node-sidecar","boundary":"SYNTHETIC_ONLY"}\n' > "$PROOF/g1-runtime-proof.json"
trap - EXIT
cat "$PROOF/g1-runtime-proof.json"
