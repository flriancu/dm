<#
  Publish, start, stop or check the intranet server on demand.

    pwsh scripts/intranet.ps1 publish  # checks and builds, then copies the build into site/
    pwsh scripts/intranet.ps1 start    # serves site/ at http://<COMPUTERNAME>.<domain>/dream_management/
    pwsh scripts/intranet.ps1 stop
    pwsh scripts/intranet.ps1 status

  The server serves site/, never dist/: `npm run build` empties dist/ while it works, which
  would take the live site down for that time. `publish` builds into a temporary folder and
  then copies into site/: the new hashed files first, index.html last (an atomic rename), and
  the previous version's files stay, so a tab opened before the publish keeps working until
  it reloads. A file is removed once 30 days have passed since the last publish that contained
  it (recorded in .site-files.json, next to site/).

  The server runs in a hidden PowerShell window until you stop it or log off; a running
  server picks up a new publish without a restart. One-time admin setup (URL reservation,
  firewall rule) is described in serve-intranet.ps1.
#>
param([Parameter(Mandatory)][ValidateSet('publish', 'start', 'stop', 'status')][string]$Action)

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$site = Join-Path $repo 'site'
$manifest = Join-Path $repo '.site-files.json'   # file in site/ -> the last publish that contained it
$serve = Join-Path $PSScriptRoot 'serve-intranet.ps1'
$url = "http://$env:COMPUTERNAME.$([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().DomainName)/dream_management/"

function Get-Server {
  Get-CimInstance Win32_Process -Filter "Name='pwsh.exe' OR Name='powershell.exe'" |
    Where-Object { $_.CommandLine -like "*$serve*" }
}

function Publish-Site {
  $staging = Join-Path ([IO.Path]::GetTempPath()) "dream-course-build-$PID"
  Push-Location $repo
  try {
    npm run build -- --outDir $staging --emptyOutDir   # the checks, then vite build into the staging folder
    if ($LASTEXITCODE) { throw "Build failed; site/ is unchanged." }
  } finally { Pop-Location }
  try {
    New-Item -ItemType Directory -Force $site | Out-Null
    $files = Get-ChildItem -LiteralPath $staging -Recurse -File
    foreach ($f in $files | Where-Object { $_.FullName -ne (Join-Path $staging 'index.html') }) {
      $dest = Join-Path $site $f.FullName.Substring($staging.Length + 1)
      New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
      Copy-Item -LiteralPath $f.FullName $dest -Force
    }
    # index.html last, by rename, so no request ever sees a half-written page or a page whose files are missing
    $next = Join-Path $site 'index.html.next'
    Copy-Item -LiteralPath (Join-Path $staging 'index.html') $next -Force
    Move-Item -LiteralPath $next (Join-Path $site 'index.html') -Force
    # old builds' files: kept for tabs still open on them, removed 30 days after they left the build
    $now = Get-Date
    $seen = @{}
    if (Test-Path -LiteralPath $manifest) {
      (Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $seen[$_.Name] = $_.Value }
    }
    foreach ($f in $files) { $seen[$f.FullName.Substring($staging.Length + 1)] = $now.ToString('o') }
    foreach ($f in Get-ChildItem -LiteralPath $site -Recurse -File) {   # published before this record existed: count from now
      $rel = $f.FullName.Substring($site.Length + 1)
      if (-not $seen.ContainsKey($rel)) { $seen[$rel] = $now.ToString('o') }
    }
    foreach ($rel in @($seen.Keys)) {
      if ([datetime]$seen[$rel] -lt $now.AddDays(-30)) {
        Remove-Item -LiteralPath (Join-Path $site $rel) -Force -ErrorAction SilentlyContinue
        $seen.Remove($rel)
      }
    }
    $seen | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding utf8
  } finally {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
  }
  "Published to $site"
}

switch ($Action) {
  'publish' { Publish-Site }
  'start' {
    if (Get-Server) { "Already running: $url"; break }
    if (-not (Test-Path (Join-Path $site 'index.html'))) { "Nothing published yet. Run: pwsh scripts/intranet.ps1 publish"; break }
    Start-Process pwsh -WindowStyle Hidden -ArgumentList '-NoProfile', '-File', "`"$serve`"" | Out-Null
    $ok = $false
    foreach ($i in 1..20) {
      Start-Sleep -Milliseconds 500
      try { if ((Invoke-WebRequest $url -TimeoutSec 3).StatusCode -eq 200) { $ok = $true; break } } catch {}
    }
    if ($ok) { "Started: $url" } else { "Started, but $url does not answer yet." }
  }
  'stop' {
    $procs = @(Get-Server)
    if (-not $procs) { 'Not running.'; break }
    $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    "Stopped ($($procs.Count) process$(if ($procs.Count -gt 1) { 'es' }))."
  }
  'status' {
    $procs = @(Get-Server)
    if ($procs) { "Running (PID $($procs.ProcessId -join ', ')): $url" } else { 'Not running.' }
  }
}
