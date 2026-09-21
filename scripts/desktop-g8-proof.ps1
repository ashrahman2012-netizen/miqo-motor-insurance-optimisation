param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProductName = "MIQOS Admin [TEST]"
$ProductExe = "miqos-admin.exe"
$Identifier = "com.miqos.admin.desktop.test"
$BaselineVersion = "0.1.0"
$UpgradeVersion = "0.1.1"
$ProofDir = "dist/g8-proof"
$BaselineInstaller = "dist/desktop/miqos-admin_0.1.0_windows-x64_nsis.exe"
$ProfilePath = "apps/admin-desktop/src-tauri/resources/deployment-profile.test.json"

New-Item -ItemType Directory -Force -Path $ProofDir | Out-Null

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Get-ProductEntry {
  $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
  return @(Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object {
    $displayName = $_.PSObject.Properties["DisplayName"]
    $null -ne $displayName -and [string]$displayName.Value -eq $ProductName
  }) | Select-Object -First 1
}

function Get-MachineProductEntry {
  $paths = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )
  $items = foreach ($path in $paths) {
    Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object {
      $displayName = $_.PSObject.Properties["DisplayName"]
      $null -ne $displayName -and [string]$displayName.Value -eq $ProductName
    }
  }
  return @($items)
}

function Wait-ProductEntry {
  param([string]$ExpectedVersion, [int]$Seconds = 30)
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    $entry = Get-ProductEntry
    if ($entry -and [string]$entry.DisplayVersion -eq $ExpectedVersion) { return $entry }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  throw "Installed product '$ProductName' version '$ExpectedVersion' was not found in HKCU uninstall metadata."
}

function Invoke-Executable {
  param(
    [string]$FilePath,
    [string[]]$Arguments = @(),
    [int]$TimeoutSeconds = 180
  )
  $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -PassThru
  if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
    try { taskkill /PID $process.Id /T /F | Out-Null } catch {}
    throw "Process timed out: $FilePath $($Arguments -join ' ')"
  }
  return $process.ExitCode
}

function Find-InstalledExecutable {
  param($Entry)
  $candidates = @()

  if ($Entry.InstallLocation) {
    $installLocation = ([string]$Entry.InstallLocation).Trim().Trim('"')
    if (-not [string]::IsNullOrWhiteSpace($installLocation)) {
      $candidates += Join-Path $installLocation $ProductExe
    }
  }

  if ($Entry.DisplayIcon) {
    $displayIcon = ([string]$Entry.DisplayIcon).Trim('"')
    $displayIcon = $displayIcon -replace ',\d+$',''
    $candidates += $displayIcon
  }

  $candidates += Join-Path $env:LOCALAPPDATA "$ProductName\$ProductExe"

  foreach ($candidate in $candidates | Select-Object -Unique) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  $found = Get-ChildItem -Path $env:LOCALAPPDATA -Filter $ProductExe -File -Recurse -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1

  if ($found) { return $found.FullName }
  throw "Installed executable '$ProductExe' was not found under LocalAppData."
}

function Stop-AppProcess {
  param($Process)
  if ($Process -and -not $Process.HasExited) {
    try { taskkill /PID $Process.Id /T /F | Out-Null } catch {}
    try { $Process.WaitForExit(10000) | Out-Null } catch {}
  }
}

function Start-InstalledApp {
  param([string]$Executable)
  $originalPath = $env:PATH
  try {
    $env:PATH = "$env:SystemRoot\System32;$env:SystemRoot"
    return Start-Process -FilePath $Executable -PassThru
  } finally {
    $env:PATH = $originalPath
  }
}

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Wait-MainWindow {
  param($Process, [int]$Seconds = 30)
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    if ($Process.HasExited) { throw "Installed MIQOS Admin exited before its window became available." }
    $Process.Refresh()
    if ($Process.MainWindowHandle -ne 0 -and $Process.MainWindowTitle -eq $ProductName) {
      return [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$Process.MainWindowHandle)
    }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  throw "MIQOS Admin main window was not available with the expected title."
}

