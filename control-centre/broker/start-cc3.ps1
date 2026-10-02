[CmdletBinding()]
param(
    [int]$Port = 4300,
    [switch]$EnableWrites
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedNode = "v22.23.3"
$PortableNode = Join-Path $env:LOCALAPPDATA "MIQOS\toolchains\node-v22.23.3-win-x64"
$NodeExe = Join-Path $PortableNode "node.exe"
$NpmCmd = Join-Path $PortableNode "npm.cmd"

if (-not (Test-Path -LiteralPath $NodeExe)) {
    throw "STOP: certified portable Node is missing: $NodeExe"
}

if (-not (Test-Path -LiteralPath $NpmCmd)) {
    throw "STOP: certified portable npm launcher is missing: $NpmCmd"
}

$env:Path = "$PortableNode;$env:Path"

$NodeVersion = (& $NodeExe --version).Trim()
if ($NodeVersion -ne $ExpectedNode) {
    throw "STOP: CC-3 requires Node $ExpectedNode; found $NodeVersion."
}

$RepoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $RepoRoot) {
    throw "STOP: run this script from the MIQOS CC-3 control-centre worktree."
}

$Branch = (& git branch --show-current).Trim()
if ($Branch -ne "miqo/control-centre-cc3") {
    throw "STOP: expected miqo/control-centre-cc3; current branch is '$Branch'."
}

$Dirty = (& git status --porcelain)
if ($Dirty) {
    throw "STOP: CC-3 worktree must be clean before broker startup."
}

$Existing = @(
    Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
)
if ($Existing.Count -gt 0) {
    throw "STOP: port $Port already has a listener."
}

$env:MIQOS_BROKER_PORT = [string]$Port
$env:MIQO_DATA_CLASSIFICATION = "SYNTHETIC"
$env:MIQO_LIVE_PROVIDERS_ENABLED = "false"

if ($EnableWrites) {
    $HasWriteIdentity = (
        -not [string]::IsNullOrWhiteSpace($env:MIQOS_GITHUB_APP_INSTALLATION_TOKEN) -or
        -not [string]::IsNullOrWhiteSpace($env:MIQOS_GITHUB_WRITE_TOKEN)
    )
    if (-not $HasWriteIdentity) {
        throw "STOP: -EnableWrites requires a dedicated CC-3 write identity in MIQOS_GITHUB_APP_INSTALLATION_TOKEN or MIQOS_GITHUB_WRITE_TOKEN. gh-cli authentication is read-only for CC-3."
    }
    $env:MIQOS_CC3_WRITES_ENABLED = "1"
}
else {
    $env:MIQOS_CC3_WRITES_ENABLED = "0"
}

Write-Host ""
Write-Host "MIQOS CC-3 STARTUP GUARD: PASS" -ForegroundColor Green
Write-Host "Repository : $RepoRoot"
Write-Host "Branch     : $Branch"
Write-Host "Node       : $NodeVersion"
Write-Host "Broker URL : http://127.0.0.1:$Port"
Write-Host "Read auth  : gh-cli / configured read token"
Write-Host ("Writes     : " + $(if ($EnableWrites) { "GUARDED / ALLOW-LISTED" } else { "LOCKED" }))
Write-Host ""

& $NpmCmd run control-centre:broker
