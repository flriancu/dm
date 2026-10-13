<#
  Serves the built site (dist/) from this workstation through Windows HTTP.sys.

  Default:  http://<COMPUTERNAME>.<domain>/dream_management/   (port 80)
  Test:     .\scripts\serve-intranet.ps1 -Prefix http://localhost:8099/dream_management/

  One-time setup by an administrator (port 80 and the firewall):
    netsh http add urlacl url=http://+:80/dream_management/ user=$env:USERDOMAIN\$env:USERNAME
    New-NetFirewallRule -DisplayName "Dream course (HTTP 80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Domain
  Undo:
    netsh http delete urlacl url=http://+:80/dream_management/
    Remove-NetFirewallRule -DisplayName "Dream course (HTTP 80)"

  Stop with Ctrl+C. The site lives only while this script runs.
#>
param(
  [string]$Prefix = 'http://+:80/dream_management/',
  [string]$Root = (Join-Path $PSScriptRoot '..\dist')
)

$Root = (Resolve-Path $Root).Path
if (-not (Test-Path (Join-Path $Root 'index.html'))) { throw "No build in $Root. Run: npm run build" }
if (-not $Prefix.EndsWith('/')) { $Prefix += '/' }
$basePath = ([Uri]($Prefix -replace '\+|\*', 'localhost')).AbsolutePath   # e.g. /dream_management/

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'
  '.mp4' = 'video/mp4'; '.vtt' = 'text/vtt; charset=utf-8'; '.md' = 'text/markdown; charset=utf-8'
  '.woff2' = 'font/woff2'; '.webmanifest' = 'application/manifest+json'; '.txt' = 'text/plain; charset=utf-8'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()
Write-Host "Serving $Root at $($Prefix -replace '\+', "$env:COMPUTERNAME.$([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().DomainName)")  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request; $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($path -eq $basePath.TrimEnd('/')) { $res.Redirect($basePath); $res.Close(); continue }   # trailing slash, so ./ paths resolve
      $rel = $path.Substring([Math]::Min($basePath.Length, $path.Length))
      if ($rel -eq '') { $rel = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $Root $rel))
      if (-not $file.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $file -PathType Leaf)) {
        $res.StatusCode = 404; $res.Close(); continue
      }
      $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
      $res.ContentType = $types[$ext] ?? 'application/octet-stream'
      $res.Headers['Cache-Control'] = if ($rel -like 'assets/*') { 'public, max-age=31536000, immutable' } else { 'no-cache' }
      $res.Headers['Accept-Ranges'] = 'bytes'
      $fs = [IO.File]::OpenRead($file)
      try {
        $len = $fs.Length; $start = 0; $end = $len - 1
        $range = $req.Headers['Range']
        if ($range -match '^bytes=(\d*)-(\d*)$') {   # video seeking
          if ($Matches[1]) { $start = [int64]$Matches[1] }
          if ($Matches[2]) { $end = [Math]::Min([int64]$Matches[2], $len - 1) }
          if (-not $Matches[1] -and $Matches[2]) { $start = $len - [int64]$Matches[2]; $end = $len - 1 }
          $res.StatusCode = 206
          $res.Headers['Content-Range'] = "bytes $start-$end/$len"
        }
        $count = $end - $start + 1
        $res.ContentLength64 = $count
        if ($req.HttpMethod -ne 'HEAD') {
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
} finally {
  $listener.Stop(); $listener.Close()
}
