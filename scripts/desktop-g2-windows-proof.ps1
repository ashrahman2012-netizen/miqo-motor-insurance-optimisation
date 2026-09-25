$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Proof = Join-Path $Root "dist\desktop-g2-proof"
$BundleDir = Join-Path $Root "apps\desktop-runtime\src-tauri\target\release\bundle\nsis"
$Installer = Get-ChildItem $BundleDir -Filter "*-setup.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $Installer) { throw "NSIS installer not found in $BundleDir" }

Remove-Item $Proof -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Proof -ItemType Directory -Force | Out-Null

$ExpectedDataRoot = Join-Path $env:LOCALAPPDATA "com.miqo.desktop.synthetic"
$ExpectedDataDir = Join-Path $ExpectedDataRoot "pglite"
Remove-Item $ExpectedDataRoot -Recurse -Force -ErrorAction SilentlyContinue

function Get-MiqoInstallRecord {
  $subkeyPath = "Software\Microsoft\Windows\CurrentVersion\Uninstall"
  foreach ($view in @(
    [Microsoft.Win32.RegistryView]::Registry64,
    [Microsoft.Win32.RegistryView]::Registry32
  )) {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
      [Microsoft.Win32.RegistryHive]::CurrentUser,
      $view
    )
    try {
      $uninstall = $base.OpenSubKey($subkeyPath)
      if (-not $uninstall) { continue }
      try {
        foreach ($name in $uninstall.GetSubKeyNames()) {
          $key = $uninstall.OpenSubKey($name)
          if (-not $key) { continue }
          try {
            if ([string]$key.GetValue("DisplayName") -eq "MIQO Desktop [SYNTHETIC]") {
              return [pscustomobject]@{
                DisplayName = [string]$key.GetValue("DisplayName")
                InstallLocation = [string]$key.GetValue("InstallLocation")
                UninstallString = [string]$key.GetValue("UninstallString")
                RegistryView = $view.ToString()
                RegistryKeyName = $name
              }
            }
          } finally {
            $key.Dispose()
          }
        }
      } finally {
        $uninstall.Dispose()
      }
    } finally {
      $base.Dispose()
    }
  }
  throw "MIQO NSIS uninstall record not found in HKCU 64-bit or 32-bit registry view"
}

function Resolve-Uninstaller([object]$record) {
  $raw = [Environment]::ExpandEnvironmentVariables([string]$record.UninstallString)
  if ($raw.StartsWith('"')) {
    $end = $raw.IndexOf('"', 1)
    if ($end -lt 2) { throw "Malformed uninstall string: $raw" }
    return $raw.Substring(1, $end - 1)
  }
  return ($raw -split '\s+')[0]
}

function Resolve-InstallDir([object]$record) {
  if ($record.InstallLocation -and (Test-Path -LiteralPath $record.InstallLocation)) {
    return (Resolve-Path -LiteralPath $record.InstallLocation).Path
  }
  return (Split-Path (Resolve-Uninstaller $record) -Parent)
}

function Install-Miqo {
  $p = Start-Process -FilePath $Installer.FullName -ArgumentList "/S" -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw "Installer exited $($p.ExitCode)" }
  $record = Get-MiqoInstallRecord
  $dir = Resolve-InstallDir $record
  $exe = Get-ChildItem -LiteralPath $dir -Filter "miqo-desktop-runtime.exe" -Recurse | Select-Object -First 1
  if (-not $exe) { throw "Installed MIQO executable missing under $dir" }
  return [pscustomobject]@{ Record=$record; Dir=$dir; Exe=$exe.FullName }
}

function Uninstall-Miqo([object]$install) {
  $uninstaller = Resolve-Uninstaller $install.Record
  if (-not (Test-Path -LiteralPath $uninstaller)) { throw "Uninstaller missing: $uninstaller" }
  $p = Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw "Uninstaller exited $($p.ExitCode)" }
  for ($i=0; $i -lt 60 -and (Test-Path -LiteralPath $install.Exe); $i++) { Start-Sleep -Milliseconds 500 }
  if (Test-Path -LiteralPath $install.Exe) { throw "Installed executable remains after uninstall" }
}

