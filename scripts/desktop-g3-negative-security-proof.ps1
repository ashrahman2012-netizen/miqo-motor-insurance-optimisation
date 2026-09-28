$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root=(Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EvidenceRoot=Join-Path $Root "dist\desktop-g3-g3.8-input"
$Proof=Join-Path $Root "dist\desktop-g3-g3.8-proof"
$Runtime=Join-Path $Root "dist\desktop-g1\runtime"
$Exe=Join-Path $Root "apps\desktop-runtime\src-tauri\target\debug\miqo-desktop-runtime.exe"

Remove-Item $Proof -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Proof -ItemType Directory -Force | Out-Null

function Require-Condition([bool]$Condition,[string]$Message) {
    if(-not $Condition){throw "G3.8: $Message"}
}

function Find-Evidence([string]$Area,[string]$Name) {
    $base=Join-Path $EvidenceRoot $Area
    if(-not (Test-Path $base)){throw "G3.8 evidence area missing: $Area"}
    $match=Get-ChildItem $base -Recurse -File -Filter $Name |
        Select-Object -First 1
    if(-not $match){throw "G3.8 evidence missing: $Area / $Name"}
    return $match
}

function Read-Evidence([System.IO.FileInfo]$File) {
    return Get-Content $File.FullName -Raw | ConvertFrom-Json
}

$p33=Find-Evidence "g3.3" "g3.3-protected-runtime-proof.json"
$p34=Find-Evidence "g3.4-primary" "g3.4-key-lifecycle-primary.json"
$p34u=Find-Evidence "g3.4-primary" "g3.4-wrong-user-proof.json"
$p34m=Find-Evidence "g3.4-wrong-machine" "g3.4-wrong-machine-proof.json"
$p35=Find-Evidence "g3.5" "g3.5-certification.json"
$p35detail=Find-Evidence "g3.5" "g3.5-local-capability-proof.json"
$p36=Find-Evidence "g3.6" "g3.6-certification.json"
$p37=Find-Evidence "g3.7" "g3.7-certification.json"

$g33=Read-Evidence $p33
$g34=Read-Evidence $p34
$g34u=Read-Evidence $p34u
$g34m=Read-Evidence $p34m
$g35=Read-Evidence $p35
$g35detail=Read-Evidence $p35detail
$g36=Read-Evidence $p36
$g37=Read-Evidence $p37

# G3.3 â€” protected persistence / plaintext-negative evidence
Require-Condition ($g33.result -eq "PASS") "G3.3 is not PASS"
Require-Condition ($g33.backend -eq "pglite-protected") "G3.3 backend is not protected"
Require-Condition ($g33.persistentPlaintextPgdata -eq $false) "persistent plaintext PGDATA detected"
Require-Condition ($g33.plaintextMarkerPersistentScan -eq "PASS") "G3.3 plaintext scan failed"
Require-Condition ($g33.lockedMutationRejectedWithoutCheckpoint -eq "PASS") "locked mutation fail-closed proof missing"

# G3.4 â€” key lifecycle / corruption / context fail-closed evidence
Require-Condition ($g34.corruptKeyringFailClosed -eq "PASS") "corrupt keyring did not fail closed"
Require-Condition ($g34.missingKeyringFailClosed -eq "PASS") "missing keyring did not fail closed"
Require-Condition ($g34.protectedStorePlaintextScan -eq "PASS") "protected-store plaintext scan failed"
Require-Condition ($g34.reinstallSemantics -eq "PASS") "protected reinstall semantics failed"
Require-Condition ($g34.abortedRotationPreservesOldKey -eq "PASS") "aborted rotation recovery failed"
Require-Condition ($g34.rotationRecoveryAfterStoreSwitch -eq "PASS") "rotation recovery failed"
Require-Condition ($g34u.differentUserUserShare -eq "PASS_FAIL_CLOSED") "wrong-user proof failed"
Require-Condition ($g34m.machineContextCheck -eq "PASS_FAIL_CLOSED") "wrong-machine proof failed"

# G3.5 â€” explicit local authority / negative API evidence
Require-Condition ($g35.result -eq "PASS") "G3.5 is not PASS"
Require-Condition ($g35.perLaunchCapability -eq "PASS") "per-launch capability missing"
Require-Condition ($g35.legacyStaticAuthorityRejected -eq "PASS") "legacy static authority was not rejected"
Require-Condition ($g35.capabilityAbsentFromLogs -eq "PASS") "capability leaked to logs"
Require-Condition ($g35.capabilityAbsentFromEvidence -eq "PASS") "capability leaked to evidence"
Require-Condition ($g35.packagedStaticAdminSecret -eq "ABSENT") "packaged static admin secret detected"
Require-Condition ($g35.shutdownExpiry -eq "PASS") "capability did not expire at shutdown"

Require-Condition ($g35detail.apiNoSession -eq "PASS_401") "unauthorised API caller not rejected"
Require-Condition ($g35detail.apiWrongSession -eq "PASS_401") "wrong API capability not rejected"
Require-Condition ($g35detail.apiWrongOrigin -eq "PASS_403") "wrong API origin not rejected"
Require-Condition ($g35detail.customerApiNoSession -eq "PASS_401") "unauthorised customer API caller not rejected"
Require-Condition ($g35detail.customerApiWrongOrigin -eq "PASS_403") "wrong customer API origin not rejected"

# G3.6 â€” WebView / origin / listener negative evidence
Require-Condition ($g36.result -eq "PASS") "G3.6 is not PASS"
Require-Condition ($g36.tauriCsp -eq "EXPLICIT") "Tauri CSP is not explicit"
Require-Condition ($g36.productionWebCsp -eq "PASS") "production web CSP failed"
Require-Condition ($g36.unsafeEval -eq "ABSENT") "unsafe-eval remains in production"
Require-Condition ($g36.developmentWebSocketsInProduction -eq "ABSENT") "development WebSocket remains in production"
Require-Condition ($g36.navigationHost -eq "127.0.0.1_ONLY") "navigation host boundary weakened"
Require-Condition ($g36.devtools -eq "DISABLED") "devtools are enabled"
Require-Condition ($g36.listeners -eq "LOOPBACK_ONLY") "non-loopback listener detected"
Require-Condition ([int]$g36.unexpectedOutboundConnections -eq 0) "unexpected outbound packaged-service connection detected"
Require-Condition ($g36.unauthorisedAdminNavigation -eq "PASS_401") "unauthorised admin navigation not rejected"

# G3.7 â€” diagnostic leakage negative evidence
Require-Condition ($g37.result -eq "PASS") "G3.7 is not PASS"
Require-Condition ($g37.secretSentinelLeak -eq "ABSENT") "secret sentinel leaked"
Require-Condition ($g37.customerPayloadLeak -eq "ABSENT") "customer payload leaked"
Require-Condition ($g37.rawCredentialHeaders -eq "REDACTED") "credential headers not redacted"
Require-Condition ($g37.rawErrorObjects -eq "NOT_LOGGED") "raw error objects are logged"
Require-Condition ($g37.diagnosticModel -eq "METADATA_ORIENTED") "diagnostic model weakened"

# Current-head package/source downgrade guards
Require-Condition (Test-Path $Runtime) "packaged runtime missing"
Require-Condition (Test-Path $Exe) "native runtime executable missing"

$Forbidden=@(
    "DB-G10-SYNTHETIC-ADMIN",
    "G3_SECRET_SENTINEL_9F34C8D2",
    "G3_CUSTOMER_PAYLOAD_SENTINEL_6A71E4B9"
)

$TextExtensions=@(
    ".js",".cjs",".mjs",".json",".html",".css",".txt"
)

$PackageHits=@()

Get-ChildItem $Runtime -Recurse -File | ForEach-Object {
    if($TextExtensions -contains $_.Extension.ToLowerInvariant()){
        try{
            $text=[IO.File]::ReadAllText($_.FullName)
            foreach($marker in $Forbidden){
                if($text.Contains($marker)){
                    $PackageHits += [ordered]@{
                        path=$_.FullName.Substring($Root.Length).TrimStart("\")
                        marker=$marker
                    }
                }
            }
        }catch{
            # Non-text/encoding failures are not interpreted as evidence.
        }
    }
}

$ExeText=[Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($Exe))
foreach($marker in $Forbidden){
    if($ExeText.Contains($marker)){
        $PackageHits += [ordered]@{
            path="apps/desktop-runtime/src-tauri/target/debug/miqo-desktop-runtime.exe"
            marker=$marker
        }
    }
}

if($PackageHits.Count -gt 0){
    $PackageHits | ConvertTo-Json -Depth 5 |
        Set-Content (Join-Path $Proof "package-secret-hits.json")
    throw "G3.8 packaged secret/payload scan failed"
}

# Re-scan the encrypted G3.7 application-local representation.
$EncryptedStore=Get-ChildItem (Join-Path $EvidenceRoot "g3.7") -Recurse -File -Filter "protected-store-v1.enc" |
    Select-Object -First 1

Require-Condition ($null -ne $EncryptedStore) "G3.7 protected store missing"

$EncryptedAscii=[Text.Encoding]::ASCII.GetString(
    [IO.File]::ReadAllBytes($EncryptedStore.FullName)
)

foreach($marker in $Forbidden){
    Require-Condition (-not $EncryptedAscii.Contains($marker)) "plaintext sentinel found in protected persistent store"
}

# Static downgrade guards on the current exact source head.
$Tauri=Get-Content (Join-Path $Root "apps\desktop-runtime\src-tauri\tauri.conf.json") -Raw |
    ConvertFrom-Json
Require-Condition (-not [string]::IsNullOrWhiteSpace([string]$Tauri.app.security.csp)) "Tauri CSP is empty"

$MainSource=Get-Content (Join-Path $Root "apps\desktop-runtime\src-tauri\src\main.rs") -Raw
Require-Condition (-not $MainSource.Contains('Some("localhost")')) "localhost navigation alias restored"
Require-Condition ($MainSource.Contains('Some("127.0.0.1")')) "exact loopback navigation guard missing"
Require-Condition ($MainSource.Contains('.devtools(false)')) "devtools hardening removed"
Require-Condition (-not $MainSource.Contains("DB-G10-SYNTHETIC-ADMIN")) "legacy static authority restored to native source"

$EvidenceInventory=@(
    $p33,$p34,$p34u,$p34m,$p35,$p35detail,$p36,$p37
) | ForEach-Object {
    [ordered]@{
        file=$_.Name
        sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}

$EvidenceInventory | ConvertTo-Json -Depth 5 |
    Set-Content (Join-Path $Proof "input-evidence-sha256.json")

$Head=if($env:GITHUB_SHA){
    $env:GITHUB_SHA
}else{
    (& git rev-parse HEAD).Trim()
}

[ordered]@{
    gate="G3.8"
    result="PASS"
    proofClass="WINDOWS_NEGATIVE_SECURITY_AGGREGATE"
    evidenceHead=$Head
    protectedPersistencePlaintext="ABSENT"
    corruptKeyring="PASS_FAIL_CLOSED"
    missingKeyring="PASS_FAIL_CLOSED"
    wrongUser="PASS_FAIL_CLOSED"
    wrongMachine="PASS_FAIL_CLOSED"
    reinstallProtectedStore="PASS"
    legacyStaticAuthority="REJECTED"
    invalidCapability="REJECTED"
    wrongOrigin="REJECTED"
    packagedRuntimeSecretScan="PASS"
    persistentSentinelScan="PASS"
    webviewDowngradeGuards="PASS"
    diagnosticSecretLeak="ABSENT"
    diagnosticCustomerPayloadLeak="ABSENT"
    boundary="SYNTHETIC_ONLY"
} | ConvertTo-Json |
    Set-Content (Join-Path $Proof "g3.8-certification.json")

Write-Host "G3.8 WINDOWS NEGATIVE SECURITY PROOF: PASS"