# DB-G0 — Entry and validation evidence

Programme: MIQOS-DESKTOP-BUILD-001
Gateway: DB-G0 — BUILD Entry & Branch Freeze
Status: IN PROGRESS; control-establishment commit and CI pending.
Date: 2026-09-22

## Entry and provenance

Required entry branch: `miqos/desktop-prep-001`.
Verified GitHub ref: `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`.
Predecessor: PREP G9 PASS.

The pre-existing local PREP worktree was clean on `desktop-prep-fix` at `ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0`. It was not used as the BUILD source and was not changed.
Git fetch obtained the exact remote G9 commit. The BUILD target was absent locally and the GitHub matching-ref response was empty before creation.

Created `miqos/desktop-build-001` in sibling worktree `miqos-desktop-build`, directly from G9.
Before writing BUILD records:

- HEAD: `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`.
- HEAD and G9 tree: `1cdd107f7cfbf30e125ff82ee44eb54973df6cc2`.
- Left/right comparison: `0 0`.
- Diff: empty, exit 0.
- Working tree status: empty.

## Commands executed for entry

From the existing PREP worktree, except where indicated:

```powershell
git status --short --branch
git rev-parse HEAD
git branch --list 'miqos/desktop-build-001'
git worktree list
git cat-file -t f01776e9bb98bb47a0693f43194d1d48b03b6d5e
git --exec-path
$env:GIT_EXEC_PATH = 'C:/Users/ashra/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/mingw64/bin'
git ls-remote --heads origin miqos/desktop-prep-001 miqos/desktop-build-001
git fetch origin miqos/desktop-prep-001
git rev-parse FETCH_HEAD
git worktree add -b miqos/desktop-build-001 '../miqos-desktop-build' f01776e9bb98bb47a0693f43194d1d48b03b6d5e
# From the new BUILD worktree:
git status --porcelain
git rev-parse HEAD 'HEAD^{tree}' 'f01776e9bb98bb47a0693f43194d1d48b03b6d5e^{tree}'
git rev-list --left-right --count f01776e9bb98bb47a0693f43194d1d48b03b6d5e...HEAD
git diff --exit-code f01776e9bb98bb47a0693f43194d1d48b03b6d5e HEAD
Get-FileHash -LiteralPath '../MIQOS-Desktop-App-Plan/MIQOS-DESKTOP-BUILD-001-CODEX-HANDOVER-v1.0.md','../MIQOS - UX Demo/MIQOS-Desktop-App-UX-Demo.zip' -Algorithm SHA256
node --version
npm --version
```

Initial cat-file failed because G9 was not yet local. Initial remote commands failed because of the bundled helper path and sandbox network; process-local helper selection and an authorised escalated fetch resolved local acquisition. No failed command is counted as verification success. GitHub connector GETs independently verified the source ref, target absence and all five source runs.

File discovery/reading used Get-Content, Get-ChildItem and rg; ZIP entry enumeration used System.IO.Compression.ZipFile. No AGENTS.md was found in the workspace file search. Handover and archive hashes are recorded in [baseline](../../00-control/baseline-and-invariants.md).

## Source workflow evidence

Read on 2026-09-22 via GitHub API run and job endpoints. Every run reports the exact G9 head SHA, completed/success. PR head association is not a claim that its checkout used the branch head instead of GitHub's synthetic merge revision.

| Workflow | Event | Run | Jobs (all success) |
|---|---|---|---|
| ci #664 | push | [35743295434](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/actions/runs/35743295434) | target-stack-sprint1 106798314006; postgres-contract 106798314409; locked-dependencies 106798314556 |
| ci #665 | pull_request | [35743301744](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/actions/runs/35743301744) | postgres-contract 106798335314; locked-dependencies 106798335455; target-stack-sprint1 106798335632 |
| desktop-prep-g7 #211 | push | [35743295402](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/actions/runs/35743295402) | Windows Desktop preflight/full 106798314613 |
| desktop-prep-g7 #212 | pull_request | [35743301257](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/actions/runs/35743301257) | Windows Desktop preflight/full 106798334824 |
| desktop-prep-g8 #32 | pull_request | [35743301349](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/actions/runs/35743301349) | Desktop service / certified API integration 106798334600; Windows installed Desktop skeleton proof 106798334714 |

The source PREP package/installed proof remains inherited; DB-G0 creates no installer or new Desktop proof artefact. The PREP closeout retains exact certified evidence-head artefact IDs/digests. A compact machine-readable source-run snapshot is supplied in [source-workflows.json](source-workflows.json).

## Validation scope and boundary review

Documentation-only delta under `docs/desktop/desktop-build-001/**`. Local checks cover whitespace, relative links, expected control records, all inherited risk IDs, invariant IDs, frozen references and zero changes outside scope. Existing dependency-pin and SYNTHETIC boundary scripts are also run. Local Node 24.19.0/npm 11.17.0 are not the certified build runtime; no local Desktop/package certification is claimed. Repository CI retains Node 22.16.0/npm 10.9.2.

Domain semantics changed: no.
Database access introduced: no.
Admin mutation introduced: no.
Environment boundary changed: no.
Security boundary changed: no.
UX authority conflict: no authority imported; reference identity only, visual interpretation pending DB-G1.

## Risks and continuation

Missing handover and local source acquisition conditions are resolved. All PREP risks and downstream dependencies remain visible in the BUILD registers; no architecture, security or integrity exception is accepted.

Only DB-G0 is authorised now. DB-G1 remains NOT STARTED pending a separate execution block. The next evidence record will identify the exact control-establishment revision, changed-file inventory and validation results before declaring DB-G0 PASS.
