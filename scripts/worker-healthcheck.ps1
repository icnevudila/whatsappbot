# Hetzner / VPS: wa-service /ready kontrolu (Windows).
# Kullanim:
#   .\scripts\worker-healthcheck.ps1
#   .\scripts\worker-healthcheck.ps1 -Url http://127.0.0.1:8080
param(
  [string]$Url = $(if ($env:WORKER_URL) { $env:WORKER_URL } else { 'http://127.0.0.1:8080' })
)

$base = $Url.TrimEnd('/')
$ready = "$base/ready"

try {
  $resp = Invoke-WebRequest -Uri $ready -UseBasicParsing -TimeoutSec 8
  Write-Host "OK $ready → $($resp.StatusCode)"
  if ($resp.Content) { Write-Host $resp.Content }
  exit 0
} catch {
  $code = $null
  if ($_.Exception.Response) {
    $code = [int]$_.Exception.Response.StatusCode
  }
  Write-Host "FAIL $ready → HTTP $($code ?? '000')"
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  elseif ($_.Exception.Message) { Write-Host $_.Exception.Message }
  exit 1
}