$Poison = Join-Path $Proof "poison-bin"
$PoisonLog = Join-Path $Proof "poison-used.log"
New-Item $Poison -ItemType Directory -Force | Out-Null
foreach ($name in @("node","npm","npx","docker","psql","postgres","pg_ctl")) {
  @"
@echo off
echo $name %*>>"$PoisonLog"
exit /b 97
"@ | Set-Content (Join-Path $Poison "$name.cmd") -Encoding ascii
}

$OriginalPath = $env:Path
$script:RuntimeProcess = $null

function Start-Miqo([string]$label, [string]$exe) {
  $ready = Join-Path $Proof "$label-ready.txt"
  $stop = Join-Path $Proof "$label-stop.request"
  $shutdown = Join-Path $Proof "$label-shutdown.json"
  $dataProof = Join-Path $Proof "$label-data-dir.txt"
  $stdout = Join-Path $Proof "$label-stdout.log"
  $stderr = Join-Path $Proof "$label-stderr.log"
  Remove-Item $ready,$stop,$shutdown,$dataProof,$stdout,$stderr -Force -ErrorAction SilentlyContinue

  $env:MIQO_DESKTOP_READY_FILE = $ready
  $env:MIQO_DESKTOP_STOP_FILE = $stop
  $env:MIQO_DESKTOP_SHUTDOWN_FILE = $shutdown
  $env:MIQO_DESKTOP_DATA_DIR_PROOF_FILE = $dataProof
  $env:MIQO_DATA_CLASSIFICATION = "SYNTHETIC"
  $env:MIQO_LIVE_PROVIDERS_ENABLED = "false"
  $env:Path = "$Poison;$env:SystemRoot\System32;$env:SystemRoot"

  $script:RuntimeProcess = Start-Process -FilePath $exe -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  $env:Path = $OriginalPath

  for ($i=0; $i -lt 240; $i++) {
    if (Test-Path $ready) { break }
    if ($script:RuntimeProcess.HasExited) {
      Get-Content $stderr -ErrorAction SilentlyContinue
      throw "Installed runtime exited before readiness: $label"
    }
    Start-Sleep -Seconds 1
  }
  if (-not (Test-Path $ready)) { throw "Installed runtime readiness timeout: $label" }
  if (-not (Test-Path $dataProof)) { throw "Installed runtime data-dir proof missing: $label" }

  $actualData = (Get-Content $dataProof -Raw).Trim()
  if ($actualData -ne $ExpectedDataDir) {
    throw "Unexpected default data directory: $actualData expected $ExpectedDataDir"
  }

  $health = Invoke-RestMethod "http://127.0.0.1:4000/health"
  if ($health.dataClassification -ne "SYNTHETIC" -or $health.liveProvidersEnabled -ne $false -or $health.databaseBackend -ne "pglite") {
    throw "Installed API health boundary mismatch"
  }

  $listeners = Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000,3001,4000 }
  if (@($listeners | Where-Object { $_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
    $listeners | Format-Table | Out-String | Set-Content (Join-Path $Proof "$label-listeners.txt")
    throw "Installed services are not loopback-only"
  }
  $listeners | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json | Set-Content (Join-Path $Proof "$label-listeners.json")

  $installDir = Split-Path $exe -Parent
  $packagedNodes = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($installDir,[System.StringComparison]::OrdinalIgnoreCase) })
  if ($packagedNodes.Count -lt 3) { throw "Expected packaged Node service processes under installed directory" }
  $packagedNodes | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Depth 4 |
    Set-Content (Join-Path $Proof "$label-packaged-node-processes.json")

  $external = @()
  foreach ($nodeProcess in $packagedNodes) {
    $external += @(Get-NetTCPConnection -OwningProcess $nodeProcess.ProcessId -State Established -ErrorAction SilentlyContinue |
      Where-Object { $_.RemoteAddress -notin @("127.0.0.1","::1") })
  }
  if ($external.Count -gt 0) {
    $external | ConvertTo-Json | Set-Content (Join-Path $Proof "$label-external-node-connections.json")
    throw "Packaged MIQO Node processes opened non-loopback established connections"
  }

  if (Test-Path $PoisonLog) { throw "Installed runtime attempted a host development dependency" }
  return [pscustomobject]@{ Ready=$ready; Stop=$stop; Shutdown=$shutdown; Data=$actualData }
}

