#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROOF="$ROOT/dist/desktop-g0"
READY="$PROOF/native-ready.txt"
STOP="$PROOF/stop.request"
SHUTDOWN="$PROOF/shutdown.json"
LOG="$PROOF/runtime.log"

rm -rf "$PROOF"
mkdir -p "$PROOF"

export MIQO_DESKTOP_REPO_ROOT="$ROOT"
export MIQO_DESKTOP_MANAGE_POSTGRES=true
export MIQO_DESKTOP_READY_FILE="$READY"
export MIQO_DESKTOP_STOP_FILE="$STOP"
export MIQO_DESKTOP_SHUTDOWN_FILE="$SHUTDOWN"
export MIQO_DATA_CLASSIFICATION=SYNTHETIC
export MIQO_LIVE_PROVIDERS_ENABLED=false
export DATABASE_URL=postgresql://miqo:miqo@127.0.0.1:5432/miqo

cargo build --manifest-path "$ROOT/apps/desktop-runtime/src-tauri/Cargo.toml" --locked

xvfb-run -a "$ROOT/apps/desktop-runtime/src-tauri/target/debug/miqo-desktop-runtime" >"$LOG" 2>&1 &
RUNTIME_PID=$!

cleanup() {
  if kill -0 "$RUNTIME_PID" 2>/dev/null; then
    touch "$STOP" || true
    sleep 2
    kill "$RUNTIME_PID" 2>/dev/null || true
  fi
  docker compose -f "$ROOT/docker-compose.yml" stop postgres >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 180); do
  [[ -f "$READY" ]] && break
  if ! kill -0 "$RUNTIME_PID" 2>/dev/null; then
    cat "$LOG"
    echo "desktop runtime exited before native page readiness" >&2
    exit 1
  fi
  sleep 1
done

[[ -f "$READY" ]] || { cat "$LOG"; echo "native window did not report page load" >&2; exit 1; }

curl --fail --silent http://127.0.0.1:4000/health | tee "$PROOF/api-health.json"
grep -q '"dataClassification":"SYNTHETIC"' "$PROOF/api-health.json"
grep -q '"liveProvidersEnabled":false' "$PROOF/api-health.json"

npx playwright test -c playwright.desktop.config.ts   sp4-customer-recommendation-journey.spec.ts   sp4-admin-end-to-end-trace.spec.ts   db-g10-accessibility.spec.ts   db-g10-browser-security.spec.ts   db-g10-synthetic-admin.spec.ts   db-g10-abuse-regression.spec.ts

touch "$STOP"

for _ in $(seq 1 60); do
  if ! kill -0 "$RUNTIME_PID" 2>/dev/null; then
    break
  fi
  sleep 1
done

if kill -0 "$RUNTIME_PID" 2>/dev/null; then
  cat "$LOG"
  echo "desktop runtime did not terminate cleanly" >&2
  exit 1
fi
wait "$RUNTIME_PID"

[[ -f "$SHUTDOWN" ]] || { cat "$LOG"; echo "shutdown evidence missing" >&2; exit 1; }
grep -q '"clean":true' "$SHUTDOWN"

for url in http://127.0.0.1:4000/health http://127.0.0.1:3000/prototype http://127.0.0.1:3001/; do
  if curl --fail --silent --max-time 2 "$url" >/dev/null 2>&1; then
    echo "orphan service still responding: $url" >&2
    exit 1
  fi
done

if [[ -n "$(docker compose -f "$ROOT/docker-compose.yml" ps --status running -q postgres)" ]]; then
  echo "desktop-owned PostgreSQL is still running" >&2
  exit 1
fi

printf '{"nativeWindow":"PASS","customerJourney":"PASS","adminDiagnostics":"PASS","shutdown":"PASS","boundary":"SYNTHETIC_ONLY"}\n' > "$PROOF/desktop-g0-proof.json"
trap - EXIT
cat "$PROOF/desktop-g0-proof.json"
