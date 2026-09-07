#!/usr/bin/env bash
# Hetzner / VPS: wa-service /ready kontrolü.
# Kullanım:
#   ./scripts/worker-healthcheck.sh
#   WORKER_URL=http://127.0.0.1:8080 ./scripts/worker-healthcheck.sh
#   ./scripts/worker-healthcheck.sh https://worker.example.com
set -euo pipefail

URL="${1:-${WORKER_URL:-http://127.0.0.1:8080}}"
URL="${URL%/}"
READY="${URL}/ready"

code="$(curl -sS -o /tmp/filo-worker-ready.json -w '%{http_code}' --max-time 8 "${READY}" || true)"
body="$(cat /tmp/filo-worker-ready.json 2>/dev/null || true)"

if [[ "${code}" != "200" ]]; then
  echo "FAIL ${READY} → HTTP ${code:-000}"
  [[ -n "${body}" ]] && echo "${body}"
  exit 1
fi

echo "OK ${READY}"
echo "${body}"
exit 0
