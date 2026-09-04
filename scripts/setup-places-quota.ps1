# Places kota + API key kilidi (Google Cloud)
# Once:  gcloud auth login
# Sonra:  powershell -File scripts/setup-places-quota.ps1

$ErrorActionPreference = 'Stop'

Write-Host '→ Hesap / proje kontrol'
$account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $account) {
  Write-Host 'Once giris yap: gcloud auth login'
  exit 1
}
Write-Host "  Hesap: $account"

$project = gcloud config get-value project 2>$null
if (-not $project -or $project -eq '(unset)') {
  Write-Host 'Projeler:'
  gcloud projects list --format="table(projectId,name)"
  $project = Read-Host 'Places icin projectId yaz'
  gcloud config set project $project
}
Write-Host "  Proje: $project"

Write-Host '→ Places API (New) aciliyor'
gcloud services enable places.googleapis.com --project=$project

Write-Host '→ API key listesi'
$keysJson = gcloud services api-keys list --project=$project --format=json 2>$null
if (-not $keysJson) {
  Write-Host 'API Keys API aciliyor...'
  gcloud services enable apikeys.googleapis.com --project=$project
  $keysJson = gcloud services api-keys list --project=$project --format=json
}

$keys = $keysJson | ConvertFrom-Json
if (-not $keys -or $keys.Count -eq 0) {
  Write-Host 'Key yok — olusturuluyor (yalniz Places)'
  gcloud services api-keys create `
    --display-name="filo-places" `
    --api-target=service=places.googleapis.com `
    --project=$project
  $keys = (gcloud services api-keys list --project=$project --format=json) | ConvertFrom-Json
}

foreach ($k in $keys) {
  $name = $k.name
  Write-Host "  Key: $($k.displayName) ($name)"
  # Yalniz Places API
  gcloud services api-keys update $name `
    --clear-restrictions `
    --api-target=service=places.googleapis.com `
    --project=$project 2>$null
}

Write-Host '→ Gunluk kota tavanı (Text Search Pro/Enterprise yaklasik metrikler)'
# Consumer quota update — metrik isimleri projeye gore degisebilir; hata olursa konsoldan Edit.
$metrics = @(
  'places.googleapis.com/textsearch',
  'places.googleapis.com/textsearch_requests',
  'serviceruntime.googleapis.com/api/request_count'
)

# Quotas API ile guvenli dusuk tavan denemesi
try {
  gcloud alpha services quota update `
    --service=places.googleapis.com `
    --consumer=projects/$project `
    --metric=places.googleapis.com/textsearch_requests_per_day `
    --unit=1/d `
    --value=100 `
    --force 2>&1 | Out-Host
} catch {
  Write-Host '  Otomatik kota metrigi bulunamadi — konsoldan ayarla:'
  Write-Host '  https://console.cloud.google.com/google/maps-apis/quotas'
}

Write-Host ''
Write-Host '→ Butce uyarisi icin Billing hesabi gerekir (konsol):'
Write-Host '  https://console.cloud.google.com/billing/budgets'
Write-Host ''
Write-Host 'Tamam. .env icinde GOOGLE_MAPS_API_KEY guncel key ile eslesmeli.'
Write-Host 'Kota UI: https://console.cloud.google.com/google/maps-apis/quotas?project=' + $project
