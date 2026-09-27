$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root=(Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Proof=Join-Path $Root "dist\desktop-g3-g3.6-proof"
$Runtime=Join-Path $Root "dist\desktop-g1\runtime"
$Data=Join-Path $Proof "data"
$Ready=Join-Path $Proof "ready.txt"
$Stop=Join-Path $Proof "stop.request"
$Shutdown=Join-Path $Proof "shutdown.json"
$Stdout=Join-Path $Proof "stdout.log"
$Stderr=Join-Path $Proof "stderr.log"
$Exe=Join-Path $Root "apps\desktop-runtime\src-tauri\target\debug\miqo-desktop-runtime.exe"

Remove-Item $Proof -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Proof,$Data -ItemType Directory -Force | Out-Null

$tauri=Get-Content (Join-Path $Root "apps\desktop-runtime\src-tauri\tauri.conf.json") -Raw | ConvertFrom-Json
if(-not $tauri.app.security.csp){throw "G3.6 Tauri CSP is null or empty"}
$csp=[string]$tauri.app.security.csp
foreach($required in @("default-src 'self'","object-src 'none'","frame-ancestors 'none'","http://127.0.0.1:4000")){
  if(-not $csp.Contains($required)){throw "G3.6 Tauri CSP missing $required"}
}
$mainSource=Get-Content (Join-Path $Root "apps\desktop-runtime\src-tauri\src\main.rs") -Raw
if($mainSource.Contains('Some("localhost")')){throw "G3.6 localhost alias remains in native navigation allowlist"}
if(-not $mainSource.Contains('Some("127.0.0.1")')){throw "G3.6 exact loopback navigation host missing"}
if(-not $mainSource.Contains('.devtools(false)')){throw "G3.6 devtools are not explicitly disabled"}

$env:MIQO_DESKTOP_RUNTIME_DIR=$Runtime
$env:MIQO_DESKTOP_DATA_DIR=$Data
$env:MIQO_DESKTOP_READY_FILE=$Ready
$env:MIQO_DESKTOP_STOP_FILE=$Stop
$env:MIQO_DESKTOP_SHUTDOWN_FILE=$Shutdown
$env:MIQO_DATA_CLASSIFICATION="SYNTHETIC"
$env:MIQO_LIVE_PROVIDERS_ENABLED="false"
Remove-Item Env:MIQO_SYNTHETIC_ADMIN_KEY -ErrorAction SilentlyContinue
Remove-Item Env:MIQO_SYNTHETIC_ADMIN_GATE -ErrorAction SilentlyContinue

$process=Start-Process -FilePath $Exe -PassThru -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr
try {
  for($i=0;$i -lt 180;$i++){
    if(Test-Path $Ready){break}
    if($process.HasExited){
      Get-Content $Stderr -ErrorAction SilentlyContinue
      throw "G3.6 runtime exited before readiness"
    }
    Start-Sleep -Seconds 1
  }
  if(-not (Test-Path $Ready)){throw "G3.6 readiness timeout"}

  $customer=Invoke-WebRequest -Uri "http://127.0.0.1:3000/prototype"
  $customerCsp=[string]$customer.Headers["Content-Security-Policy"]
  if(-not $customerCsp -or $customerCsp.Contains("'unsafe-eval'") -or $customerCsp.Contains("ws://")){
    throw "G3.6 customer production CSP is not hardened: $customerCsp"
  }
  $admin=Invoke-WebRequest -Uri "http://127.0.0.1:3001/"
  $adminCsp=[string]$admin.Headers["Content-Security-Policy"]
  if(-not $adminCsp -or $adminCsp.Contains("'unsafe-eval'") -or $adminCsp.Contains("ws://")){
    throw "G3.6 admin production CSP is not hardened: $adminCsp"
  }
  $health=Invoke-WebRequest -Uri "http://127.0.0.1:4000/health"
  if([string]$health.Headers["X-Frame-Options"] -ne "DENY"){throw "G3.6 API security headers missing"}

  $listeners=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -in 3000,3001,4000})
  if($listeners.Count -ne 3){throw "G3.6 expected exactly three packaged listeners"}
  if(@($listeners | Where-Object {$_.LocalAddress -ne "127.0.0.1"}).Count -gt 0){throw "G3.6 non-loopback listener detected"}

  $runtimeRoot=(Resolve-Path $Runtime).Path
  $nodes=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($runtimeRoot,[System.StringComparison]::OrdinalIgnoreCase)})
  if($nodes.Count -lt 3){throw "G3.6 packaged Node process inventory incomplete"}
  $external=@()
  foreach($node in $nodes){
    $external+=@(Get-NetTCPConnection -OwningProcess $node.ProcessId -State Established -ErrorAction SilentlyContinue | Where-Object {$_.RemoteAddress -notin @("127.0.0.1","::1")})
  }
  if($external.Count -gt 0){
    $external|ConvertTo-Json|Set-Content (Join-Path $Proof "external-connections.json")
    throw "G3.6 unexpected outbound packaged-service connection"
  }

  $denied=Invoke-WebRequest -Uri "http://127.0.0.1:3001/admin/profiles/G3-NO-SESSION" -SkipHttpErrorCheck
  if($denied.StatusCode -ne 401){throw "G3.6 unauthorised admin web navigation was not rejected"}

  [ordered]@{
    gate="G3.6"
    result="PASS"
    tauriCsp="EXPLICIT"
    productionWebCsp="PASS"
    unsafeEval="ABSENT"
    developmentWebSocketsInProduction="ABSENT"
    navigationHost="127.0.0.1_ONLY"
    devtools="DISABLED"
    listeners="LOOPBACK_ONLY"
    unexpectedOutboundConnections=0
    unauthorisedAdminNavigation="PASS_401"
    boundary="SYNTHETIC_ONLY"
  }|ConvertTo-Json|Set-Content (Join-Path $Proof "g3.6-certification.json")

  "stop"|Set-Content $Stop
  Wait-Process -Id $process.Id -Timeout 90
  foreach($port in 3000,3001,4000){
    if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue){
      throw "G3.6 listener remains after shutdown on port $port"
    }
  }
}
finally {
  if(-not $process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}
}
