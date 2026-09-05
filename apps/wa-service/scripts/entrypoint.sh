#!/bin/sh
# Benzersiz WORKER_ID: scale replica'larda hostname kullan.
set -eu

if [ "${ROLE:-worker}" = "scaler" ]; then
  export WORKER_ID="${WORKER_ID:-scaler-1}"
elif [ -z "${WORKER_ID:-}" ] || [ "${WORKER_ID}" = "auto" ]; then
  host="$(hostname 2>/dev/null || echo anon)"
  safe="$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | cut -c1-48)"
  export WORKER_ID="worker-${safe:-anon}"
fi

exec node --env-file-if-exists=.env --import tsx src/index.ts
