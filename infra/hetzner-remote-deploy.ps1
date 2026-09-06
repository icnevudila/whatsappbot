# Hetzner VPS'e wa-service guncelleme (Docker Desktop gerekmez).
#
#   $env:HETZNER_HOST = '167.233.201.31'
#   $env:HETZNER_PASSWORD = '...'   # veya $env:HETZNER_KEY = 'C:\path\to\key'
#   $env:HETZNER_USER = 'root'      # varsayilan
#   powershell -File infra/hetzner-remote-deploy.ps1
#
# Sunucuda: git pull origin/main + docker compose --profile small up -d --build + health.

$ErrorActionPreference = 'Stop'

$hostName = $env:HETZNER_HOST
if (-not $hostName) { $hostName = '167.233.201.31' }
$user = if ($env:HETZNER_USER) { $env:HETZNER_USER } else { 'root' }
$password = $env:HETZNER_PASSWORD
$key = $env:HETZNER_KEY

if (-not $password -and -not $key) {
  Write-Error "HETZNER_PASSWORD veya HETZNER_KEY gerekli."
}

$py = @'
import os, sys, time
import paramiko

host = os.environ["HETZNER_HOST"]
user = os.environ.get("HETZNER_USER", "root")
password = os.environ.get("HETZNER_PASSWORD") or None
key_path = os.environ.get("HETZNER_KEY") or None

REMOTE = r"""
set -euo pipefail
APP=""
for d in /opt/whatsappbot ~/whatsappbot /root/whatsappbot; do
  if [[ -d "$d/.git" ]]; then APP="$d"; break; fi
done
if [[ -z "$APP" ]]; then
  echo "Repo bulunamadi" >&2
  exit 1
fi
cd "$APP"
echo "==> repo: $APP"
git fetch --quiet origin
git reset --hard --quiet origin/main
echo "==> $(git log --oneline -1)"
if [[ ! -f apps/wa-service/.env ]]; then
  echo "apps/wa-service/.env yok" >&2
  exit 1
fi
docker compose -f infra/docker-compose.yml --profile small up -d --build --remove-orphans
echo "==> health wait"
ok=0
for i in $(seq 1 60); do
  st=$(docker inspect -f '{{.State.Health.Status}}' wa-service 2>/dev/null || echo missing)
  if [[ "$st" == "healthy" ]]; then
    curl -fsS http://127.0.0.1:8080/ready || true
    echo
    docker ps --format '{{.Names}} {{.Status}}'
    ok=1
    break
  fi
  if [[ "$st" == "unhealthy" ]]; then
    docker logs --tail 80 wa-service
    exit 1
  fi
  sleep 3
done
if [[ "$ok" != "1" ]]; then
  docker logs --tail 80 wa-service
  exit 1
fi
echo "==> deploy OK"
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
kwargs = dict(hostname=host, username=user, timeout=30, allow_agent=False, look_for_keys=False)
if key_path:
    kwargs["key_filename"] = key_path
else:
    kwargs["password"] = password
print(f"connecting {user}@{host} ...")
client.connect(**kwargs)
stdin, stdout, stderr = client.exec_command(REMOTE, get_pty=True, timeout=900)
out = stdout.read().decode(errors="replace")
err = stderr.read().decode(errors="replace")
code = stdout.channel.recv_exit_status()
print(out[-8000:] if out else "")
if err.strip():
    print("STDERR:", err[-2000:])
client.close()
sys.exit(code)
'@

$tmp = Join-Path $env:TEMP "hetzner-deploy-$PID.py"
Set-Content -Path $tmp -Value $py -Encoding UTF8
$env:HETZNER_HOST = $hostName
$env:HETZNER_USER = $user
try {
  py -3 $tmp
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
