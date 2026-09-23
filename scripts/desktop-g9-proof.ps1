param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$G8Proof = "dist/g8-proof/g8-windows-proof.json"
$BuildManifest = "dist/desktop/build-manifest.json"
$G9Dir = "dist/g9-proof"

New-Item -ItemType Directory -Force -Path $G9Dir | Out-Null

function Assert-True {
  param([bool]$Condition,[string]$Message)
  if (-not $Condition) { throw $Message }
}

& ./scripts/desktop-g8-proof.ps1
if ($LASTEXITCODE -ne 0) { throw "Inherited installed lifecycle proof failed." }

Assert-True (Test-Path -LiteralPath $G8Proof) "Strengthened G8 proof JSON is missing."
Assert-True (Test-Path -LiteralPath $BuildManifest) "Desktop build manifest is missing."

$proof = Get-Content -LiteralPath $G8Proof -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath $BuildManifest -Raw | ConvertFrom-Json

foreach ($field in @(
  "startMenuShortcut",
  "autoStartAbsent",
  "windowsServiceAbsent",
  "firewallRuleAbsent",
  "protocolAssociationAbsent",
  "machineEnvironmentMutationAbsent",
  "packageInspection",
  "productionSecretsAbsent",
  "localAuthoritativeDatastoreAbsent",
  "installedLaunch",
  "nativeOidcPkceAuthentication",
  "environmentAttestation",
  "representativeAdminAuditRead",
  "upgrade",
  "downgradeRejected",
  "uninstall",
  "csp",
  "capabilityBoundary"
)) {
  Assert-True ([string]$proof.$field -eq "PASS") "DB-G9 prerequisite '$field' did not pass."
}

Assert-True ([string]$proof.sourceCommit -eq [string]$env:GITHUB_SHA) "DB-G9 installed proof source SHA mismatch."
Assert-True ([string]$manifest.sourceCommit -eq [string]$env:GITHUB_SHA) "DB-G9 build manifest source SHA mismatch."
Assert-True ([string]$proof.installerSha256 -eq [string]$manifest.sha256) "DB-G9 installer checksum/provenance mismatch."
Assert-True ([string]$manifest.architecture -eq "x64") "DB-G9 package architecture mismatch."
Assert-True ([string]$manifest.installer -eq "NSIS") "DB-G9 package installer mismatch."
Assert-True ([string]$proof.installScope -eq "currentUser") "DB-G9 install scope is not current-user."
Assert-True ([string]$proof.signatureState -eq [string]$manifest.authentiCodeStatus) "DB-G9 signature-state evidence mismatch."
Assert-True (-not [string]::IsNullOrWhiteSpace([string]$proof.webView2RuntimeVersion)) "DB-G9 did not observe WebView2 Evergreen runtime."

$evidence = [ordered]@{
  schemaVersion = "miqos-desktop-db-g9-proof-v1"
  generatedAtUtc = [DateTime]::UtcNow.ToString("o")
  sourceCommit = [string]$env:GITHUB_SHA
  buildId = [string]$env:GITHUB_RUN_ID
  packageVersion = [string]$manifest.version
  installer = [string]$manifest.artifact
  installerBytes = [int64]$manifest.bytes
  installerSha256 = [string]$manifest.sha256
  architecture = [string]$manifest.architecture
  installerTechnology = [string]$manifest.installer
  node = [string]$manifest.node
  npm = [string]$manifest.npm
  rustc = [string]$manifest.rustc
  cargo = [string]$manifest.cargo
  tauriCli = [string]$manifest.tauriCli
  deploymentProfileSha256 = [string]$manifest.deploymentProfileSha256
  signatureState = [string]$manifest.authentiCodeStatus
  installScope = [string]$proof.installScope
  installedUnderLocalAppData = [bool]$proof.installedUnderLocalAppData
  machineRegistrationAbsent = [bool]$proof.machineUninstallRegistrationAbsent
  startMenuShortcut = [string]$proof.startMenuShortcut
  autoStartAbsent = [string]$proof.autoStartAbsent
  windowsServiceAbsent = [string]$proof.windowsServiceAbsent
  firewallRuleAbsent = [string]$proof.firewallRuleAbsent
  protocolAssociationAbsent = [string]$proof.protocolAssociationAbsent
  machineEnvironmentMutationAbsent = [string]$proof.machineEnvironmentMutationAbsent
  packageInspection = [string]$proof.packageInspection
  productionSecretsAbsent = [string]$proof.productionSecretsAbsent
  runtimePrerequisites = "PASS"
  localAuthoritativeDatastoreAbsent = [string]$proof.localAuthoritativeDatastoreAbsent
  webView2RuntimeVersion = [string]$proof.webView2RuntimeVersion
  installedLaunch = [string]$proof.installedLaunch
  nativeOidcPkceAuthentication = [string]$proof.nativeOidcPkceAuthentication
  syntheticBoundary = [string]$proof.environmentAttestation
  protectedAdminRead = [string]$proof.representativeAdminAuditRead
  baselineExecutableVersion = [string]$proof.baselineExecutableVersion
  upgradeExecutableVersion = [string]$proof.upgradeExecutableVersion
  upgrade = [string]$proof.upgrade
  downgradeAttemptExitCode = $proof.downgradeAttemptExitCode
  downgradeRejected = [string]$proof.downgradeRejected
  uninstall = [string]$proof.uninstall
  productionSigningCertified = $false
  productionReleaseAuthorised = $false
}

$evidence | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $G9Dir "db-g9-windows-lifecycle.json")
Write-Host "DESKTOP_DB_G9_WINDOWS_LIFECYCLE_PASS"
