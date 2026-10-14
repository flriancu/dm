#Requires -Version 7
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

  No thread waits on a client: each request is worked out at once (a few milliseconds), and
  its body is sent with an asynchronous write that the loop only watches. A reader that stops
  (a paused video on a phone, many of them, or someone doing it on purpose) costs a socket and
  a small buffer, never a worker; a transfer slower than $MinBytesPerSecond after a grace of
  $GraceSeconds is dropped (a phone on a poor link still gets through), and past
  $MaxTransfers transfers in flight a request is answered 503 at once, which bounds the
  memory held for readers that stopped. Range answers (video) are at most $RangeChunk bytes,
  the browser asks for the next piece itself. Stop with Ctrl+C. The site lives only while this
  script runs.
#>
param(
  [string]$Prefix = 'http://+:80/dream_management/',
  [string]$Root = (Join-Path $PSScriptRoot '..\site'),
  [int]$RangeChunk = 256KB,
  [int]$GraceSeconds = 60,
  [int]$MinBytesPerSecond = 1KB,
  [int]$MaxTransfers = 256
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

# The file a request names, or $null. Plain names only: no drive or stream syntax (':'), no
# 8.3 short names ('~'), no wildcards, no segment ending in a dot or space (Windows would drop
# it and serve another name), nothing outside the root, and no junction or link on the way
# (a textual check cannot see where a reparse point leads).
function Resolve-SiteFile([string]$rel) {
  if ($rel -match '[:~*?"<>|]' -or $rel -match '[. ](/|\\|$)') { return $null }
  $file = [IO.Path]::GetFullPath([IO.Path]::Combine($Root, $rel.TrimStart('/', '\')))
  if (-not $file.StartsWith($Root + '\', [StringComparison]::OrdinalIgnoreCase) -or -not [IO.File]::Exists($file)) {
    return $null
  }
  for ($p = $file; $p.Length -gt $Root.Length; $p = [IO.Path]::GetDirectoryName($p)) {
    if ([IO.File]::GetAttributes($p).HasFlag([IO.FileAttributes]::ReparsePoint)) { return $null }
  }
  $file
}

function Send-Status($res, [int]$code) {
  $res.StatusCode = $code; $res.Close()
}

# Whether the client's copy is current: by ETag, or by date where the client sent no ETag.
function Test-NotModified($req, [string]$etag, [datetime]$modifiedUtc) {
  $tags = $req.Headers['If-None-Match']
  if ($tags) { return $tags -eq '*' -or ($tags -split '\s*,\s*' -contains $etag) }
  $since = [DateTimeOffset]::MinValue
  if (-not [DateTimeOffset]::TryParse([string]$req.Headers['If-Modified-Since'], [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal, [ref]$since)) { return $false }
  $modifiedUtc.AddTicks(-($modifiedUtc.Ticks % [TimeSpan]::TicksPerSecond)) -le $since.UtcDateTime   # HTTP dates have whole seconds
}

# Answers one request. Returns the transfer to watch (an asynchronous write) or $null when done.
function Start-Response($ctx) {
  $req = $ctx.Request; $res = $ctx.Response
  $res.Headers['X-Content-Type-Options'] = 'nosniff'
  if ($req.HttpMethod -ne 'GET' -and $req.HttpMethod -ne 'HEAD') {
    $res.Headers['Allow'] = 'GET, HEAD'; Send-Status $res 405; return $null
  }
  $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
  if ($path -eq $basePath.TrimEnd('/')) { $res.Redirect($basePath); $res.Close(); return $null }   # trailing slash, so ./ paths resolve
  $rel = $path.Substring([Math]::Min($basePath.Length, $path.Length))
  if ($rel -eq '') { $rel = 'index.html' }
  $file = Resolve-SiteFile $rel
  if (-not $file) { Send-Status $res 404; return $null }

  $info = [IO.FileInfo]::new($file)
  $len = $info.Length
  $etag = '"' + $len.ToString('x') + '-' + $info.LastWriteTimeUtc.Ticks.ToString('x') + '"'
  $ext = $info.Extension.ToLowerInvariant()
  $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
  $res.Headers['Cache-Control'] = if ($rel -like 'assets/*') { 'public, max-age=31536000, immutable' } else { 'no-cache' }
  $res.Headers['Accept-Ranges'] = 'bytes'
  $res.Headers['ETag'] = $etag
  $res.Headers['Last-Modified'] = $info.LastWriteTimeUtc.ToString('R')
  if (Test-NotModified $req $etag $info.LastWriteTimeUtc) { Send-Status $res 304; return $null }   # index.html revalidates instead of downloading again

  $start = [int64]0; $end = $len - 1
  $range = $req.Headers['Range']
  if ($range -match '^bytes=(\d{0,18})-(\d{0,18})$' -and ($Matches[1] -or $Matches[2])) {   # video seeking; several ranges: whole file
    if ($Matches[1]) {
      $start = [int64]$Matches[1]
      if ($Matches[2]) { $end = [Math]::Min([int64]$Matches[2], $len - 1) }
    } else {
      $start = [Math]::Max([int64]0, $len - [int64]$Matches[2])   # the last N bytes
    }
    if ($start -gt $end -or $start -ge $len) {
      $res.Headers['Content-Range'] = "bytes */$len"; Send-Status $res 416; return $null
    }
    $end = [Math]::Min($end, $start + $RangeChunk - 1)   # one piece at a time: the browser asks for the next
    $res.StatusCode = 206
    $res.Headers['Content-Range'] = "bytes $start-$end/$len"
  }
  $count = $end - $start + 1
  $res.ContentLength64 = $count
  if ($req.HttpMethod -eq 'HEAD' -or $count -eq 0) { $res.Close(); return $null }

  # the whole body in memory for a range piece or a small file, else streamed from disk; either way asynchronous
  $fs = [IO.FileStream]::new($file, 'Open', 'Read', 'ReadWrite, Delete', 81920, [IO.FileOptions]::Asynchronous)   # a publish may replace the file meanwhile
  try {
    if ($count -le $RangeChunk) {
      $buf = [byte[]]::new($count)
      $fs.Position = $start
      $read = 0
      while ($read -lt $count) { $n = $fs.Read($buf, $read, $count - $read); if ($n -le 0) { break }; $read += $n }
      $fs.Dispose(); $fs = $null
      $task = $res.OutputStream.WriteAsync($buf, 0, $read)
    } else {
      $task = $fs.CopyToAsync($res.OutputStream, 81920)   # only a whole-file GET gets here (ranges are capped)
    }
  } catch {
    if ($fs) { $fs.Dispose() }   # a read or write that failed before the transfer started
    throw
  }
  [pscustomobject]@{
    Task = $task; Res = $res; File = $fs
    Deadline = [DateTime]::UtcNow.AddSeconds($GraceSeconds + $count / $MinBytesPerSecond)
  }
}

# Closes the transfers that have finished and drops those past their deadline.
function Complete-Transfers($transfers) {
  $now = [DateTime]::UtcNow
  for ($i = $transfers.Count - 1; $i -ge 0; $i--) {
    $t = $transfers[$i]
    if (-not $t.Task.IsCompleted -and $now -lt $t.Deadline) { continue }
    try { if ($t.Task.IsCompleted -and -not $t.Task.IsFaulted) { $t.Res.Close() } else { $t.Res.Abort() } } catch {}
    if ($t.File) { $t.File.Dispose() }
    $transfers.RemoveAt($i)
  }
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()
$transfers = [System.Collections.Generic.List[object]]::new()
Write-Host "Serving $Root at $($Prefix -replace '\+', "$env:COMPUTERNAME.$([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().DomainName)")  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    try {
      $next = $listener.GetContextAsync()
      while (-not $next.Wait(250)) { Complete-Transfers $transfers }   # short waits: transfers are watched and Ctrl+C can stop the server
      $ctx = $next.Result
    } catch {
      continue   # a client gone before its request was accepted: the next one is served as usual
    }
    try {
      Complete-Transfers $transfers
      if ($transfers.Count -ge $MaxTransfers) {
        $ctx.Response.Headers['Retry-After'] = '5'; Send-Status $ctx.Response 503; continue
      }
      $t = Start-Response $ctx
      if ($t) { $transfers.Add($t) }
    } catch {
      try { $ctx.Response.Abort() } catch {}
    }
    Complete-Transfers $transfers
  }
} finally {
  foreach ($t in $transfers) { try { $t.Res.Abort() } catch {}; if ($t.File) { $t.File.Dispose() } }
  $listener.Stop(); $listener.Close()
}
