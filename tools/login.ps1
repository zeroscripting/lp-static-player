# Login CLI tanpa browser — tempel token sekali, tersimpan permanen.
# Jalankan:  powershell -ExecutionPolicy Bypass -File tools\login.ps1

$ErrorActionPreference = 'Stop'

function Read-Secret([string]$Prompt) {
  $sec = Read-Host -Prompt $Prompt -AsSecureString
  if (-not $sec -or $sec.Length -eq 0) { return $null }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try   { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host ''
Write-Host '=== 1/2  CLOUDFLARE ===' -ForegroundColor Cyan
Write-Host 'Buat token di: https://dash.cloudflare.com/profile/api-tokens'
Write-Host 'Template: "Edit Cloudflare Workers"  ->  Continue -> Create Token'
Write-Host ''
$cf = Read-Secret 'Tempel token Cloudflare (tidak akan terlihat)'
if ($cf) {
  [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $cf, 'User')
  $env:CLOUDFLARE_API_TOKEN = $cf
  Write-Host 'OK  CLOUDFLARE_API_TOKEN tersimpan (scope User).' -ForegroundColor Green
} else {
  Write-Host 'Lewati Cloudflare.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== 2/2  GITHUB ===' -ForegroundColor Cyan
Write-Host 'Buat token di: https://github.com/settings/tokens/new'
Write-Host 'Scope wajib: repo, workflow   (Expiration: 90 hari / No expiration)'
Write-Host ''
$gh = Read-Secret 'Tempel token GitHub (tidak akan terlihat)'
if ($gh) {
  $gh | gh auth login --with-token
  if ($LASTEXITCODE -eq 0) {
    Write-Host 'OK  GitHub CLI login.' -ForegroundColor Green
  } else {
    Write-Host 'GAGAL  token GitHub ditolak.' -ForegroundColor Red
  }
} else {
  Write-Host 'Lewati GitHub.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== VERIFIKASI ===' -ForegroundColor Cyan
if ($env:CLOUDFLARE_API_TOKEN) {
  npx.cmd --yes wrangler@latest whoami 2>&1 | Select-String -Pattern 'logged in|Account Name|Account ID|not authenticated'
}
gh auth status 2>&1 | Select-String -Pattern 'Logged in|not logged into'
Write-Host ''
Write-Host 'Kalau dua-duanya OK, kembali ke chat dan bilang: sudah login' -ForegroundColor Green
