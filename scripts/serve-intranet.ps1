<#
  Serves the published site (site/, filled by `intranet.ps1 publish`) from this workstation
  through Windows HTTP.sys.

  Default:  http://<COMPUTERNAME>.<domain>/dream_management/   (port 80)
  Test:     .\scripts\serve-intranet.ps1 -Prefix http://localhost:8099/dream_management/ -Root .\some-build

  One-time setup by an administrator (port 80 and the firewall):
    netsh http add urlacl url=http://+:80/dream_management/ user=$env:USERDOMAIN\$env:USERNAME
    New-NetFirewallRule -DisplayName "Dream course (HTTP 80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Domain
  Undo:
    netsh http delete urlacl url=http://+:80/dream_management/
    Remove-NetFirewallRule -DisplayName "Dream course (HTTP 80)"

  Requests are answered by a pool of $Workers runspaces, so one slow reader (a paused video
  on a phone) never holds up the others. Stop with Ctrl+C. The site lives only while this
  script runs.
#>
param(
  [string]$Prefix = 'http://+:80/dream_management/',
  [string]$Root = (Join-Path $PSScriptRoot '..\site'),
  [int]$Workers = 32
)

if (-not (Test-Path -LiteralPath (Join-Path $Root 'index.html'))) {
  throw "No published site in $Root. Run: pwsh scripts/intranet.ps1 publish"
}
$Root = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\')
if (-not $Prefix.EndsWith('/')) { $Prefix += '/' }
$basePath = ([Uri]($Prefix -replace '\+|\*', 'localhost')).AbsolutePath   # e.g. /dream_management/

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'
  '.mp4' = 'video/mp4'; '.vtt' = 'text/vtt; charset=utf-8'; '.md' = 'text/markdown; charset=utf-8'
  '.woff2' = 'font/woff2'; '.webmanifest' = 'application/manifest+json'; '.txt' = 'text/plain; charset=utf-8'
}

# One request, start to finish. Runs in a pool runspace: it sees only its arguments.
$handle = {
  param($ctx, [string]$Root, [string]$basePath, [hashtable]$types)
  $req = $ctx.Request; $res = $ctx.Response
  $status = {
    param([int]$code)
    $res.StatusCode = $code; $res.Close()
  }
  try {
    $res.Headers['X-Content-Type-Options'] = 'nosniff'
    if ($req.HttpMethod -ne 'GET' -and $req.HttpMethod -ne 'HEAD') {
      $res.Headers['Allow'] = 'GET, HEAD'; & $status 405; return
    }
    $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path -eq $basePath.TrimEnd('/')) { $res.Redirect($basePath); $res.Close(); return }   # trailing slash, so ./ paths resolve
    $rel = $path.Substring([Math]::Min($basePath.Length, $path.Length))
    if ($rel -eq '') { $rel = 'index.html' }
    # plain file names only: no drive or stream syntax (':'), no 8.3 short names ('~'), no wildcards
    if ($rel -match '[:~*?"<>|]') { & $status 404; return }
    $file = [IO.Path]::GetFullPath([IO.Path]::Combine($Root, $rel.TrimStart('/', '\')))
    if (-not $file.StartsWith($Root + '\', [StringComparison]::OrdinalIgnoreCase) -or -not [IO.File]::Exists($file)) {
      & $status 404; return
    }
    $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
    $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
    $res.Headers['Cache-Control'] = if ($rel -like 'assets/*') { 'public, max-age=31536000, immutable' } else { 'no-cache' }
    $res.Headers['Accept-Ranges'] = 'bytes'
    $fs = [IO.File]::Open($file, 'Open', 'Read', 'ReadWrite, Delete')   # a publish may replace the file meanwhile
    try {
      $len = $fs.Length; $start = [int64]0; $end = $len - 1
      $range = $req.Headers['Range']
      if ($range -match '^bytes=(\d{0,18})-(\d{0,18})$' -and ($Matches[1] -or $Matches[2])) {   # video seeking; several ranges: whole file
        if ($Matches[1]) {
          $start = [int64]$Matches[1]
          if ($Matches[2]) { $end = [Math]::Min([int64]$Matches[2], $len - 1) }
        } else {
          $start = [Math]::Max([int64]0, $len - [int64]$Matches[2])   # the last N bytes
        }
        if ($start -gt $end -or $start -ge $len) {
          $res.Headers['Content-Range'] = "bytes */$len"; & $status 416; return
        }
        $res.StatusCode = 206
        $res.Headers['Content-Range'] = "bytes $start-$end/$len"
      }
      $count = $end - $start + 1
      $res.ContentLength64 = $count
      if ($req.HttpMethod -eq 'GET') {
        $fs.Position = $start
        $buf = New-Object byte[] 65536
        while ($count -gt 0) {
          $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $count))
          if ($n -le 0) { break }
          $res.OutputStream.Write($buf, 0, $n); $count -= $n
        }
      }
    } finally { $fs.Dispose() }
    $res.Close()
  } catch {
    try { $res.Abort() } catch {}
  }
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()
$pool = [RunspaceFactory]::CreateRunspacePool(1, $Workers)
$pool.Open()
$running = [System.Collections.Generic.List[object]]::new()
Write-Host "Serving $Root at $($Prefix -replace '\+', "$env:COMPUTERNAME.$([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().DomainName)") with $Workers workers  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $next = $listener.GetContextAsync()
    while (-not $next.Wait(500)) {}   # short waits, so Ctrl+C can stop the server between them
    $ctx = $next.Result
    $ps = [PowerShell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($handle).AddArgument($ctx).AddArgument($Root).AddArgument($basePath).AddArgument($types)
    $running.Add([pscustomobject]@{ PS = $ps; Async = $ps.BeginInvoke() })
    for ($i = $running.Count - 1; $i -ge 0; $i--) {   # tidy up the requests that have finished
      if (-not $running[$i].Async.IsCompleted) { continue }
      try { [void]$running[$i].PS.EndInvoke($running[$i].Async) } catch {}
      $running[$i].PS.Dispose()
      $running.RemoveAt($i)
    }
  }
} finally {
  $listener.Stop(); $listener.Close()
  foreach ($r in $running) { $r.PS.Dispose() }
  $pool.Close(); $pool.Dispose()
}
