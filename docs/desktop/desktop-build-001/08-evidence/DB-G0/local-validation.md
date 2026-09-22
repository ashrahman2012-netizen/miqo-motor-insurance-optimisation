# DB-G0 local validation record

Control-establishment revision: `2e964af5559b9ba1cc339b1baea7c9f520e524b3`.
Date: 2026-09-22.

Executed from the BUILD worktree. The commands below are verification evidence, not a new repository test or application script.

## Documentation checks

```powershell
$ErrorActionPreference = 'Stop'
$docsRoot = 'docs/desktop/desktop-build-001'
$docFiles = @(Get-ChildItem $docsRoot -Recurse -File)
$brokenLinks = @()
foreach ($docFile in $docFiles | Where-Object Extension -eq '.md') {
  $docText = Get-Content -Raw -LiteralPath $docFile.FullName
  foreach ($linkMatch in [regex]::Matches($docText, '\]\(([^)]+)\)')) {
    $linkTarget = $linkMatch.Groups[1].Value
    if ($linkTarget -match '^(https?://|#)') { continue }
    $linkPath = Join-Path $docFile.DirectoryName ($linkTarget -split '#')[0]
    if (-not (Test-Path -LiteralPath $linkPath)) {
      $brokenLinks += "$($docFile.Name): $linkTarget"
    }
  }
}
if ($brokenLinks.Count) { throw ($brokenLinks -join "`n") }
$prepRiskIds = [regex]::Matches(
  (Get-Content -Raw 'docs/desktop/desktop-prep-001/00-control/risk-register.md'),
  'R-G\d+-\d+'
) | ForEach-Object Value | Sort-Object -Unique
$buildRiskText = Get-Content -Raw "$docsRoot/00-control/risk-register.md"
foreach ($riskId in $prepRiskIds) {
  if (-not $buildRiskText.Contains($riskId)) { throw "Missing risk $riskId" }
}
$invariantText = Get-Content -Raw "$docsRoot/00-control/baseline-and-invariants.md"
foreach ($invariantNumber in 1..15) {
  if (-not $invariantText.Contains(('INV-D-{0:00}' -f $invariantNumber))) {
    throw 'Missing BUILD invariant'
  }
}
foreach ($invariantNumber in 1..10) {
  if (-not $invariantText.Contains(('UX-D-{0:00}' -f $invariantNumber))) {
    throw 'Missing UX invariant'
  }
}
```

Observed: 22 initial files; zero broken relative links; all 47 inherited PREP risk IDs; all 15 INV-D and 10 UX-D IDs. Expected tree inspected against handover §14. Twelve gateway rows exist; only DB-G0 was IN PROGRESS in the establishment commit. Other gateways remain NOT STARTED.

## Existing repository checks

```powershell
node scripts/verify-dependency-pins.mjs
$env:MIQO_DATA_CLASSIFICATION = 'SYNTHETIC'
$env:MIQO_LIVE_PROVIDERS_ENABLED = 'false'
node scripts/verify-prototype-boundary.mjs
git add -- docs/desktop/desktop-build-001
git diff --cached --check
$changedPaths = @(git diff --cached --name-only)
if (@($changedPaths | Where-Object {
  -not $_.StartsWith('docs/desktop/desktop-build-001/')
}).Count) { throw 'Out-of-scope staged change' }
git diff --cached --stat
git commit -m 'DESKTOP BUILD DB-G0: establish frozen programme controls'
git rev-parse HEAD
git diff --name-status f01776e9bb98bb47a0693f43194d1d48b03b6d5e HEAD
git diff --exit-code f01776e9bb98bb47a0693f43194d1d48b03b6d5e HEAD -- . ':!docs/desktop/desktop-build-001/**'
git diff --check f01776e9bb98bb47a0693f43194d1d48b03b6d5e HEAD
git rev-parse 'HEAD^'
git status --porcelain
```

Observed: dependency pins PASS; prototype boundary PASS; whitespace PASS; 22 added text files only, 582 insertions; outside-scope diff empty/exit 0; parent exactly G9; worktree clean. Git emitted normal LF/CRLF conversion notices, not validation failures.

Local runtime: Node v24.19.0/npm 11.17.0. These dependency-free checks do not claim a certified build. Full repository regression uses unchanged GitHub CI with Node 22.16.0/npm 10.9.2. No full Desktop package/install proof is required for the DB-G0-only documentation delta.

## Remote branch and review

The GitHub branch was separately created at exact G9 before push; GET git/ref/heads/miqos/desktop-build-001 returned `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`. Push fast-forwarded it to the control-establishment commit:

```powershell
$env:GIT_EXEC_PATH = 'C:/Users/ashra/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/mingw64/bin'
git push -u origin miqos/desktop-build-001
```

[Draft PR #6](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/pull/6) uses base `miqos/desktop-prep-001` at G9. No merge/release is performed.

Source/API queries used the GitHub connector: GET git/ref/heads/miqos/desktop-prep-001; GET git/matching-refs/heads/miqos/desktop-build-001 before creation; GET actions/runs/{id} and jobs for the five closeout runs; GET actions/runs?head_sha={control SHA}. Exact source-run/job identities are in source-workflows.json.
