$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Version = "22.23.3"
$Runtime = Join-Path $Root "dist\desktop-g1\runtime"
$Out = Join-Path $Runtime "node"
$Tmp = Join-Path $Root "dist\desktop-g2\node-download"
$Archive = "node-v$Version-win-x64.zip"
$Base = "https://nodejs.org/dist/v$Version"

Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Out -ItemType Directory -Force | Out-Null
New-Item $Tmp -ItemType Directory -Force | Out-Null

Invoke-WebRequest "$Base/SHASUMS256.txt" -OutFile (Join-Path $Tmp "SHASUMS256.txt")
Invoke-WebRequest "$Base/$Archive" -OutFile (Join-Path $Tmp $Archive)

$Line = Get-Content (Join-Path $Tmp "SHASUMS256.txt") | Where-Object { $_ -match [regex]::Escape($Archive) + '$' } | Select-Object -First 1
if (-not $Line) { throw "Node checksum entry missing for $Archive" }
$Expected = ($Line -split '\s+')[0].ToLowerInvariant()
$Actual = (Get-FileHash (Join-Path $Tmp $Archive) -Algorithm SHA256).Hash.ToLowerInvariant()
if ($Expected -ne $Actual) { throw "Node archive checksum mismatch" }

Expand-Archive (Join-Path $Tmp $Archive) -DestinationPath $Tmp -Force
$Extracted = Join-Path $Tmp "node-v$Version-win-x64"
Copy-Item (Join-Path $Extracted "node.exe") (Join-Path $Out "node.exe") -Force
Copy-Item (Join-Path $Extracted "LICENSE") (Join-Path $Out "LICENSE.node") -Force

$Detected = (& (Join-Path $Out "node.exe") --version).Trim()
if ($Detected -ne "v$Version") { throw "Staged Node version mismatch: $Detected" }

$Evidence = [ordered]@{
  version = $Version
  arch = "win-x64"
  archiveSha256 = $Actual
  nodeExeSha256 = (Get-FileHash (Join-Path $Out "node.exe") -Algorithm SHA256).Hash.ToLowerInvariant()
}
New-Item (Join-Path $Root "dist\desktop-g2") -ItemType Directory -Force | Out-Null
$Evidence | ConvertTo-Json | Set-Content (Join-Path $Root "dist\desktop-g2\node-stage.json") -Encoding utf8
Remove-Item $Tmp -Recurse -Force
Write-Host "Staged Node $Version for Windows x64"
