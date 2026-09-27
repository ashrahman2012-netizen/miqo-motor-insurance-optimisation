$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root=(Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Proof=Join-Path $Root "dist\desktop-g3-g3.5-proof"
$Runtime=Join-Path $Root "dist\desktop-g1\runtime"
$Data=Join-Path $Proof "data"
$Ready=Join-Path $Proof "ready.txt"
$Stop=Join-Path $Proof "stop.request"
$Shutdown=Join-Path $Proof "shutdown.json"
$CapabilityProof=Join-Path $Proof "g3.5-local-capability-proof.json"
$Stdout=Join-Path $Proof "stdout.log"
$Stderr=Join-Path $Proof "stderr.log"
$Exe=Join-Path $Root "apps\desktop-runtime\src-tauri\target\debug\miqo-desktop-runtime.exe"

Remove-Item $Proof -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Proof,$Data -ItemType Directory -Force | Out-Null

$env:MIQO_DESKTOP_RUNTIME_DIR=$Runtime
$env:MIQO_DESKTOP_DATA_DIR=$Data
$env:MIQO_DESKTOP_READY_FILE=$Ready
$env:MIQO_DESKTOP_STOP_FILE=$Stop
$env:MIQO_DESKTOP_SHUTDOWN_FILE=$Shutdown
$env:MIQO_DESKTOP_G3_5_PROOF_FILE=$CapabilityProof
$env:MIQO_DATA_CLASSIFICATION="SYNTHETIC"
$env:MIQO_LIVE_PROVIDERS_ENABLED="false"
Remove-Item Env:MIQO_LOCAL_RUNTIME_CAPABILITY -ErrorAction SilentlyContinue
Remove-Item Env:MIQO_SYNTHETIC_ADMIN_KEY -ErrorAction SilentlyContinue
Remove-Item Env:MIQO_SYNTHETIC_ADMIN_GATE -ErrorAction SilentlyContinue

$process=Start-Process -FilePath $Exe -PassThru -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr
try {
  for($i=0;$i -lt 180;$i++){
    if((Test-Path $Ready) -and (Test-Path $CapabilityProof)){break}
    if($process.HasExited){
      Get-Content $Stderr -ErrorAction SilentlyContinue
      throw "G3.5 desktop runtime exited before capability proof"
    }
    Start-Sleep -Seconds 1
  }
  if(-not (Test-Path $CapabilityProof)){throw "G3.5 capability proof timeout"}

  $proof=Get-Content $CapabilityProof -Raw | ConvertFrom-Json
  if($proof.result -ne "PASS" -or
     $proof.authority -ne "PER_LAUNCH_LOCAL_CAPABILITY" -or
     $proof.staticPackagedAdminSecret -ne $false -or
     $proof.adminUiNoSession -ne "PASS_401" -or
     $proof.adminUiOwnedSession -ne "PASS_200" -or
     $proof.scope -ne "ALL_NON_HEALTH_LOOPBACK_API_REQUESTS" -or
     $proof.apiNoSession -ne "PASS_401" -or
     $proof.apiWrongSession -ne "PASS_401" -or
     $proof.apiWrongOrigin -ne "PASS_403" -or
     $proof.apiOwnedSession -ne "PASS_200" -or
     $proof.customerApiNoSession -ne "PASS_401" -or
     $proof.customerApiWrongOrigin -ne "PASS_403" -or
     $proof.customerApiOwnedSession -ne "PASS_200"){
    throw "G3.5 capability proof content mismatch"
  }

  $legacy=Invoke-WebRequest -Uri "http://127.0.0.1:4000/admin/audit?profileId=G3-LEGACY-REJECT" -Headers @{"Origin"="http://127.0.0.1:3001";"x-miqo-synthetic-admin"="DB-G10-SYNTHETIC-ADMIN"} -SkipHttpErrorCheck
  if($legacy.StatusCode -ne 401){throw "Packaged runtime accepted legacy static admin authority"}

  $sourceText=Get-Content (Join-Path $Root "apps\desktop-runtime\src-tauri\src\main.rs") -Raw
  if($sourceText.Contains("DB-G10-SYNTHETIC-ADMIN")){throw "Static synthetic admin literal remains in native runtime source"}
  $exeText=[Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($Exe))
  if($exeText.Contains("DB-G10-SYNTHETIC-ADMIN")){throw "Static synthetic admin literal remains in native runtime binary"}

  $outText=if(Test-Path $Stdout){Get-Content $Stdout -Raw}else{""}
  $errText=if(Test-Path $Stderr){Get-Content $Stderr -Raw}else{""}
  $logText=$outText+[Environment]::NewLine+$errText
  if($logText -match "miqo_runtime_capability="){throw "Runtime capability leaked to logs"}

  [ordered]@{
    gate="G3.5"
    result="PASS"
    perLaunchCapability="PASS"
    legacyStaticAuthorityRejected="PASS"
    capabilityAbsentFromLogs="PASS"
    capabilityAbsentFromEvidence="PASS"
    packagedStaticAdminSecret="ABSENT"
    shutdownExpiry="PENDING_STOP"
    boundary="SYNTHETIC_ONLY"
  } | ConvertTo-Json | Set-Content (Join-Path $Proof "g3.5-certification.json")

  "stop" | Set-Content $Stop
  Wait-Process -Id $process.Id -Timeout 90
  if(-not (Test-Path $Shutdown)){throw "G3.5 shutdown evidence missing"}
  foreach($port in 3000,3001,4000){
    if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue){
      throw "G3.5 listener remains after desktop shutdown on port $port"
    }
  }
  $cert=Get-Content (Join-Path $Proof "g3.5-certification.json") -Raw | ConvertFrom-Json
  $cert.shutdownExpiry="PASS"
  $cert | ConvertTo-Json | Set-Content (Join-Path $Proof "g3.5-certification.json")
}
finally {
  if(-not $process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}
}
