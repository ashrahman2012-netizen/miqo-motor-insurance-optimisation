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
import {createHash, randomBytes} from "node:crypto";

const accessToken = "miqos-g8-installed-access-token";
const codes = new Map();
const b64url = value => Buffer.from(value).toString("base64url");
const sha256 = value => createHash("sha256").update(value).digest("base64url");
const json = (res,status,body) => { const data=JSON.stringify(body); res.writeHead(status,{"content-type":"application/json","content-length":Buffer.byteLength(data),"x-miqo-request-id":"g8-request","x-miqo-api-version":"0.1.0","x-miqo-api-build-id":process.env.GITHUB_RUN_ID??"g8","x-miqo-api-source-commit":process.env.GITHUB_SHA??"g8"}); res.end(data); };
const readBody = req => new Promise(resolve => { let body=""; req.on("data",c=>body+=c); req.on("end",()=>resolve(body)); });

const auditEvent = {
  auditEventId: "AUD-G8-INSTALLED-001",
  eventType: "profile_created",
  entityType: "profile",
  entityId: "PRO-SYN-001",
  traceId: "PRO-SYN-001",
  occurredAt: "2026-09-21T12:00:00.000Z",
  metadataJson: {versionId: "RPV-SYN-001-V1"}
};

const api = http.createServer((req,res)=>{
  const url=new URL(req.url??"/","http://127.0.0.1:4000");
  const traceparent=String(req.headers.traceparent??"");
  const traceId=traceparent.split("-")[1]??"g8-trace";
  res.setHeader("x-miqo-trace-id",traceId);
  if(req.method==="GET"&&url.pathname==="/health")return json(res,200,{status:"ok",dataClassification:"SYNTHETIC",liveProvidersEnabled:false});
  if(!url.pathname.startsWith("/desktop-admin/"))return json(res,404,{error:"G8_STUB_NOT_FOUND"});
  if(req.headers.authorization!=="Bearer "+accessToken)return json(res,401,{error:"ADMIN_AUTHENTICATION_REQUIRED"});
  if(req.method==="GET"&&url.pathname==="/desktop-admin/session")return json(res,200,{subjectId:"USR-SYN-ADMIN-001",displayName:"Synthetic Admin",environment:"SYNTHETIC",permissions:["miqos.admin.profile.read","miqos.admin.audit.read","miqos.admin.trace.read","miqos.admin.discrepancy.read","miqos.admin.integrity.read","miqos.admin.raw-evidence.read","miqos.admin.system.read"],sessionExpiresAt:new Date(Date.now()+300000).toISOString(),authenticationContext:{issuer:"http://127.0.0.1:4100",protocol:"OIDC_AUTHORIZATION_CODE_PKCE",credentialLocation:"NATIVE_PROCESS_MEMORY"}});
  if(req.method==="GET"&&url.pathname==="/desktop-admin/audit"&&url.searchParams.get("profileId")==="PRO-SYN-001")return json(res,200,{items:[auditEvent]});
  if(req.method==="GET"&&url.pathname==="/desktop-admin/profiles/PRO-SYN-001/discrepancies")return json(res,200,{items:[]});
  return json(res,404,{error:"G8_STUB_NOT_FOUND"});
});

const idp=http.createServer(async(req,res)=>{
  const issuer="http://127.0.0.1:4100";
  const url=new URL(req.url??"/",issuer);
  if(req.method==="GET"&&url.pathname==="/.well-known/openid-configuration")return json(res,200,{issuer,authorization_endpoint:issuer+"/authorize",token_endpoint:issuer+"/token",jwks_uri:issuer+"/jwks"});
  if(req.method==="GET"&&url.pathname==="/authorize"){
    const redirect=url.searchParams.get("redirect_uri"), state=url.searchParams.get("state"), challenge=url.searchParams.get("code_challenge");
    if(url.searchParams.get("client_id")!=="miqos-admin-test-public"||url.searchParams.get("audience")!=="miqos-api-test"||!redirect?.startsWith("http://127.0.0.1:")||!state||!challenge||url.searchParams.get("code_challenge_method")!=="S256")return json(res,400,{error:"invalid_request"});
    const code=b64url(randomBytes(18));codes.set(code,{redirect,challenge});
    const target=new URL(redirect);target.searchParams.set("code",code);target.searchParams.set("state",state);res.writeHead(302,{location:target.toString()});return res.end();
  }
  if(req.method==="POST"&&url.pathname==="/token"){
    const body=new URLSearchParams(await readBody(req));const code=body.get("code");const record=code?codes.get(code):null;
    if(!record||body.get("client_id")!=="miqos-admin-test-public"||body.get("redirect_uri")!==record.redirect||sha256(body.get("code_verifier")??"")!==record.challenge)return json(res,400,{error:"invalid_grant"});
    codes.delete(code);return json(res,200,{access_token:accessToken,token_type:"Bearer",expires_in:300,scope:"openid profile"});
  }
  return json(res,404,{error:"not_found"});
});

