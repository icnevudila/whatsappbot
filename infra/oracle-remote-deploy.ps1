# Oracle Always Free VM'ye SSH ile deploy.
#
# Kullanim:
#   $env:ORACLE_HOST = 'x.x.x.x'
#   $env:ORACLE_KEY  = 'C:\path\to\ssh-key.key'
#   $env:ORACLE_USER = 'ubuntu'   # varsayilan
#   powershell -File infra/oracle-remote-deploy.ps1
#
# Ilk kurulumda VM'de once oracle-setup.sh calistirilmis olmali
# (docs/oracle-kurulum.md). Bu script repoyu ceker ve deploy.sh kosar.

$ErrorActionPreference = 'Stop'

$hostName = $env:ORACLE_HOST
$key = $env:ORACLE_KEY
$user = if ($env:ORACLE_USER) { $env:ORACLE_USER } else { 'ubuntu' }

if (-not $hostName -or -not $key) {
  Write-Error @"
ORACLE_HOST ve ORACLE_KEY gerekli.

Ornek:
  `$env:ORACLE_HOST = '130.61.x.x'
  `$env:ORACLE_KEY  = '`$HOME\Downloads\ssh-key.key'
  powershell -File infra/oracle-remote-deploy.ps1

VM yoksa Once docs/oracle-kurulum.md adimlarini tamamlayin.
Yerelde Docker ile baslatmak icin: powershell -File infra/start-wa-service.ps1
"@
}

if (-not (Test-Path $key)) {
  Write-Error "SSH anahtari bulunamadi: $key"
}

# Windows icacls kisitlamasi SSH icin sart olabiliyor
icacls $key /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null

$remote = @'
set -euo pipefail
cd ~/whatsappbot
git fetch origin
git reset --hard origin/main
bash infra/deploy.sh
curl -s localhost:8080/health || true
'@

Write-Host "Oracle'a baglaniliyor: ${user}@${hostName}" -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=accept-new "${user}@${hostName}" $remote

Write-Host ''
Write-Host 'Uzak deploy tamam. Yerel npm run dev:service / yerel docker wa-service DURDURULMALI.' -ForegroundColor Yellow
Write-Host '  docker compose -f infra/docker-compose.yml down'
