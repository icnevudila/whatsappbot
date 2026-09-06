#Requires -Version 5.1
<#
  Firebase dosyaları geldikten sonra:
    1) android/app/google-services.json
    2) Vercel FIREBASE_SERVICE_ACCOUNT_JSON
    3) Bu script → sync + yeni APK → dist/Filo-debug.apk
#>
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

$gs = Join-Path $root 'android\app\google-services.json'
if (-not (Test-Path $gs)) {
  Write-Error "Eksik: $gs — Firebase Console'dan indirip koy."
}

$jdk = Get-ChildItem 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-21*' | Select-Object -First 1
if (-not $jdk) { Write-Error 'JDK 21 yok' }
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;" + $env:Path

$sdkPath = $env:ANDROID_HOME -replace '\\', '\\'
Set-Content (Join-Path $root 'android\local.properties') "sdk.dir=$sdkPath" -Encoding ASCII

npm install
npx cap sync android
Push-Location (Join-Path $root 'android')
.\gradlew.bat assembleDebug --no-daemon
Pop-Location

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
Copy-Item $apk (Join-Path $dist 'Filo-debug.apk') -Force
Write-Host "OK: $(Join-Path $dist 'Filo-debug.apk')"
