# Windows'ta wa-service'i arka planda tutar (Docker Desktop kapaliysa).
#
#   powershell -File infra/run-wa-service-windows.ps1
#
# Gorev Zamanlayici ile "oturum acilista" calistirilabilir.
# Oracle Always Free hazir olunca Docker/Oracle kullanin:
#   docs/oracle-kurulum.md + infra/oracle-remote-deploy.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Root 'apps\wa-service\logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$OutLog = Join-Path $LogDir 'service.out.log'
$ErrLog = Join-Path $LogDir 'service.err.log'

$envFile = Join-Path $Root 'apps\wa-service\.env'
if (-not (Test-Path $envFile)) {
  throw 'apps/wa-service/.env gerekli'
}

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'wa-service|@wa/service|tsx.*src[/\\]index' } |
  ForEach-Object {
    Write-Host "Eski process durduruluyor: PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 1

$npmCmd = (Get-Command npm.cmd).Source
$argList = @('run', 'start', '--workspace', '@wa/service')

Write-Host 'wa-service baslatiliyor (arka plan)...' -ForegroundColor Cyan
$proc = Start-Process -FilePath $npmCmd -ArgumentList $argList -WorkingDirectory $Root `
  -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog -WindowStyle Hidden -PassThru

Write-Host "PID $($proc.Id) - log: $OutLog"
Write-Host 'Saglik: http://127.0.0.1:8080/health'

Start-Sleep -Seconds 8
try {
  $h = Invoke-RestMethod 'http://127.0.0.1:8080/health' -TimeoutSec 5
  Write-Host ($h | ConvertTo-Json -Compress) -ForegroundColor Green
} catch {
  Write-Host "Henuz hazir degil; log: $ErrLog" -ForegroundColor Yellow
}
