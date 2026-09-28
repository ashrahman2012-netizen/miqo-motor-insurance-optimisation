$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($env:GITHUB_ACTIONS -ne "true") {
    throw "G3.9 installer regression proof is CI-only."
}

$Root=(Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Proof=Join-Path $Root "dist\desktop-g3-g3.9-proof"
$BundleDir=Join-Path $Root "apps\desktop-runtime\src-tauri\target\release\bundle\nsis"
$Installer=Get-ChildItem $BundleDir -Filter "*-setup.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if(-not $Installer){throw "G3.9 NSIS installer not found"}

Remove-Item $Proof -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Proof -ItemType Directory -Force | Out-Null

$ExpectedDataRoot=Join-Path $env:LOCALAPPDATA "com.miqo.desktop.synthetic"
$ExpectedDataDir=Join-Path $ExpectedDataRoot "pglite"

Remove-Item $ExpectedDataRoot -Recurse -Force -ErrorAction SilentlyContinue

function Require([bool]$Condition,[string]$Message){
    if(-not $Condition){throw "G3.9: $Message"}
}

function Get-MiqoInstallRecord {
    $subkeyPath="Software\Microsoft\Windows\CurrentVersion\Uninstall"

    foreach($view in @(
        [Microsoft.Win32.RegistryView]::Registry64,
        [Microsoft.Win32.RegistryView]::Registry32
    )){
        $base=[Microsoft.Win32.RegistryKey]::OpenBaseKey(
            [Microsoft.Win32.RegistryHive]::CurrentUser,
            $view
        )

        try{
            $uninstall=$base.OpenSubKey($subkeyPath)
            if(-not $uninstall){continue}

            try{
                foreach($name in $uninstall.GetSubKeyNames()){
                    $key=$uninstall.OpenSubKey($name)
                    if(-not $key){continue}

                    try{
                        if([string]$key.GetValue("DisplayName") -eq "MIQO Desktop [SYNTHETIC]"){
                            return [pscustomobject]@{
                                DisplayName=[string]$key.GetValue("DisplayName")
                                InstallLocation=[string]$key.GetValue("InstallLocation")
                                UninstallString=[string]$key.GetValue("UninstallString")
                            }
                        }
                    }
                    finally{
                        $key.Dispose()
                    }
                }
            }
            finally{
                $uninstall.Dispose()
            }
        }
        finally{
            $base.Dispose()
        }
    }

    throw "MIQO installer record not found"
}

function Resolve-Uninstaller([object]$Record){
    $raw=[Environment]::ExpandEnvironmentVariables([string]$Record.UninstallString)

    if($raw.StartsWith('"')){
        $end=$raw.IndexOf('"',1)
        if($end -lt 2){throw "Malformed uninstall string"}
        return $raw.Substring(1,$end-1)
    }

    return ($raw -split '\s+')[0]
}

function Resolve-InstallDir([object]$Record){
    if($Record.InstallLocation -and (Test-Path -LiteralPath $Record.InstallLocation)){
        return (Resolve-Path -LiteralPath $Record.InstallLocation).Path
    }

    return Split-Path (Resolve-Uninstaller $Record) -Parent
}

function Install-Miqo {
    $p=Start-Process -FilePath $Installer.FullName -ArgumentList "/S" -Wait -PassThru
    Require ($p.ExitCode -eq 0) "installer failed"

    $record=Get-MiqoInstallRecord
    $dir=Resolve-InstallDir $record

    $allExes=@(Get-ChildItem -LiteralPath $dir -Filter "*.exe" -Recurse -File)
    $helpers=@("node.exe","uninstall.exe","uninst.exe","microsoftedgewebview2setup.exe")

    $candidates=@($allExes | Where-Object {
        $lower=$_.Name.ToLowerInvariant()
        ($helpers -notcontains $lower) -and
        (-not $lower.StartsWith("unins")) -and
        (-not $lower.Contains("webview2"))
    })

    $exe=$candidates |
        Where-Object { $_.Name -eq "MIQO Desktop [SYNTHETIC].exe" } |
        Select-Object -First 1

    if(-not $exe){
        $exe=$candidates |
            Where-Object { $_.Name -eq "miqo-desktop-runtime.exe" } |
            Select-Object -First 1
    }

    Require ($null -ne $exe) "installed executable not found"

    return [pscustomobject]@{
        Record=$record
        Dir=$dir
        Exe=$exe.FullName
    }
}

function Uninstall-Miqo([object]$Install){
    $uninstaller=Resolve-Uninstaller $Install.Record
    Require (Test-Path -LiteralPath $uninstaller) "uninstaller missing"

    $p=Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait -PassThru
    Require ($p.ExitCode -eq 0) "uninstaller failed"

    for($i=0;$i -lt 60 -and (Test-Path -LiteralPath $Install.Exe);$i++){
        Start-Sleep -Milliseconds 500
    }

    Require (-not (Test-Path -LiteralPath $Install.Exe)) "installed executable remains after uninstall"
}

$Poison=Join-Path $Proof "poison-bin"
$PoisonLog=Join-Path $Proof "poison-used.log"

New-Item $Poison -ItemType Directory -Force | Out-Null

foreach($name in @("node","npm","npx","docker","psql","postgres","pg_ctl")){
@"
@echo off
echo $name %*>>"$PoisonLog"
exit /b 97
"@ | Set-Content (Join-Path $Poison "$name.cmd") -Encoding ascii
}

$OriginalPath=$env:Path
$script:RuntimeProcess=$null

function Assert-CapabilityProof([string]$Path){
    Require (Test-Path $Path) "owned-session proof missing"

    $p=Get-Content $Path -Raw | ConvertFrom-Json

    Require ($p.result -eq "PASS") "owned-session proof failed"
    Require ($p.authority -eq "PER_LAUNCH_LOCAL_CAPABILITY") "wrong runtime authority"
    Require ($p.staticPackagedAdminSecret -eq $false) "static authority present"
    Require ($p.scope -eq "ALL_NON_HEALTH_LOOPBACK_API_REQUESTS") "capability scope weakened"
    Require ($p.adminUiNoSession -eq "PASS_401") "admin unauthorised request not rejected"
    Require ($p.adminUiOwnedSession -eq "PASS_200") "owned admin session failed"
    Require ($p.apiNoSession -eq "PASS_401") "API unauthorised request not rejected"
    Require ($p.apiWrongSession -eq "PASS_401") "wrong API capability accepted"
    Require ($p.apiWrongOrigin -eq "PASS_403") "wrong API origin accepted"
    Require ($p.apiOwnedSession -eq "PASS_200") "owned API session failed"
    Require ($p.customerApiNoSession -eq "PASS_401") "customer unauthorised request not rejected"
    Require ($p.customerApiWrongOrigin -eq "PASS_403") "customer wrong origin accepted"
    Require ($p.customerApiOwnedSession -eq "PASS_200") "owned customer session failed"
}

function Start-Miqo([string]$Label,[string]$Exe){
    $ready=Join-Path $Proof "$Label-ready.txt"
    $stop=Join-Path $Proof "$Label-stop.request"
    $shutdown=Join-Path $Proof "$Label-shutdown.json"
    $dataProof=Join-Path $Proof "$Label-data-dir.txt"
    $capProof=Join-Path $Proof "$Label-capability.json"
    $stdout=Join-Path $Proof "$Label-stdout.log"
    $stderr=Join-Path $Proof "$Label-stderr.log"

    Remove-Item $ready,$stop,$shutdown,$dataProof,$capProof,$stdout,$stderr `
        -Force -ErrorAction SilentlyContinue

    $env:MIQO_DESKTOP_READY_FILE=$ready
    $env:MIQO_DESKTOP_STOP_FILE=$stop
    $env:MIQO_DESKTOP_SHUTDOWN_FILE=$shutdown
    $env:MIQO_DESKTOP_DATA_DIR_PROOF_FILE=$dataProof
    $env:MIQO_DESKTOP_G3_5_PROOF_FILE=$capProof
    $env:MIQO_DATA_CLASSIFICATION="SYNTHETIC"
    $env:MIQO_LIVE_PROVIDERS_ENABLED="false"

    Remove-Item Env:MIQO_LOCAL_RUNTIME_CAPABILITY -ErrorAction SilentlyContinue
    Remove-Item Env:MIQO_SYNTHETIC_ADMIN_GATE -ErrorAction SilentlyContinue
    Remove-Item Env:MIQO_SYNTHETIC_ADMIN_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_GATE -ErrorAction SilentlyContinue
    Remove-Item Env:NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_KEY -ErrorAction SilentlyContinue

    $env:Path="$Poison;$env:SystemRoot\System32;$env:SystemRoot"

    $script:RuntimeProcess=Start-Process `
        -FilePath $Exe `
        -PassThru `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr

    $env:Path=$OriginalPath

    for($i=0;$i -lt 240;$i++){
        if((Test-Path $ready) -and (Test-Path $capProof)){break}

        if($script:RuntimeProcess.HasExited){
            Get-Content $stderr -ErrorAction SilentlyContinue
            throw "G3.9 installed runtime exited before readiness: $Label"
        }

        Start-Sleep -Seconds 1
    }

    Require (Test-Path $ready) "installed runtime readiness timeout: $Label"
    Require (Test-Path $dataProof) "data-directory proof missing: $Label"

    $actualData=(Get-Content $dataProof -Raw).Trim()
    Require ($actualData -eq $ExpectedDataDir) "unexpected application data directory"

    $health=Invoke-RestMethod "http://127.0.0.1:4000/health"

    Require ($health.dataClassification -eq "SYNTHETIC") "data classification changed"
    Require ($health.liveProvidersEnabled -eq $false) "live providers enabled"
    Require ($health.databaseBackend -eq "pglite-protected") "protected backend not active"

    Assert-CapabilityProof $capProof

    $listeners=@(
        Get-NetTCPConnection -State Listen |
        Where-Object { $_.LocalPort -in 3000,3001,4000 }
    )

    foreach($port in 3000,3001,4000){
        $onPort=@($listeners | Where-Object { $_.LocalPort -eq $port })
        Require ($onPort.Count -eq 1) "expected exactly one listener on port $port"
        Require ($onPort[0].LocalAddress -eq "127.0.0.1") "non-loopback listener on port $port"
    }

    $installDir=Split-Path $Exe -Parent

    $nodes=@(
        Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
        Where-Object {
            $_.ExecutablePath -and
            $_.ExecutablePath.StartsWith(
                $installDir,
                [System.StringComparison]::OrdinalIgnoreCase
            )
        }
    )

    Require ($nodes.Count -ge 3) "packaged Node service inventory incomplete"

    foreach($node in $nodes){
        $external=@(
            Get-NetTCPConnection `
                -OwningProcess $node.ProcessId `
                -State Established `
                -ErrorAction SilentlyContinue |
            Where-Object { $_.RemoteAddress -notin @("127.0.0.1","::1") }
        )

        Require ($external.Count -eq 0) "unexpected packaged-service outbound connection"
    }

    Require (-not (Test-Path $PoisonLog)) "host development dependency invoked"

    return [pscustomobject]@{
        Stop=$stop
        Shutdown=$shutdown
        Capability=$capProof
    }
}

function Stop-Miqo([object]$Markers){
    "stop" | Set-Content $Markers.Stop

    try{
        Wait-Process -Id $script:RuntimeProcess.Id -Timeout 90 -ErrorAction Stop
    }
    catch{
        Stop-Process -Id $script:RuntimeProcess.Id -Force -ErrorAction SilentlyContinue
        throw "G3.9 installed runtime did not shut down cleanly"
    }

    Require (Test-Path $Markers.Shutdown) "shutdown evidence missing"

    $shutdown=Get-Content $Markers.Shutdown -Raw | ConvertFrom-Json

    Require ($shutdown.clean -eq $true) "shutdown was not clean"
    Require ($shutdown.databaseBackend -eq "pglite-protected") "shutdown backend mismatch"

    foreach($port in 3000,3001,4000){
        Require (
            -not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
        ) "listener remains after shutdown on port $port"
    }

    $script:RuntimeProcess=$null
}

function Assert-ProtectedData {
    $store=Join-Path $ExpectedDataDir "protected-store-v1.enc"
    $keyring=Join-Path $ExpectedDataDir "security\keyring-v1.json"

    Require (Test-Path $store) "protected store missing"
    Require (Test-Path $keyring) "protected keyring missing"

    $plainIndicators=@(
        Get-ChildItem $ExpectedDataDir -Recurse -Force -ErrorAction Stop |
        Where-Object {
            $_.Name -in @(
                "PG_VERSION",
                "pg_wal",
                "pg_xact",
                "pg_multixact",
                "pg_tblspc"
            ) -or
            ($_.PSIsContainer -and $_.Name -in @("base","global"))
        }
    )

    Require ($plainIndicators.Count -eq 0) "plaintext PostgreSQL representation detected"

    return (Get-FileHash $keyring -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-NoLegacyStaticAuthority([string]$InstallDir,[string]$Exe){
    $marker="DB-G10-SYNTHETIC-ADMIN"

    foreach($file in Get-ChildItem $InstallDir -Recurse -File){
        if($file.Extension.ToLowerInvariant() -in @(
            ".js",".cjs",".mjs",".json",".html",".css",".txt"
        )){
            try{
                $text=[IO.File]::ReadAllText($file.FullName)
                Require (-not $text.Contains($marker)) "legacy static authority in installed package"
            }
            catch [System.IO.IOException] {}
        }
    }

    $exeText=[Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($Exe))
    Require (-not $exeText.Contains($marker)) "legacy static authority in installed executable"
}

try{
    $config=Get-Content `
        (Join-Path $Root "apps\desktop-runtime\src-tauri\tauri.windows-g2.conf.json") `
        -Raw | ConvertFrom-Json

    Require ($config.bundle.windows.nsis.installMode -eq "currentUser") "installer mode changed"
    Require ($config.bundle.windows.webviewInstallMode.type -eq "embedBootstrapper") "WebView2 packaging changed"

    $installerSignature=(Get-AuthenticodeSignature $Installer.FullName).Status.ToString()
    Require ($installerSignature -eq "NotSigned") "G3 does not authorise code signing"

    $install=Install-Miqo

    $appSignature=(Get-AuthenticodeSignature $install.Exe).Status.ToString()
    Require ($appSignature -eq "NotSigned") "installed executable unexpectedly signed"

    $packagedNode=Get-ChildItem $install.Dir -Filter "node.exe" -Recurse |
        Where-Object { $_.FullName -match "[\\/]runtime[\\/]node[\\/]node\.exe$" } |
        Select-Object -First 1

    Require ($null -ne $packagedNode) "packaged Node missing"
    Require ((& $packagedNode.FullName --version).Trim() -eq "v22.23.3") "packaged Node version mismatch"

    $manifest=Get-ChildItem $install.Dir -Filter "runtime-manifest.json" -Recurse |
        Select-Object -First 1

    Require ($null -ne $manifest) "runtime manifest missing"

    Assert-NoLegacyStaticAuthority $install.Dir $install.Exe

    $first=Start-Miqo "first-run" $install.Exe
    Stop-Miqo $first

    $keyringHash1=Assert-ProtectedData

    $restart=Start-Miqo "restart" $install.Exe
    Stop-Miqo $restart

    $keyringHash2=Assert-ProtectedData
    Require ($keyringHash2 -eq $keyringHash1) "keyring changed during ordinary restart"

    $hashInventory=@(
        @{name="installer";path=$Installer.FullName},
        @{name="installedExecutable";path=$install.Exe},
        @{name="packagedNode";path=$packagedNode.FullName},
        @{name="runtimeManifest";path=$manifest.FullName}
    ) | ForEach-Object {
        $item=Get-Item $_.path
        [ordered]@{
            name=$_.name
            bytes=$item.Length
            sha256=(Get-FileHash $_.path -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }

    $hashInventory |
        ConvertTo-Json -Depth 5 |
        Set-Content (Join-Path $Proof "sha256-inventory.json")

    Uninstall-Miqo $install

    Require (Test-Path $ExpectedDataDir) "uninstall deleted protected application data"

    $reinstall=Install-Miqo

    Assert-NoLegacyStaticAuthority $reinstall.Dir $reinstall.Exe

    $afterReinstall=Start-Miqo "reinstall" $reinstall.Exe
    Stop-Miqo $afterReinstall

    $keyringHash3=Assert-ProtectedData
    Require ($keyringHash3 -eq $keyringHash1) "reinstall did not preserve protected keyring"

    Uninstall-Miqo $reinstall

    Require (Test-Path $ExpectedDataDir) "final uninstall deleted protected application data"
    Require (-not (Test-Path $PoisonLog)) "host development dependency invoked"

    $head=if($env:GITHUB_SHA){$env:GITHUB_SHA}else{(& git rev-parse HEAD).Trim()}

    [ordered]@{
        gate="G3.9"
        result="PASS"
        evidenceHead=$head
        regression="G2_INSTALLER_RUNTIME_OUTCOMES_ON_G3_SECURITY_ARCHITECTURE"
        platform="windows-x64"
        installer="NSIS"
        installMode="currentUser"
        signing="NOT_AUTHORISED"
        packagedNodeVersion="22.23.3"
        databaseBackend="PGLITE_PROTECTED"
        protectedStore="PASS"
        ownedSessionAuthority="PASS"
        legacyStaticAuthority="ABSENT"
        loopbackListeners="PASS"
        unexpectedOutboundConnections=0
        restartProtectedStore="PASS"
        uninstallDataPolicy="PRESERVE"
        reinstallProtectedStore="PASS"
        keyringRetainedAcrossRestart="PASS"
        keyringRetainedAcrossReinstall="PASS"
        hostNodeRequired=$false
        hostNpmRequired=$false
        dockerRequired=$false
        externalPostgresRequired=$false
        inheritedRepositoryCi="REQUIRED_SEPARATELY"
        boundary="SYNTHETIC_ONLY"
    } |
    ConvertTo-Json |
    Set-Content (Join-Path $Proof "g3.9-installer-regression.json")

    Write-Host "G3.9 CURRENT-HEAD INSTALLER/RUNTIME REGRESSION: PASS"
}
finally{
    $env:Path=$OriginalPath

    if($script:RuntimeProcess -and -not $script:RuntimeProcess.HasExited){
        Stop-Process -Id $script:RuntimeProcess.Id -Force -ErrorAction SilentlyContinue
    }
}