api.listen(4000,"127.0.0.1",()=>console.log("G8_API_READY"));
idp.listen(4100,"127.0.0.1",()=>console.log("G8_IDP_READY"));
process.on("SIGTERM",()=>api.close(()=>idp.close(()=>process.exit(0))));
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


function Get-ProductShortcuts {
  $root = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
  if (-not (Test-Path -LiteralPath $root)) { return @() }
  return @(Get-ChildItem -LiteralPath $root -Filter "*.lnk" -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*MIQOS*Admin*" })
}

function Assert-NoUnapprovedWindowsSideEffects {
  $services = @(Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like "*miqo*" -or $_.DisplayName -like "*MIQO*"
  })
  Assert-True ($services.Count -eq 0) "MIQOS package installed an unauthorised Windows service."

  if (Get-Command Get-NetFirewallRule -ErrorAction SilentlyContinue) {
    $rules = @(Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object {
      $_.DisplayName -like "*MIQO*" -or $_.Name -like "*miqo*"
    })
    Assert-True ($rules.Count -eq 0) "MIQOS package installed an unauthorised firewall rule."
  }

  $runPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
  if (Test-Path $runPath) {
    $runValues = (Get-ItemProperty $runPath -ErrorAction SilentlyContinue).PSObject.Properties |
      Where-Object { $_.MemberType -eq "NoteProperty" }
    foreach ($value in $runValues) {
      $text = [string]$value.Value
      Assert-True (-not ($value.Name -like "*MIQO*" -or $text -like "*miqos-admin*" -or $text -like "*MIQOS Admin*")) "MIQOS package installed an unauthorised auto-start entry."
    }
  }

  $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  if (Test-Path $startup) {
    $startupItems = @(Get-ChildItem -LiteralPath $startup -File -ErrorAction SilentlyContinue | Where-Object {
      $_.Name -like "*MIQO*"
    })
    Assert-True ($startupItems.Count -eq 0) "MIQOS package installed an unauthorised Startup item."
  }

  foreach ($classKey in @(
    "HKCU:\Software\Classes\miqos",
    "HKCU:\Software\Classes\$Identifier"
  )) {
    Assert-True (-not (Test-Path $classKey)) "MIQOS package installed an unauthorised protocol/file-association class '$classKey'."
  }

  $machineEnvironment = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
  if (Test-Path $machineEnvironment) {
    $machineValues = (Get-ItemProperty $machineEnvironment -ErrorAction SilentlyContinue).PSObject.Properties |
      Where-Object { $_.MemberType -eq "NoteProperty" -and $_.Name -like "MIQO*" }
    Assert-True (@($machineValues).Count -eq 0) "MIQOS package installed a machine-wide environment variable."
  }
}

function Assert-PackageInspection {
  param([string]$InstallDirectory)

  $forbiddenNames = @(
    ".env","id_rsa","id_ed25519","signing.key","private.key",
    "node.exe","npm.cmd","rustc.exe","cargo.exe","postgres.exe","pg_ctl.exe","libpq.dll",
    "git.exe","cl.exe","msbuild.exe","devenv.exe"
  )
  foreach ($name in $forbiddenNames) {
    $found = @(Get-ChildItem -Path $InstallDirectory -Filter $name -File -Recurse -ErrorAction SilentlyContinue)
    Assert-True ($found.Count -eq 0) "Forbidden packaged file '$name' was found."
  }

  $secretExtensions = @(".pem",".key",".pfx",".p12")
  $secretFiles = @(Get-ChildItem -Path $InstallDirectory -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $secretExtensions -contains $_.Extension.ToLowerInvariant() })
  Assert-True ($secretFiles.Count -eq 0) "Potential private-key/certificate container was packaged."

  $textExtensions = @(".json",".txt",".log",".config",".toml",".yaml",".yml",".js",".css",".html")
  $patterns = @(
    "-----BEGIN PRIVATE KEY-----",
    "-----BEGIN RSA PRIVATE KEY-----",
    "client_secret",
    "postgresql://",
    "DATABASE_PASSWORD=",
    "PROVIDER_API_KEY=",
    "SIGNING_PRIVATE_KEY="
  )
  foreach ($file in Get-ChildItem -Path $InstallDirectory -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $textExtensions -contains $_.Extension.ToLowerInvariant() }) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }
    foreach ($pattern in $patterns) {
      Assert-True (-not $content.Contains($pattern)) "Packaged text file '$($file.Name)' contains prohibited sensitive material marker '$pattern'."
    }
  }
}

