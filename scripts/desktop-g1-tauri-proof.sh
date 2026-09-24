#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="$ROOT/dist/desktop-g1/runtime"
PROOF="$ROOT/dist/desktop-g1-tauri-proof"
DATA="$PROOF/pglite-data"
READY="$PROOF/native-ready.txt"
STOP="$PROOF/stop.request"
SHUTDOWN="$PROOF/shutdown.json"
LOG="$PROOF/runtime.log"
POISON="$PROOF/poison-bin"
POISON_LOG="$PROOF/poison-used.log"
BIN="$ROOT/apps/desktop-runtime/src-tauri/target/debug/miqo-desktop-runtime"

rm -rf "$PROOF"
mkdir -p "$PROOF" "$POISON" "$DATA"

for name in node npm npx docker psql pg_ctl postgres; do
  cat >"$POISON/$name" <<EOF
#!/usr/bin/env bash
echo "$name $*" >> "$POISON_LOG"
exit 97
EOF
  chmod +x "$POISON/$name"
done

test -x "$RUNTIME/node/node"
test "$("$RUNTIME/node/node" --version)" = "v22.23.3"
test -x "$BIN"

mv "$ROOT/node_modules" "$ROOT/node_modules.dev-only"
RESTORED=0
RUNTIME_PID=""

restore_modules(){
  if [[ "$RESTORED" = "0" && -d "$ROOT/node_modules.dev-only" ]]; then
    mv "$ROOT/node_modules.dev-only" "$ROOT/node_modules"
    RESTORED=1
  fi
}
cleanup(){
  if [[ -n "$RUNTIME_PID" ]] && kill -0 "$RUNTIME_PID" 2>/dev/null; then
    touch "$STOP" || true
    sleep 2
    kill "$RUNTIME_PID" 2>/dev/null || true
  fi
  restore_modules
}
trap cleanup EXIT

env   PATH="$POISON:$PATH"   MIQO_DESKTOP_RUNTIME_DIR="$RUNTIME"   MIQO_DESKTOP_DATA_DIR="$DATA"   MIQO_DESKTOP_READY_FILE="$READY"   MIQO_DESKTOP_STOP_FILE="$STOP"   MIQO_DESKTOP_SHUTDOWN_FILE="$SHUTDOWN"   MIQO_DATA_CLASSIFICATION=SYNTHETIC   MIQO_LIVE_PROVIDERS_ENABLED=false   xvfb-run -a "$BIN" >"$LOG" 2>&1 &
RUNTIME_PID=$!

for _ in $(seq 1 180); do
  [[ -f "$READY" ]] && break
  if ! kill -0 "$RUNTIME_PID" 2>/dev/null; then
    cat "$LOG"
    echo "distributable Tauri runtime exited before readiness" >&2
    exit 1
  fi
  sleep 1
done

[[ -f "$READY" ]] || { cat "$LOG"; echo "native readiness marker missing" >&2; exit 1; }
grep -q 'loaded=http://127.0.0.1:3000/prototype' "$READY"

curl --fail --silent http://127.0.0.1:4000/health | tee "$PROOF/api-health.json"
grep -q '"dataClassification":"SYNTHETIC"' "$PROOF/api-health.json"
grep -q '"liveProvidersEnabled":false' "$PROOF/api-health.json"
grep -q '"databaseBackend":"pglite"' "$PROOF/api-health.json"

test ! -d "$ROOT/node_modules"
test ! -f "$POISON_LOG"

restore_modules

npx playwright test -c playwright.desktop.config.ts   sp4-customer-recommendation-journey.spec.ts   sp4-admin-end-to-end-trace.spec.ts   db-g10-browser-security.spec.ts   db-g10-synthetic-admin.spec.ts   db-g10-abuse-regression.spec.ts

test ! -f "$POISON_LOG"

touch "$STOP"
for _ in $(seq 1 90); do
  if ! kill -0 "$RUNTIME_PID" 2>/dev/null; then break; fi
  sleep 1
done
if kill -0 "$RUNTIME_PID" 2>/dev/null; then
  cat "$LOG"
  echo "distributable Tauri runtime did not terminate" >&2
  exit 1
fi
wait "$RUNTIME_PID"
RUNTIME_PID=""

[[ -f "$SHUTDOWN" ]] || { cat "$LOG"; echo "shutdown marker missing" >&2; exit 1; }
grep -q '"clean":true' "$SHUTDOWN"
grep -q '"databaseBackend":"pglite"' "$SHUTDOWN"
test -d "$DATA"
test ! -f "$POISON_LOG"

for url in http://127.0.0.1:4000/health http://127.0.0.1:3000/prototype http://127.0.0.1:3001/; do
  if curl --fail --silent --max-time 2 "$url" >/dev/null 2>&1; then
    echo "packaged runtime listener remains after shutdown: $url" >&2
    exit 1
  fi
done

printf '{"g1_5":"PASS","g1_6":"PASS","nativeWindow":"PASS","packagedRuntime":"PASS","hostNodeRequired":false,"hostNpmRequired":false,"dockerRequired":false,"externalPostgresRequired":false,"databaseBackend":"PGLITE","boundary":"SYNTHETIC_ONLY"}\n' > "$PROOF/g1-tauri-proof.json"
trap - EXIT
cat "$PROOF/g1-tauri-proof.json"