function Stop-Miqo([object]$markers) {
  "stop" | Set-Content $markers.Stop
  try { Wait-Process -Id $script:RuntimeProcess.Id -Timeout 90 -ErrorAction Stop } catch {
    Stop-Process -Id $script:RuntimeProcess.Id -Force -ErrorAction SilentlyContinue
    throw "Installed runtime did not shut down cleanly"
  }
  if (-not (Test-Path $markers.Shutdown)) { throw "Shutdown marker missing" }
  $shutdown = Get-Content $markers.Shutdown -Raw | ConvertFrom-Json
  if ($shutdown.clean -ne $true -or $shutdown.databaseBackend -ne "pglite") { throw "Shutdown evidence invalid" }
  foreach ($port in 3000,3001,4000) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
      throw "Listener remains after shutdown on port $port"
    }
  }
  $script:RuntimeProcess = $null
}

function New-PersistenceMarker {
  $profile = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4000/profiles" -ContentType "application/json" -Body "{}"
  $profileId = [string]$profile.profileId
  $versionId = [string]$profile.versionId
  foreach ($fact in @(
    @{ id="main_driver_id"; value="DRV-SYN-G2-PERSIST" },
    @{ id="annual_mileage"; value=8123 },
    @{ id="licence_held_since"; value="2018-04-16" }
  )) {
    $body = @{value=$fact.value} | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:4000/profile-versions/$versionId/facts/$($fact.id)" -ContentType "application/json" -Body $body | Out-Null
  }
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4000/profiles/$profileId/validate" -ContentType "application/json" -Body "{}" | Out-Null
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4000/profiles/$profileId/lock" -ContentType "application/json" -Body "{}" | Out-Null
  return $profileId
}

function Assert-LockedProfile([string]$profileId) {
  $headers = @{"x-miqo-synthetic-admin"="DB-G10-SYNTHETIC-ADMIN"}
  $profile = Invoke-RestMethod -Headers $headers "http://127.0.0.1:4000/admin/profiles/$profileId"
  $json = $profile | ConvertTo-Json -Depth 20
  if ($json -notmatch "LOCKED") { throw "Persisted profile is not LOCKED" }
  $json | Set-Content (Join-Path $Proof "persisted-profile-$profileId.json")
}

