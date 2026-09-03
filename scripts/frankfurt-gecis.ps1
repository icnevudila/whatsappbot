<#
.SYNOPSIS
  Yeni (Frankfurt) Supabase projesine gecisi tek komutta yapar.

.DESCRIPTION
  Seul'deki proje bos oldugu icin veri tasimasi YOK. Yapilmasi gereken tek sey
  14 migration dosyasini yeni projeye uygulamak ve iki .env dosyasini yeni
  bilgilerle guncellemek.

  Script her adimi dogruluyor: baglanti kurulamazsa veya tablolar olusmazsa
  .env dosyalarina DOKUNMUYOR. Boylece yarim kalmis bir gecis, calisan
  yapilandirmayi bozmuyor.

.PARAMETER ProjectRef
  Yeni projenin referansi. Supabase panelinde Project Settings -> General
  icinde "Reference ID" olarak gecer. 20 harflik bir dizi.

.PARAMETER DbPassword
  Yeni projeyi kurarken belirlediginiz veritabani sifresi.

.PARAMETER PublishableKey
  Project Settings -> API Keys -> publishable key (sb_publishable_ ile baslar).

.EXAMPLE
  .\scripts\frankfurt-gecis.ps1 -ProjectRef abcdefghijklmnopqrst -DbPassword 'sifre' -PublishableKey 'sb_publishable_...'
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ProjectRef,
  [Parameter(Mandatory = $true)][string]$DbPassword,
  [Parameter(Mandatory = $true)][string]$PublishableKey,

  # Frankfurt'ta acilan projeler bu pooler bolgesine duser. Baska bir bolge
  # secerseniz Supabase panelindeki Connect ekranindan dogru host'u alip
  # buraya verin.
  [string]$PoolerHost = 'aws-0-eu-central-1.pooler.supabase.com'
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Step { param([string]$m) Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok   { param([string]$m) Write-Host "    $m" -ForegroundColor Green }
function Die  { param([string]$m) Write-Host "`nHATA: $m" -ForegroundColor Red; exit 1 }

# --- Girdi kontrolu --------------------------------------------------------

if ($ProjectRef -notmatch '^[a-z]{20}$') {
  Die "Proje referansi 20 kucuk harften olusmali. Verilen: '$ProjectRef'"
}
if ($PublishableKey -notmatch '^sb_publishable_') {
  Die "Publishable anahtar 'sb_publishable_' ile baslamali. secret anahtari vermeyin."
}

# Sifredeki ozel karakterler baglanti dizesini bozar; URL kodlamasi sart.
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($DbPassword)

$dbUrl = "postgresql://postgres.${ProjectRef}:${encodedPassword}@${PoolerHost}:5432/postgres"
$apiUrl = "https://${ProjectRef}.supabase.co"

Step "Hedef proje: $ProjectRef ($PoolerHost)"

# --- 1. Migrationlari uygula ----------------------------------------------

Step "Supabase projesine baglaniliyor"

# --password ile veriyoruz ki CLI etkilesimli sifre sormasin.
npx --yes supabase@latest link --project-ref $ProjectRef --password $DbPassword
if ($LASTEXITCODE -ne 0) { Die "supabase link basarisiz. 'npx supabase login' yaptiniz mi?" }
Ok "Baglandi"

Step "14 migration uygulaniyor"
npx --yes supabase@latest db push --password $DbPassword
if ($LASTEXITCODE -ne 0) { Die "db push basarisiz. Yukaridaki cikti sebebini soyluyor." }
Ok "Migrationlar uygulandi"

# --- 2. Servis .env'ini yaz ve semayi dogrula ------------------------------
#
# Dogrulamayi ayri bir SQL sorgusuyla degil, zaten var olan db:check ile
# yapiyoruz: o script tablolarin yaninda wa.claim_jobs() fonksiyonunu ve
# kota kolonlarini da kontrol ediyor, yani "db push basarili dedi ama sema
# yarim kaldi" durumunu gercekten yakaliyor.
#
# Eski dosyalari yedekliyoruz: dogrulama gecmezse Seul yapilandirmasina
# geri donuyoruz, boylece yarim kalmis gecis calisan kurulumu bozmuyor.

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$panelEnv = 'apps/panel/.env.local'
$serviceEnv = 'apps/wa-service/.env'

$backups = @{}
foreach ($f in @($panelEnv, $serviceEnv)) {
  if (Test-Path $f) {
    $b = "$f.yedek-$stamp"
    Copy-Item $f $b
    $backups[$f] = $b
    Ok "Yedek: $b"
  }
}

function Restore-Envs {
  foreach ($pair in $backups.GetEnumerator()) {
    Copy-Item $pair.Value $pair.Key -Force
  }
  if ($backups.Count -gt 0) { Write-Host "    Eski .env dosyalari geri yuklendi." -ForegroundColor Yellow }
}

Step "Servis .env'i yaziliyor"

# Yalnizca DATABASE_URL satirini degistiriyoruz; digerleri (WORKER_ID,
# MAX_SESSIONS ...) elle ayarlanmis olabilir.
if (Test-Path $serviceEnv) {
  $lines = Get-Content $serviceEnv
  if ($lines -match '^DATABASE_URL=') {
    $lines = $lines -replace '^DATABASE_URL=.*', "DATABASE_URL=$dbUrl"
  } else {
    $lines += "DATABASE_URL=$dbUrl"
  }
  Set-Content -Path $serviceEnv -Value $lines -Encoding UTF8
} else {
  "DATABASE_URL=$dbUrl" | Set-Content -Path $serviceEnv -Encoding UTF8
}
Ok "$serviceEnv guncellendi"

Step "Baglanti ve sema dogrulaniyor (db:check)"
npm run --silent --workspace @wa/service db:check
if ($LASTEXITCODE -ne 0) {
  Restore-Envs
  Die "db:check gecmedi. Yukaridaki cikti sebebini soyluyor. Degisiklikler geri alindi."
}
Ok "Baglanti ve sema tamam"

# --- 3. Panel .env'ini yaz -------------------------------------------------

Step "Panel .env'i yaziliyor"

# Panel yalnizca bu iki degiskeni tutuyor; dosyayi bastan yaziyoruz ki eski
# projeye ait bir satir sessizce kalmasin.
@"
NEXT_PUBLIC_SUPABASE_URL=$apiUrl
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PublishableKey
"@ | Set-Content -Path $panelEnv -Encoding UTF8
Ok "$panelEnv yazildi"

Write-Host @"

Gecis tamam.

Siradaki adimlar:
  1) Vercel'de ortam degiskenlerini guncelle:
       NEXT_PUBLIC_SUPABASE_URL=$apiUrl
       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PublishableKey
     Sonra Redeploy.

  2) Supabase panelinde Authentication -> Sign In / Providers altinda
     "Confirm email" secenegini KAPAT (deneme hesaplari aninda girsin).

  3) Storage kovalari migration ile olustu; Storage ekranindan
     'creatives' ve 'media' kovalarinin gorundugunu dogrula.

  4) Paneli baslat: npm run dev --workspace @wa/panel

Seul'e donmek gerekirse: *.yedek-$stamp dosyalarini geri kopyala.
"@ -ForegroundColor Cyan
