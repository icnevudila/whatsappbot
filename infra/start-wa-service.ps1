# WhatsApp servisini Docker ile arka planda baslatir (Windows / Oracle ayni compose).
#
# Yerel (Docker Desktop):
#   powershell -File infra/start-wa-service.ps1
#
# Oracle VM (SSH sonrasi):
#   bash infra/deploy.sh
#
# ONEMLI: Ayni anda npm run dev:service CALISTIRMAYIN. Cift worker 440 hatasi uretir.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$envFile = Join-Path $Root 'apps\wa-service\.env'
if (-not (Test-Path $envFile)) {
  Write-Error "apps/wa-service/.env yok. Ornekten kopyalayin: copy apps\wa-service\.env.example apps\wa-service\.env"
}

function Ensure-DockerDesktop {
  try {
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) { return }
  } catch {}

  $dd = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LocalAppData\Docker\Docker Desktop.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1

  if (-not $dd) {
    Write-Error 'Docker Desktop bulunamadi. Kurulum: https://www.docker.com/products/docker-desktop/'
  }

  Write-Host "Docker Desktop baslatiliyor: $dd" -ForegroundColor Yellow
  Start-Process $dd | Out-Null

  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 5
    try {
      docker info 1>$null 2>$null
      if ($LASTEXITCODE -eq 0) {
        Write-Host 'Docker hazir.' -ForegroundColor Green
        return
      }
    } catch {}
    Write-Host "  Docker bekleniyor ($($i + 1)/60)..."
  }

  Write-Error 'Docker Desktop 5 dakikada hazir olmadi.'
}

Ensure-DockerDesktop

Write-Host 'Eski npm/tsx watch process varsa durduruluyor (tek worker).' -ForegroundColor Yellow
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'wa-service|@wa/service|tsx.*src[/\\]index' } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
Start-Sleep -Seconds 1

# Docker Compose WORKER_ID=oracle-1 kullanir; yerel gelistirme ile cakismasin.
docker compose -f infra/docker-compose.yml up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Saglik kontrolu bekleniyor...' -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 3
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/health' -TimeoutSec 5
    Write-Host ($health | ConvertTo-Json -Compress)
    if ($health.healthy -eq $true) {
      $ok = $true
      break
    }
  } catch {
    Write-Host "  henuz hazir degil ($($i + 1)/40)"
  }
}

if (-not $ok) {
  Write-Host 'Saglik kontrolu gecmedi. Son loglar:' -ForegroundColor Red
  docker logs --tail 80 wa-service
  exit 1
}

Write-Host ''
Write-Host 'wa-service Docker ile ayakta (restart: unless-stopped).' -ForegroundColor Green
Write-Host 'Log: docker logs -f wa-service'
Write-Host 'Durdur: docker compose -f infra/docker-compose.yml down'
