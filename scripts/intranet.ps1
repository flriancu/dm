<#
  Start, stop or check the intranet server on demand.

    pwsh scripts/intranet.ps1 start    # serves dist/ at http://<COMPUTERNAME>.<domain>/dream_management/
    pwsh scripts/intranet.ps1 stop
    pwsh scripts/intranet.ps1 status

  The server runs in a hidden PowerShell window until you stop it or log off.
  Rebuild with `npm run build`; a running server picks up the new dist/ without a restart.
  One-time admin setup (URL reservation, firewall rule) is described in serve-intranet.ps1.
#>
param([Parameter(Mandatory)][ValidateSet('start', 'stop', 'status')][string]$Action)

$serve = Join-Path $PSScriptRoot 'serve-intranet.ps1'
$url = "http://$env:COMPUTERNAME.$([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().DomainName)/dream_management/"

function Get-Server {
  Get-CimInstance Win32_Process -Filter "Name='pwsh.exe' OR Name='powershell.exe'" |
    Where-Object { $_.CommandLine -like '*serve-intranet.ps1*' }
}

switch ($Action) {
  'start' {
    if (Get-Server) { "Already running: $url"; break }
    Start-Process pwsh -WindowStyle Hidden -ArgumentList '-NoProfile', '-File', "`"$serve`"" | Out-Null
    $ok = $false
    foreach ($i in 1..20) {
      Start-Sleep -Milliseconds 500
      try { if ((Invoke-WebRequest $url -TimeoutSec 3).StatusCode -eq 200) { $ok = $true; break } } catch {}
    }
    if ($ok) { "Started: $url" } else { "Started, but $url does not answer yet. Is dist/ built (npm run build)?" }
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