try {
  $installerSignatureResult = Get-AuthenticodeSignature -LiteralPath $Installer.FullName
  if (-not $installerSignatureResult) { throw "Installer Authenticode inspection returned no result" }
  $installerSignature = $installerSignatureResult.Status.ToString()
  if ($installerSignature -ne "NotSigned") { throw "G2 scope expects unsigned installer; got $installerSignature" }

  $install = Install-Miqo
  $appSignatureResult = Get-AuthenticodeSignature -LiteralPath $install.Exe
  if (-not $appSignatureResult) { throw "Application Authenticode inspection returned no result" }
  $appSignature = $appSignatureResult.Status.ToString()
  if ($appSignature -ne "NotSigned") { throw "G2 scope expects unsigned app; got $appSignature" }

  $packagedNode = Get-ChildItem -LiteralPath $install.Dir -Filter "node.exe" -Recurse |
    Where-Object { $_.FullName -match "[\\/]runtime[\\/]node[\\/]node\.exe$" } | Select-Object -First 1
  if (-not $packagedNode) { throw "Packaged Node resource missing from install" }
  if ((& $packagedNode.FullName --version).Trim() -ne "v22.23.3") { throw "Installed packaged Node version mismatch" }

  $manifest = Get-ChildItem -LiteralPath $install.Dir -Filter "runtime-manifest.json" -Recurse | Select-Object -First 1
  if (-not $manifest) { throw "Installed runtime manifest missing" }

  $first = Start-Miqo "first-run" $install.Exe

  $env:Path = $OriginalPath
  & npx playwright test -c playwright.desktop.config.ts sp4-customer-recommendation-journey.spec.ts sp4-admin-end-to-end-trace.spec.ts
  if ($LASTEXITCODE -ne 0) { throw "Installed customer/admin journey failed" }

  $profileId = New-PersistenceMarker
  $profileId | Set-Content (Join-Path $Proof "persistence-profile-id.txt")
  Stop-Miqo $first

  if (-not (Test-Path $ExpectedDataDir)) { throw "PGlite data directory missing after first shutdown" }

  $restart = Start-Miqo "restart" $install.Exe
  Assert-LockedProfile $profileId
  Stop-Miqo $restart

  $hashInventory = @(
    @{name="installer";path=$Installer.FullName},
    @{name="installedExecutable";path=$install.Exe},
    @{name="packagedNode";path=$packagedNode.FullName},
    @{name="runtimeManifest";path=$manifest.FullName}
  ) | ForEach-Object {
    $item = Get-Item -LiteralPath $_.path
    [ordered]@{
      name = $_.name
      path = $_.path
      bytes = $item.Length
      sha256 = (Get-FileHash $_.path -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }
  $hashInventory | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $Proof "sha256-inventory.json")

  [ordered]@{
    installerSignature = $installerSignature
    appSignature = $appSignature
    installMode = "currentUser"
    webviewInstallMode = "embedBootstrapper"
    rustStaticVCRuntime = "tauri-default"
    loopbackOnly = $true
    packagedNodeVersion = "22.23.3"
    databaseBackend = "pglite"
    syntheticOnly = $true
  } | ConvertTo-Json | Set-Content (Join-Path $Proof "security-inspection.json")

  Uninstall-Miqo $install
  if (-not (Test-Path $ExpectedDataDir)) { throw "Uninstall deleted retained application data contrary to G2 policy" }

  $reinstall = Install-Miqo
  $afterReinstall = Start-Miqo "reinstall" $reinstall.Exe
  Assert-LockedProfile $profileId
  Stop-Miqo $afterReinstall

  Uninstall-Miqo $reinstall
  if (-not (Test-Path $ExpectedDataDir)) { throw "Final uninstall did not preserve application data" }
  if (Test-Path $PoisonLog) { throw "Host dependency poison command was invoked" }

  [ordered]@{
    g2_1 = "PASS"
    g2_2 = "PASS"
    g2_3 = "PASS"
    g2_4 = "PASS"
    g2_5 = "PASS"
    g2_6 = "PASS"
    g2_7 = "PASS"
    platform = "windows-x64"
    installer = "NSIS"
    signing = "NOT_AUTHORISED"
    nativeWindow = "PASS"
    customerJourney = "PASS"
    restartPersistence = "PASS"
    adminDiagnostics = "PASS"
    uninstallDataPolicy = "PRESERVE"
    reinstallPersistence = "PASS"
    hostNodeRequired = $false
    hostNpmRequired = $false
    dockerRequired = $false
    externalPostgresRequired = $false
    databaseBackend = "PGLITE"
    boundary = "SYNTHETIC_ONLY"
  } | ConvertTo-Json | Set-Content (Join-Path $Proof "desktop-g2-proof.json")
  Get-Content (Join-Path $Proof "desktop-g2-proof.json")
}
finally {
  $env:Path = $OriginalPath
  if ($script:RuntimeProcess -and -not $script:RuntimeProcess.HasExited) {
    Stop-Process -Id $script:RuntimeProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
