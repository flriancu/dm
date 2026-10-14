#Requires -Version 7
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

$ErrorActionPreference = 'Stop'   # any failure stops the publish and says so, instead of reporting success

# The full path of a file in site/ named by the record, or $null when the name would leave site/
# (a hand-edited or corrupted record must never make publish delete anything outside it).
function Get-SitePath([string]$rel) {
  if (-not $rel -or [IO.Path]::IsPathRooted($rel)) { return $null }
  $path = [IO.Path]::GetFullPath((Join-Path $site $rel))
  if (-not $path.StartsWith($site + '\', [StringComparison]::OrdinalIgnoreCase)) { return $null }
  # only a name as publish writes it: 'assets\..\index.html' would also land inside site/, on another file
  if ([IO.Path]::GetRelativePath($site, $path) -ne $rel) { return $null }
  $path
}

# The record of when each file in site/ was last part of a publish. An unreadable record is
# replaced by an empty one (every file then counts from this publish), entries that are not a
# date or that point outside site/ are dropped; both with a warning.
function Read-PublishRecord {
  $seen = @{}
  if (-not (Test-Path -LiteralPath $manifest)) { return $seen }
  try {
    $data = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json -AsHashtable
  } catch {
    Write-Warning "$manifest could not be read; starting a new record."
    return $seen
  }
  if ($data -isnot [System.Collections.IDictionary]) { Write-Warning "$manifest is not a record; starting a new one."; return $seen }
  foreach ($k in $data.Keys) {
    $v = $data[$k]
    $when = [datetime]::MinValue
    $isDate = if ($v -is [datetime]) { $when = $v; $true }   # ConvertFrom-Json already reads ISO dates
    else { [datetime]::TryParse([string]$v, [ref]$when) }
    if ($isDate -and (Get-SitePath $k)) {
      $seen[$k] = $when
    } else {
      Write-Warning "Dropped record entry '$k'."
    }
  }
  $seen
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
    $seen = Read-PublishRecord
    $current = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)   # this build: never deleted
    foreach ($f in $files) {
      $rel = $f.FullName.Substring($staging.Length + 1)
      [void]$current.Add($rel)
      $seen[$rel] = $now
    }
    foreach ($f in Get-ChildItem -LiteralPath $site -Recurse -File) {   # not in the record (yet): count from now
      $rel = $f.FullName.Substring($site.Length + 1)
      if (-not $seen.ContainsKey($rel)) { $seen[$rel] = $now }
    }
    foreach ($rel in @($seen.Keys)) {
      if ($seen[$rel] -ge $now.AddDays(-30) -or $current.Contains($rel)) { continue }
      $path = Get-SitePath $rel
      if ($path) { Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue }
      $seen.Remove($rel)
    }
    $out = [ordered]@{}
    foreach ($k in $seen.Keys | Sort-Object) { $out[$k] = $seen[$k].ToString('o') }
    $out | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding utf8
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
