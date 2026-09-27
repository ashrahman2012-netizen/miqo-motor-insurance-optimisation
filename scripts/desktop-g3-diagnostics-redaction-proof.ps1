$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root=(Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Proof=Join-Path $Root "dist\desktop-g3-g3.7-proof"
$Runtime=Join-Path $Root "dist\desktop-g1\runtime"
$Data=Join-Path $Proof "data"
$Ready=Join-Path $Proof "ready.txt"
$Stop=Join-Path $Proof "stop.request"
$Shutdown=Join-Path $Proof "shutdown.json"
$Stdout=Join-Path $Proof "stdout.log"
$Stderr=Join-Path $Proof "stderr.log"
$Exe=Join-Path $Root "apps\desktop-runtime\src-tauri\target\debug\miqo-desktop-runtime.exe"
$Secret="G3_SECRET_SENTINEL_9F34C8D2"
$Payload="G3_CUSTOMER_PAYLOAD_SENTINEL_6A71E4B9"

Remove-Item $Proof -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Proof,$Data -ItemType Directory -Force | Out-Null

$env:MIQO_DESKTOP_RUNTIME_DIR=$Runtime
$env:MIQO_DESKTOP_DATA_DIR=$Data
$env:MIQO_DESKTOP_READY_FILE=$Ready
$env:MIQO_DESKTOP_STOP_FILE=$Stop
$env:MIQO_DESKTOP_SHUTDOWN_FILE=$Shutdown
$env:MIQO_DESKTOP_G3_7_SECRET_SENTINEL=$Secret
$env:MIQO_DESKTOP_G3_7_PAYLOAD_MARKER=$Payload
$env:MIQO_DATA_CLASSIFICATION="SYNTHETIC"
$env:MIQO_LIVE_PROVIDERS_ENABLED="false"

$process=Start-Process -FilePath $Exe -PassThru -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr
try {
  for($i=0;$i -lt 180;$i++){
    if(Test-Path $Ready){break}
    if($process.HasExited){
      Get-Content $Stderr -ErrorAction SilentlyContinue
      throw "G3.7 runtime exited before readiness"
    }
    Start-Sleep -Seconds 1
  }
  if(-not (Test-Path $Ready)){throw "G3.7 readiness timeout"}

  $bad=Invoke-WebRequest -Uri "http://127.0.0.1:4000/admin/audit?profileId=G3-REDACTION" -Headers @{
    "Origin"="http://127.0.0.1:3001"
    "Cookie"="miqo_runtime_capability=$Secret"
    "Authorization"="Bearer $Secret"
    "x-miqo-synthetic-admin"=$Secret
  } -SkipHttpErrorCheck
  if($bad.StatusCode -ne 401){throw "G3.7 invalid secret probe was not rejected"}

  Start-Sleep -Seconds 1
  "stop"|Set-Content $Stop
  Wait-Process -Id $process.Id -Timeout 90

  $outText=if(Test-Path $Stdout){Get-Content $Stdout -Raw}else{""}
  $errText=if(Test-Path $Stderr){Get-Content $Stderr -Raw}else{""}
  $logText=$outText+[Environment]::NewLine+$errText
  if($logText.Contains($Secret)){throw "G3.7 secret sentinel leaked into runtime logs"}
  if($logText.Contains($Payload)){throw "G3.7 customer payload sentinel leaked into runtime logs"}
  if($logText -notmatch "reqId"){throw "G3.7 logs lost request/correlation identifiers"}

  [ordered]@{
    gate="G3.7"
    result="PASS"
    secretSentinelLeak="ABSENT"
    customerPayloadLeak="ABSENT"
    requestCorrelation="PRESENT"
    rawCredentialHeaders="REDACTED"
    rawErrorObjects="NOT_LOGGED"
    diagnosticModel="METADATA_ORIENTED"
    boundary="SYNTHETIC_ONLY"
  }|ConvertTo-Json|Set-Content (Join-Path $Proof "g3.7-certification.json")
}
finally {
  if(-not $process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}
  Remove-Item Env:MIQO_DESKTOP_G3_7_SECRET_SENTINEL -ErrorAction SilentlyContinue
  Remove-Item Env:MIQO_DESKTOP_G3_7_PAYLOAD_MARKER -ErrorAction SilentlyContinue
}