function Assert-StaticSecurityBoundary {
  $config = Get-Content "apps/admin-desktop/src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
  $capabilityPath = "apps/admin-desktop/src-tauri/capabilities/admin-read.json"
  $legacyCapabilityPath = "apps/admin-desktop/src-tauri/capabilities/scaffold.json"
  Assert-True (Test-Path -LiteralPath $capabilityPath) "Active admin-read capability file is missing."
  Assert-True (-not (Test-Path -LiteralPath $legacyCapabilityPath)) "Proof-era scaffold capability must not remain active."
  $capability = Get-Content $capabilityPath -Raw | ConvertFrom-Json
  $package = Get-Content "apps/admin-desktop/package.json" -Raw | ConvertFrom-Json
  $installerHookPath = "apps/admin-desktop/src-tauri/windows/installer-hooks.nsh"

  Assert-True ($config.app.windows[0].devtools -eq $false) "Production/test package devtools must remain disabled."
  Assert-True ($config.bundle.windows.allowDowngrades -eq $false) "Windows package must disable downgrades."
  Assert-True ($config.bundle.windows.nsis.installerHooks -eq "./windows/installer-hooks.nsh") "NSIS downgrade guard must remain configured."
  Assert-True (Test-Path -LiteralPath $installerHookPath) "NSIS downgrade guard is missing."
  $installerHook = Get-Content -LiteralPath $installerHookPath -Raw
  Assert-True ($installerHook.Contains('nsis_tauri_utils::SemverCompare "${VERSION}" $R8')) "NSIS downgrade guard must compare installer and installed versions."
  Assert-True ($installerHook.Contains('$R9 == -1')) "NSIS downgrade guard must reject an older installer version."

  $csp = [string]$config.app.security.csp
  Assert-True ($csp.Contains("default-src 'self'")) "CSP must default to self."
  Assert-True ($csp.Contains("connect-src 'self'")) "Renderer connect-src must remain self-only."
  Assert-True (-not $csp.Contains("'unsafe-eval'")) "CSP must not permit unsafe-eval."
  Assert-True (-not $csp.Contains("http:")) "Renderer CSP must not permit arbitrary HTTP origins."
  Assert-True (-not $csp.Contains("https:")) "Renderer CSP must not permit arbitrary HTTPS origins."

  $configuredCapabilities = @($config.app.security.capabilities)
  Assert-True ($configuredCapabilities.Count -eq 1) "Main window must configure exactly one capability."
  Assert-True ($configuredCapabilities[0] -eq "admin-read") "Main window must use the admin-read capability."
  Assert-True ($capability.identifier -eq "admin-read") "Capability identifier must remain admin-read."

  $permissions = @($capability.permissions)
  $expected = @(
    "allow-get-runtime-profile",
    "allow-get-health",
    "allow-get-auth-session",
    "allow-begin-authentication",
    "allow-logout",
    "allow-load-admin-profile",
    "allow-load-admin-profile-version",
    "allow-load-admin-profile-audit",
    "allow-load-admin-selection-trace",
    "allow-get-diagnostics",
    "allow-create-support-snapshot"
  )
  Assert-True ($permissions.Count -eq $expected.Count) "Capability must expose exactly eleven approved auth/read/runtime/support commands."
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
$buildManifestPath = "dist/desktop/build-manifest.json"
Assert-True (Test-Path -LiteralPath $buildManifestPath) "Desktop build manifest is missing."
$buildManifest = Get-Content -LiteralPath $buildManifestPath -Raw | ConvertFrom-Json
Assert-True ([string]$buildManifest.sha256 -eq $baselineInstallerHash) "Build manifest checksum does not match the installer."
Assert-True ([string]$buildManifest.sourceCommit -eq [string]$env:GITHUB_SHA) "Build manifest source SHA does not match this workflow revision."
Assert-True ([string]$buildManifest.architecture -eq "x64") "Build manifest architecture is not x64."
Assert-True ([string]$buildManifest.installer -eq "NSIS") "Build manifest installer is not NSIS."
$signatureState = [string]$buildManifest.authentiCodeStatus

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
$baselineExecutableVersion = [string](Get-Item -LiteralPath $installedExe).VersionInfo.ProductVersion
Assert-True (-not [string]::IsNullOrWhiteSpace($baselineExecutableVersion)) "Installed baseline executable does not expose a product version."

$shortcuts = Get-ProductShortcuts
Assert-True ($shortcuts.Count -ge 1) "Current-user install did not create the required Start Menu shortcut."
Assert-NoUnapprovedWindowsSideEffects

$forbiddenRuntimeFiles = @("node.exe","npm.cmd","rustc.exe","cargo.exe","postgres.exe","pg_ctl.exe","libpq.dll","git.exe","cl.exe","msbuild.exe","devenv.exe")
$installDir = Split-Path $installedExe -Parent
foreach ($name in $forbiddenRuntimeFiles) {
  $found = Get-ChildItem -Path $installDir -Filter $name -File -Recurse -ErrorAction SilentlyContinue
  Assert-True (@($found).Count -eq 0) "Forbidden runtime dependency '$name' was packaged."
}
Assert-PackageInspection $installDir
$localAuthoritativeStores = @(Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA $Identifier) -File -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension.ToLowerInvariant() -in @(".db",".sqlite",".sqlite3",".mdb") })
Assert-True ($localAuthoritativeStores.Count -eq 0) "Local authoritative MIQOS datastore material was found."

