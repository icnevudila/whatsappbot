# Oracle Always Free VM'ye SSH ile tam deploy.
#
# Ilk kez veya guncelleme:
#   $env:ORACLE_HOST = '130.61.x.x'
#   $env:ORACLE_KEY  = "$HOME\Downloads\ssh-key.key"
#   $env:ORACLE_USER = 'ubuntu'   # varsayilan
#   powershell -File infra/oracle-remote-deploy.ps1
#
# Ne yapar:
#   1) SSH ile ulasilabilirligi dogrular
#   2) Repo yoksa oracle-setup.sh (Docker + clone) kosar
#   3) Yerel apps/wa-service/.env icindeki DATABASE_URL'i sunucuya yazar
#      (sifre diske dusmez; scp ile gonderilir, 600 izin)
#   4) deploy.sh (build + up + health)
#   5) Yerel Docker wa-service'i durdurur (cift worker / 440 onlemi)

$ErrorActionPreference = 'Stop'

$hostName = $env:ORACLE_HOST
$key = $env:ORACLE_KEY
$user = if ($env:ORACLE_USER) { $env:ORACLE_USER } else { 'ubuntu' }
$repoRoot = Split-Path -Parent $PSScriptRoot
$localEnv = Join-Path $repoRoot 'apps\wa-service\.env'

if (-not $hostName -or -not $key) {
  Write-Error @"
ORACLE_HOST ve ORACLE_KEY gerekli.

Ornek:
  `$env:ORACLE_HOST = '130.61.x.x'
  `$env:ORACLE_KEY  = '`$HOME\Downloads\ssh-key.key'
  powershell -File infra/oracle-remote-deploy.ps1

VM yoksa once docs/oracle-kurulum.md (hesap + Ampere A1 + SSH key).
Yerelde gecici: powershell -File infra/start-wa-service.ps1
"@
}

if (-not (Test-Path $key)) {
  Write-Error "SSH anahtari bulunamadi: $key"
}

if (-not (Test-Path $localEnv)) {
  Write-Error "Yerel .env yok: $localEnv (DATABASE_URL buradan sunucuya kopyalanacak)"
}

$databaseUrl = $null
Get-Content $localEnv | ForEach-Object {
  if ($_ -match '^\s*DATABASE_URL=(.+)$') {
    $databaseUrl = $Matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $databaseUrl) {
  Write-Error "Yerel .env icinde DATABASE_URL bos."
}

# Windows SSH icin anahtar izinleri
icacls $key /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null

$sshBase = @(
  '-i', $key,
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', 'ConnectTimeout=20',
  "${user}@${hostName}"
)

Write-Host "Oracle'a baglaniliyor: ${user}@${hostName}" -ForegroundColor Cyan

# 1) Erisim
& ssh @sshBase 'echo ok && uname -m && free -m | head -2'
if ($LASTEXITCODE -ne 0) {
  Write-Error "SSH baglantisi basarisiz. IP, guvenlik listesi (22) ve anahtari kontrol edin."
}

# 2) Ilk kurulum (Docker + repo) gerekirse
$setupRemote = @'
set -euo pipefail
if ! command -v docker >/dev/null 2>&1 || [[ ! -d ~/whatsappbot/.git ]]; then
  echo "==> Ilk kurulum: oracle-setup.sh"
  curl -fsSL https://raw.githubusercontent.com/icnevudila/whatsappbot/main/infra/oracle-setup.sh | bash
else
  echo "==> Docker ve repo mevcut"
fi
id -nG | tr " " "\n" | grep -qx docker || echo "UYARI: docker grubu yok; sudo gerekebilir"
'@

& ssh @sshBase $setupRemote
if ($LASTEXITCODE -ne 0) {
  Write-Error "Kurulum scripti basarisiz."
}

# 3) .env: DATABASE_URL senkron + production sabitleri
$remoteEnvBody = @"
# Oracle wa-service — oracle-remote-deploy.ps1 tarafindan yazildi ($(Get-Date -Format o))
DATABASE_URL=$databaseUrl

WORKER_ID=oracle-1
MAX_SESSIONS=50
LEASE_TTL_SECONDS=60
JOB_POLL_INTERVAL_MS=2000
JOB_BATCH_SIZE=10
CAMPAIGN_TICK_MS=5000
SEND_TIMEOUT_MS=60000
STALE_JOB_SECONDS=300
SHUTDOWN_DRAIN_MS=20000
DB_POOL_MAX=10
PORT=8080
LOG_LEVEL=info
NODE_ENV=production
"@

$tmpEnv = Join-Path $env:TEMP "wa-service-oracle.env"
# Unix LF (Linux .env)
[System.IO.File]::WriteAllText($tmpEnv, ($remoteEnvBody -replace "`r`n", "`n"))

Write-Host 'DATABASE_URL sunucuya kopyalaniyor...' -ForegroundColor Cyan
& scp -i $key -o StrictHostKeyChecking=accept-new $tmpEnv "${user}@${hostName}:~/whatsappbot/apps/wa-service/.env"
Remove-Item $tmpEnv -Force -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0) {
  Write-Error "scp .env basarisiz"
}

& ssh @sshBase 'chmod 600 ~/whatsappbot/apps/wa-service/.env'

# 4) Deploy
$deployRemote = @'
set -euo pipefail
cd ~/whatsappbot
# docker grubu yeni eklendiyse bu oturumda yok; sudo ile dene
if docker info >/dev/null 2>&1; then
  bash infra/deploy.sh
else
  sudo -E bash infra/deploy.sh
fi
echo "--- health ---"
curl -s localhost:8080/health || true
'@

Write-Host 'Uzak deploy (build + up)...' -ForegroundColor Cyan
& ssh @sshBase $deployRemote
if ($LASTEXITCODE -ne 0) {
  Write-Error "Uzak deploy basarisiz."
}

# 5) Yerel cift worker'i kapat
Write-Host ''
Write-Host 'Yerel wa-service durduruluyor (cift WORKER_ID / 440 onlemi)...' -ForegroundColor Yellow
Push-Location $repoRoot
try {
  docker compose -f infra/docker-compose.yml down 2>$null
} catch {
  Write-Host "Yerel docker durdurulurken uyari: $_" -ForegroundColor DarkYellow
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Oracle deploy tamam. Saglik: ssh ... "curl -s localhost:8080/health"' -ForegroundColor Green
Write-Host 'Gunluk: ssh ... "docker logs -f wa-service"' -ForegroundColor Green