function Get-UiNames {
  param([System.Windows.Automation.AutomationElement]$Root)
  $collection = $Root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )
  $names = New-Object System.Collections.Generic.List[string]
  for ($index = 0; $index -lt $collection.Count; $index++) {
    try {
      $name = [string]$collection.Item($index).Current.Name
      if (-not [string]::IsNullOrWhiteSpace($name)) { $names.Add($name) }
    } catch {}
  }
  return $names.ToArray()
}

function Wait-UiText {
  param(
    [System.Windows.Automation.AutomationElement]$Root,
    [string]$Text,
    [int]$Seconds = 30
  )
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    $names = Get-UiNames $Root
    $joined = $names -join "`n"
    if ($joined.Contains($Text)) { return $names }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  throw "Installed UI did not expose expected text '$Text'."
}

function Invoke-UiButton {
  param(
    [System.Windows.Automation.AutomationElement]$Root,
    [string]$Name
  )
  $condition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::NameProperty,
    $Name
  )
  $element = $Root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
  if (-not $element) { throw "UI action '$Name' was not found." }
  $pattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  if (-not $pattern) { throw "UI action '$Name' does not expose InvokePattern." }
  $pattern.Invoke()
}

function Start-G8Stub {
  $stubPath = Join-Path $ProofDir "g8-loopback-stub.mjs"
  $stdout = Join-Path $ProofDir "g8-loopback-stub.stdout.log"
  $stderr = Join-Path $ProofDir "g8-loopback-stub.stderr.log"

  @'
import http from "node:http";

const auditEvent = {
  auditEventId: "AUD-G8-INSTALLED-001",
  eventType: "profile_created",
  entityType: "profile",
  entityId: "PRO-SYN-001",
  traceId: "PRO-SYN-001",
  occurredAt: "2026-09-21T12:00:00.000Z",
  metadataJson: {versionId: "RPV-SYN-001-V1"}
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1:4000");
  res.setHeader("content-type", "application/json");

  if (req.method === "GET" && url.pathname === "/health") {
    res.end(JSON.stringify({
      status: "ok",
      dataClassification: "SYNTHETIC",
      liveProvidersEnabled: false
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/admin/audit" && url.searchParams.get("profileId") === "PRO-SYN-001") {
    res.end(JSON.stringify({items: [auditEvent]}));
    return;
  }

  if (req.method === "GET" && url.pathname === "/profiles/PRO-SYN-001/discrepancies") {
    res.end(JSON.stringify({items: []}));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({error: "G8_STUB_NOT_FOUND"}));
});

server.listen(4000, "127.0.0.1", () => {
  console.log("G8_STUB_READY");
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
'@ | Set-Content -LiteralPath $stubPath -Encoding UTF8

  $node = (Get-Command node).Source
  $process = Start-Process -FilePath $node -ArgumentList "`"$stubPath`"" -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

  $deadline = (Get-Date).AddSeconds(20)
  do {
    if ($process.HasExited) {
      throw "G8 loopback stub exited before becoming ready."
    }
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -TimeoutSec 2
      if ($health.status -eq "ok") { return $process }
    } catch {}
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $deadline)

  Stop-AppProcess $process
  throw "G8 loopback stub did not become ready."
}

function Get-UninstallerPath {
  param($Entry, [string]$InstalledExecutable)
  if ($Entry.UninstallString) {
    $value = [string]$Entry.UninstallString
    if ($value -match '^"([^"]+)"') {
      if (Test-Path -LiteralPath $matches[1]) { return $matches[1] }
    } elseif ($value -match '^(.+?\.exe)') {
      if (Test-Path -LiteralPath $matches[1]) { return $matches[1] }
    }
  }

  $candidate = Join-Path (Split-Path $InstalledExecutable -Parent) "uninstall.exe"
  if (Test-Path -LiteralPath $candidate) { return $candidate }
  throw "NSIS uninstaller was not found."
}

function Assert-StaticSecurityBoundary {
  $config = Get-Content "apps/admin-desktop/src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
  $capability = Get-Content "apps/admin-desktop/src-tauri/capabilities/scaffold.json" -Raw | ConvertFrom-Json
  $package = Get-Content "apps/admin-desktop/package.json" -Raw | ConvertFrom-Json

  Assert-True ($config.app.windows[0].devtools -eq $false) "Production/test package devtools must remain disabled."

  $csp = [string]$config.app.security.csp
  Assert-True ($csp.Contains("default-src 'self'")) "CSP must default to self."
  Assert-True ($csp.Contains("connect-src 'self'")) "Renderer connect-src must remain self-only."
  Assert-True (-not $csp.Contains("'unsafe-eval'")) "CSP must not permit unsafe-eval."
  Assert-True (-not $csp.Contains("http:")) "Renderer CSP must not permit arbitrary HTTP origins."
  Assert-True (-not $csp.Contains("https:")) "Renderer CSP must not permit arbitrary HTTPS origins."

  $permissions = @($capability.permissions)
  $expected = @(
    "allow-get-runtime-profile",
    "allow-get-health",
    "allow-load-admin-profile-audit"
  )
  Assert-True ($permissions.Count -eq $expected.Count) "Capability must expose exactly three proof commands."
  foreach ($permission in $expected) {
    Assert-True ($permissions -contains $permission) "Missing native permission '$permission'."
  }
  foreach ($permission in $permissions) {
    Assert-True (-not ([string]$permission).StartsWith("core:")) "Broad Tauri core permission detected."
    Assert-True (-not ([string]$permission).StartsWith("shell:")) "Shell permission detected."
    Assert-True (-not ([string]$permission).StartsWith("fs:")) "Filesystem permission detected."
    Assert-True (-not ([string]$permission).StartsWith("http:")) "Generic HTTP plugin permission detected."
  }

  $dependencyNames = @($package.dependencies.PSObject.Properties.Name)
  Assert-True (-not ($dependencyNames -contains "@miqo/db")) "Desktop must not depend on @miqo/db."
  Assert-True (-not ($dependencyNames -contains "pg")) "Desktop must not depend on pg."
}

Assert-StaticSecurityBoundary

Assert-True (Test-Path -LiteralPath $BaselineInstaller) "G8 baseline NSIS installer is missing."
$baselineInstallerHash = (Get-FileHash -LiteralPath $BaselineInstaller -Algorithm SHA256).Hash.ToLowerInvariant()
$profileHash = (Get-FileHash -LiteralPath $ProfilePath -Algorithm SHA256).Hash.ToLowerInvariant()

$existing = Get-ProductEntry
if ($existing) {
  $existingExe = Find-InstalledExecutable $existing
  $existingUninstaller = Get-UninstallerPath $existing $existingExe
  $exit = Invoke-Executable $existingUninstaller @("/S")
  Assert-True ($exit -eq 0) "Pre-existing TEST package could not be removed."
}

$logDir = Join-Path $env:LOCALAPPDATA "$Identifier\logs"
if (Test-Path $logDir) { Remove-Item $logDir -Recurse -Force }

$installExit = Invoke-Executable (Resolve-Path $BaselineInstaller).Path @("/S")
Assert-True ($installExit -eq 0) "Baseline NSIS installation failed with exit code $installExit."

$entry = Wait-ProductEntry $BaselineVersion
Assert-True (@(Get-MachineProductEntry).Count -eq 0) "Current-user package unexpectedly registered in HKLM."
$installedExe = Find-InstalledExecutable $entry
Assert-True ($installedExe.StartsWith($env:LOCALAPPDATA, [System.StringComparison]::OrdinalIgnoreCase)) "Current-user package was not installed under LocalAppData."

$forbiddenRuntimeFiles = @("node.exe","npm.cmd","rustc.exe","cargo.exe","postgres.exe","libpq.dll")
$installDir = Split-Path $installedExe -Parent
foreach ($name in $forbiddenRuntimeFiles) {
  $found = Get-ChildItem -Path $installDir -Filter $name -File -Recurse -ErrorAction SilentlyContinue
  Assert-True (@($found).Count -eq 0) "Forbidden runtime dependency '$name' was packaged."
}

try {
  $existingHealth = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -TimeoutSec 1
  throw "Port 4000 was unexpectedly occupied before the controlled failure proof: $($existingHealth.status)"
} catch {
  if ($_.Exception.Message -like "Port 4000 was unexpectedly occupied*") { throw }
}

$app = Start-InstalledApp $installedExe
$root = Wait-MainWindow $app
$failureNames = Wait-UiText $root "Synthetic Admin API unavailable" 35
Assert-True (($failureNames -join "`n").Contains("Retry safe read")) "Controlled failure UI did not expose the safe retry action."

$stub = Start-G8Stub
try {
  Invoke-UiButton $root "Retry safe read"
  $successNames = Wait-UiText $root "Profile created" 30
  $successText = $successNames -join "`n"
  Assert-True ($successText.Contains("SYNTHETIC")) "Installed success UI did not expose SYNTHETIC identity."
  Assert-True ($successText.Contains("ATTESTED")) "Installed success UI did not expose successful environment attestation."
  Assert-True ($successText.Contains("PRO-SYN-001")) "Installed success UI did not expose the representative profile reference."
  Assert-True ($successText.Contains($env:GITHUB_RUN_ID)) "Installed runtime identity did not expose the CI build ID."
} finally {
  Stop-AppProcess $app
  Stop-AppProcess $stub
}

$deadline = (Get-Date).AddSeconds(10)
$logText = ""
do {
  if (Test-Path $logDir) {
    $files = @(Get-ChildItem $logDir -File -ErrorAction SilentlyContinue)
    if ($files.Count) {
      $logText = ($files | Get-Content -Raw) -join "`n"
      if ($logText.Contains('"eventCode":"API_REQUEST_COMPLETE"')) { break }
    }
  }
  Start-Sleep -Milliseconds 300
} while ((Get-Date) -lt $deadline)

Assert-True ($logText.Contains('"eventCode":"APP_START"')) "Structured log is missing APP_START."
Assert-True ($logText.Contains('"eventCode":"API_REQUEST_FAILURE"')) "Structured log is missing the controlled API failure."
Assert-True ($logText.Contains('"eventCode":"ENV_ATTEST_PASS"')) "Structured log is missing environment attestation."
Assert-True ($logText.Contains('"eventCode":"API_REQUEST_COMPLETE"')) "Structured log is missing representative read completion."
Assert-True (-not $logText.Contains("Bearer ")) "Operational log contains bearer material."
Assert-True (-not $logText.Contains("refresh_token")) "Operational log contains refresh-token material."

$baselineCopy = Join-Path $ProofDir "miqos-admin_0.1.0_windows-x64_nsis.exe"
Copy-Item -LiteralPath $BaselineInstaller -Destination $baselineCopy -Force

$packagePath = "apps/admin-desktop/package.json"
$tauriConfigPath = "apps/admin-desktop/src-tauri/tauri.conf.json"
$cargoPath = "apps/admin-desktop/src-tauri/Cargo.toml"
$cargoLockPath = "apps/admin-desktop/src-tauri/Cargo.lock"
$upgradeInstallerPath = $null

try {
  $package = Get-Content $packagePath -Raw | ConvertFrom-Json
  $package.version = $UpgradeVersion
  $package | ConvertTo-Json -Depth 20 | Set-Content $packagePath

  $config = Get-Content $tauriConfigPath -Raw | ConvertFrom-Json
  $config.version = $UpgradeVersion
  $config | ConvertTo-Json -Depth 20 | Set-Content $tauriConfigPath

  $cargo = Get-Content $cargoPath -Raw
  $versionRegex = [regex]::new('(?m)^version = "0\.1\.0"$')
  $cargo = $versionRegex.Replace($cargo, 'version = "0.1.1"', 1)
  Set-Content $cargoPath $cargo

  $tauriCli = Join-Path (Resolve-Path "node_modules/.bin").Path "tauri.cmd"
  & $tauriCli build --bundles nsis
  if ($LASTEXITCODE -ne 0) { throw "Ephemeral upgrade package build failed." }

  $upgradeInstaller = Get-ChildItem "apps/admin-desktop/src-tauri/target/release/bundle/nsis" -Filter "*0.1.1*x64-setup.exe" -File |
    Select-Object -First 1
  if (-not $upgradeInstaller) { throw "Ephemeral 0.1.1 NSIS installer was not produced." }
  $upgradeInstallerPath = Join-Path $ProofDir $upgradeInstaller.Name
  Copy-Item $upgradeInstaller.FullName $upgradeInstallerPath -Force
} finally {
  git checkout -- $packagePath $tauriConfigPath $cargoPath $cargoLockPath
}

Assert-True (-not [string]::IsNullOrWhiteSpace($upgradeInstallerPath)) "Ephemeral 0.1.1 installer path was not recorded."
Assert-True (Test-Path -LiteralPath $upgradeInstallerPath) "Copied 0.1.1 upgrade installer was not found in the proof directory."
$upgradeExit = Invoke-Executable (Resolve-Path -LiteralPath $upgradeInstallerPath).Path @("/S")
Assert-True ($upgradeExit -eq 0) "0.1.1 upgrade installation failed."
$upgradeEntry = Wait-ProductEntry $UpgradeVersion

$downgradeExit = Invoke-Executable $baselineCopy @("/S")
Start-Sleep -Seconds 1
$postDowngrade = Get-ProductEntry
Assert-True ($postDowngrade -and [string]$postDowngrade.DisplayVersion -eq $UpgradeVersion) "Older installer replaced the 0.1.1 package; downgrade protection failed."

$installedAfterUpgrade = Find-InstalledExecutable $upgradeEntry
$uninstaller = Get-UninstallerPath $upgradeEntry $installedAfterUpgrade
$uninstallExit = Invoke-Executable $uninstaller @("/S")
Assert-True ($uninstallExit -eq 0) "NSIS uninstall failed."

$deadline = (Get-Date).AddSeconds(30)
do {
  $remaining = Get-ProductEntry
  if (-not $remaining) { break }
  Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline)

Assert-True (-not (Get-ProductEntry)) "Uninstall registration remains after uninstall."
Assert-True (-not (Test-Path -LiteralPath $installedAfterUpgrade)) "Installed executable remains after uninstall."

$webViewPath = Join-Path ${env:ProgramFiles(x86)} "Microsoft\EdgeWebView\Application"
$webViewVersion = if (Test-Path $webViewPath) {
  $versionDirectory = Get-ChildItem $webViewPath -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
    Sort-Object Name -Descending |
    Select-Object -First 1
  if ($versionDirectory) { $versionDirectory.Name } else { $null }
} else { $null }

$evidence = [ordered]@{
  schemaVersion = "miqos-desktop-g8-proof-v1"
  generatedAtUtc = [DateTime]::UtcNow.ToString("o")
  sourceCommit = $env:GITHUB_SHA
  buildId = $env:GITHUB_RUN_ID
  packageVersion = $BaselineVersion
  installerSha256 = $baselineInstallerHash
  deploymentProfileSha256 = $profileHash
  packageIdentity = $Identifier
  installScope = "currentUser"
  installedUnderLocalAppData = $true
  machineUninstallRegistrationAbsent = $true
  installedLaunch = "PASS"
  windowTitle = $ProductName
  controlledFailureRendered = "PASS"
  retrySafeReadInvoked = "PASS"
  syntheticSuccessRendered = "PASS"
  environmentAttestation = "PASS"
  representativeAdminAuditRead = "PASS"
  structuredLogging = "PASS"
  runtimePathSanitised = "PASS"
  forbiddenRuntimeDependenciesAbsent = $forbiddenRuntimeFiles
  webView2RuntimeVersion = $webViewVersion
  upgradeFrom = $BaselineVersion
  upgradeTo = $UpgradeVersion
  upgrade = "PASS"
  downgradeAttemptExitCode = $downgradeExit
  downgradeRejected = "PASS"
  uninstall = "PASS"
  csp = "PASS"
  capabilityBoundary = "PASS"
  directDatabaseDependencyAbsent = "PASS"
}

$evidence | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $ProofDir "g8-windows-proof.json")
Write-Host "DESKTOP_G8_WINDOWS_PROOF_PASS"