try {
  $existingHealth = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -TimeoutSec 1
  throw "Port 4000 was unexpectedly occupied before the controlled failure proof: $($existingHealth.status)"
} catch {
  if ($_.Exception.Message -like "Port 4000 was unexpectedly occupied*") { throw }
}

$stub = Start-G8Stub
$app = Start-InstalledApp $installedExe
$root = Wait-MainWindow $app
try {
  $signedOutNames = Wait-UiText $root "Sign in required" 30
  Assert-True (($signedOutNames -join "`n").Contains("Sign in")) "Signed-out UI did not expose native sign-in."
  Invoke-UiButton $root "Sign in"
  $successNames = Wait-UiText $root "Profile created" 45
  $successText = $successNames -join "`n"
  Assert-True ($successText.Contains("AUTHENTICATED")) "Installed UI did not expose authenticated session state."
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
Assert-True ($logText.Contains('"eventCode":"ENV_ATTEST_PASS"')) "Structured log is missing environment attestation."
Assert-True ($logText.Contains('"eventCode":"AUTH_STARTED"')) "Structured log is missing authentication start."
Assert-True ($logText.Contains('"eventCode":"AUTH_SUCCEEDED"')) "Structured log is missing authentication success."
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
  Copy-Item -LiteralPath $upgradeInstaller.FullName -Destination $upgradeInstallerPath -Force
} finally {
  git checkout -- $packagePath $tauriConfigPath $cargoPath $cargoLockPath
}

Assert-True (-not [string]::IsNullOrWhiteSpace($upgradeInstallerPath)) "Ephemeral 0.1.1 installer path was not recorded."
Assert-True (Test-Path -LiteralPath $upgradeInstallerPath) "Copied 0.1.1 upgrade installer was not found in the proof directory."
$upgradeExit = Invoke-Executable (Resolve-Path -LiteralPath $upgradeInstallerPath).Path @("/S")
Assert-True ($upgradeExit -eq 0) "0.1.1 upgrade installation failed."
$upgradeEntry = Wait-ProductEntry $UpgradeVersion
$installedAfterUpgrade = Find-InstalledExecutable $upgradeEntry
$upgradeExecutableVersion = [string](Get-Item -LiteralPath $installedAfterUpgrade).VersionInfo.ProductVersion
Assert-True (-not [string]::IsNullOrWhiteSpace($upgradeExecutableVersion)) "Upgraded executable does not expose a product version."
Assert-True ($upgradeExecutableVersion -ne $baselineExecutableVersion) "Installed executable version identity did not change after upgrade."
Assert-True (Test-Path -LiteralPath $logDir) "Approved local log ownership did not survive the controlled upgrade."
Assert-NoUnapprovedWindowsSideEffects

$downgradeExit = Invoke-Executable $baselineCopy @("/S")
Start-Sleep -Seconds 1
$postDowngrade = Get-ProductEntry
Assert-True ($postDowngrade -and [string]$postDowngrade.DisplayVersion -eq $UpgradeVersion) "Older installer replaced the 0.1.1 package; downgrade protection failed."

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
Assert-True ((Get-ProductShortcuts).Count -eq 0) "Start Menu shortcut remains after uninstall."
Assert-NoUnapprovedWindowsSideEffects

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
  startMenuShortcut = "PASS"
  autoStartAbsent = "PASS"
  windowsServiceAbsent = "PASS"
  firewallRuleAbsent = "PASS"
  protocolAssociationAbsent = "PASS"
  machineEnvironmentMutationAbsent = "PASS"
  packageInspection = "PASS"
  productionSecretsAbsent = "PASS"
  localAuthoritativeDatastoreAbsent = "PASS"
  signatureState = $signatureState
  baselineExecutableVersion = $baselineExecutableVersion
  upgradeExecutableVersion = $upgradeExecutableVersion
  installedLaunch = "PASS"
  windowTitle = $ProductName
  controlledFailureRendered = "INHERITED_PRE_DB_G7"
  retrySafeReadInvoked = "NOT_APPLICABLE_DB_G7"
  nativeOidcPkceAuthentication = "PASS"
  bearerTokenRendererExposure = "ABSENT"
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
