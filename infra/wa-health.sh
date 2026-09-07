#!/usr/bin/env bash
# VPS: wa-service saglik ozeti (docker + /health + /ready).
# Kullanim:
#   bash infra/wa-health.sh
#   bash infra/wa-health.sh 8080 wa-service
set -euo pipefail

PORT="${1:-8080}"
NAME="${2:-wa-service}"

echo "== docker ($NAME) =="
docker inspect -f '{{.Name}} health={{.State.Health.Status}} status={{.State.Status}}' "$NAME" 2>/dev/null \
  || echo "(konteyner yok veya inspect basarisiz)"

echo
echo "== /health =="
if curl -fsS --max-time 8 "http://127.0.0.1:${PORT}/health" -o /tmp/filo-health.json; then
  if command -v jq >/dev/null 2>&1; then
    jq '{healthy,ready,degraded,draining,db,sessions,jobs,uptimeSeconds}' /tmp/filo-health.json
  else
    cat /tmp/filo-health.json
  fi
else
  echo "FAIL /health"
fi

echo
echo "== /ready =="
code="$(curl -sS -o /tmp/filo-ready.json -w '%{http_code}' --max-time 8 "http://127.0.0.1:${PORT}/ready" || true)"
echo "HTTP ${code:-000}"
if command -v jq >/dev/null 2>&1 && [[ -f /tmp/filo-ready.json ]]; then
  jq '{ready,degraded,draining,sessions}' /tmp/filo-ready.json 2>/dev/null || cat /tmp/filo-ready.json
elif [[ -f /tmp/filo-ready.json ]]; then
  cat /tmp/filo-ready.json
fi

[[ "${code}" == "200" ]]
