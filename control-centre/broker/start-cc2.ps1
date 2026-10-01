[CmdletBinding()]
param(
    [int]$Port = 4300
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedNode = "v22.23.3"
$PortableNode = Join-Path $env:LOCALAPPDATA "MIQOS\toolchains\node-v22.23.3-win-x64"

if (Test-Path -LiteralPath (Join-Path $PortableNode "node.exe")) {
    $env:Path = "$PortableNode;$env:Path"
}

$NodeVersion = (& node --version).Trim()
if ($NodeVersion -ne $ExpectedNode) {
    throw "STOP: CC-2 requires Node $ExpectedNode; found $NodeVersion."
}

$RepoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $RepoRoot) {
    throw "STOP: run this script from the MIQOS control-centre worktree."
}

$Branch = (& git branch --show-current).Trim()
if ($Branch -ne "miqo/control-centre-v1") {
    throw "STOP: expected miqo/control-centre-v1; current branch is '$Branch'."
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

Write-Host ""
Write-Host "MIQOS CC-2 STARTUP GUARD: PASS" -ForegroundColor Green
Write-Host "Repository : $RepoRoot"
Write-Host "Branch     : $Branch"
Write-Host "Node       : $NodeVersion"
Write-Host "Broker URL : http://127.0.0.1:$Port"
Write-Host "GitHub     : READ-ONLY"
Write-Host "Mutations  : DISABLED"
Write-Host ""

npm run control-centre:broker
