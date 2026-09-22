# DB-G0 acceptance — BUILD entry and branch freeze

Programme: MIQOS-DESKTOP-BUILD-001
Gateway: DB-G0
Result: PASS
Date: 2026-09-22

## Entry

- Source branch: `miqos/desktop-prep-001`.
- Exact entry/G9 closeout SHA: `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`.
- Expected predecessor: PREP G9 PASS; all five closeout runs independently verified successful.
- Created branch: `miqos/desktop-build-001`, directly at G9 locally and remotely.
- Initial tree: `1cdd107f7cfbf30e125ff82ee44eb54973df6cc2`; comparison 0 ahead / 0 behind; empty diff; clean worktree.

## Exact revision being accepted

Control-establishment commit: `2e964af5559b9ba1cc339b1baea7c9f520e524b3`.
Its only parent is the G9 source. It introduced 22 documentation/control files and no executable delta.

This acceptance and the final status updates are a separate documentation/evidence commit descended from that validated commit. Its exact SHA is reported in the final execution report and is reproducibly obtained with:

```powershell
git log -1 --format=%H -- docs/desktop/desktop-build-001/08-evidence/DB-G0/acceptance.md
```

The inherited executable source remains `d8eb075b894ead75b00f7a501a2acde032d7a6c3`; certified PREP evidence head remains `ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0`. Neither DB-G0 documentation commit is misrepresented as a new Desktop executable proof.

## Verification

| Check | Result |
|---|---|
| Required source branch/ref and all five closeout CI/G7/G8 runs | PASS; exact G9 SHA |
| BUILD absence before creation and zero-delta provenance | PASS |
| Controls, baselines, carry-forward dependencies and capability inventory | PASS |
| UX archive identity | PASS; seven PNGs, matching SHA-256 |
| Local relative Markdown links | PASS |
| All inherited PREP risks | PASS; 47 original IDs retained |
| Handover invariants | PASS; 15 BUILD + 10 UX |
| Existing dependency-pin check | PASS |
| Existing SYNTHETIC/liveProviders=false boundary check | PASS |
| Whitespace and exact changed-path boundary | PASS |
| Changes outside docs/desktop/desktop-build-001/** | NONE |
| Repository CI on control-establishment revision | PASS, push and PR |

### GitHub CI for control establishment

- [ci #668, pull_request, run 35755994162](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/actions/runs/35755994162): SUCCESS. Jobs: locked-dependencies `106841787524` SUCCESS; target-stack-sprint1 `106841787593` SUCCESS; postgres-contract `106841787639` SUCCESS.
- [ci #667, push, run 35755967218](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/actions/runs/35755967218): SUCCESS. Jobs: target-stack-sprint1 `106841690251` SUCCESS; locked-dependencies `106841690697` SUCCESS; postgres-contract `106841690746` SUCCESS.

PR #6 source is `2e964af5559b9ba1cc339b1baea7c9f520e524b3`, base G9, and its observed synthetic merge revision is `88ec21ccc398c91e5c81a3c0a990256b6cd52c8d`. The push run directly validates the branch revision; PR-run head association and merge provenance are recorded separately.

The unchanged repository CI covers locked dependency restore/pins, synthetic boundary, domain/persisted/service suites, adapters/UI, application certification/builds, PostgreSQL contracts and target API/browser tests. Local runtime checks are limited as recorded in [local validation](local-validation.md).

Desktop G7/G8 did not trigger for this BUILD-docs-only delta under their unchanged branch/path filters. No workflow was disabled or modified. No DB-G0 package or installed-proof artefact is produced or claimed. Inherited exact-source G7/G8 evidence is recorded in [source workflow snapshot](source-workflows.json); BUILD CI jobs are recorded in [BUILD workflow snapshot](build-workflows.json).

## Exact changed-file inventory

All paths below are relative to `docs/desktop/desktop-build-001/`. All are added relative to G9; there are no modified/deleted pre-existing files. The establishment commit added 22 files; this evidence commit adds local validation, acceptance and BUILD workflow snapshot (25 total), with status updates confined to the same control tree.

```text
00-control/baseline-and-invariants.md
00-control/blocker-register.md
00-control/capability-register.md
00-control/change-control.md
00-control/decision-log.md
00-control/execution-status.md
00-control/gateway-register.md
00-control/risk-register.md
01-foundation/desktop-component-inventory.md
01-foundation/desktop-information-architecture.md
01-foundation/ux-adoption-matrix.md
01-foundation/ux-reference-model.md
02-platform/README.md
03-admin-surfaces/README.md
04-security/README.md
05-observability/README.md
06-packaging/README.md
07-hardening/README.md
08-evidence/DB-G0/acceptance.md
08-evidence/DB-G0/build-workflows.json
08-evidence/DB-G0/entry-and-validation.md
08-evidence/DB-G0/local-validation.md
08-evidence/DB-G0/source-workflows.json
08-evidence/DB-G1/README.md
MIQOS-DESKTOP-BUILD-001-CLOSEOUT.md
```

Change groups: controls freeze authority and carry-forward obligations; foundation records archive identity and explicitly reserves DB-G1 work; later-area READMEs reserve the required tree; DB-G0 evidence records provenance/checks; closeout remains NOT CERTIFIED. New upstream change-control IDs: none. CC-G3-001, CC-G5-001 and CC-G6-001 remain OPEN; CC-G7-001 remains inherited infrastructure with no DB-G0 edits.

## Boundary review

| Question | Result |
|---|---|
| Domain semantics changed? | No |
| Database access introduced? | No |
| Admin mutation introduced? | No |
| Environment boundary changed? | No |
| Security boundary changed? | No |
| UX authority conflict introduced? | No; visual reference only, no functionality inferred |

No customer actions, live-provider activation, ranking/recommendation/integrity override, arbitrary proxy, direct DB or new API consumption are introduced. TEST/SYNTHETIC and deployment/attestation/native-token boundaries remain frozen. Binary UX sources are not committed.

## Risks and blockers

No active DB-G0 blocker. Initial missing handover and local acquisition issues are resolved.
All 47 inherited PREP risk IDs remain recorded without silently closing pending BUILD obligations. External dependencies D-G3-IDP-001, D-G4-SIGN-001 and D-G5-ENV-001; platform controls CC-G3-001/CC-G5-001/CC-G6-001; and dependency finding R-G7-008 remain open/non-blocking for DB-G0. No new critical/high exception is accepted.

New controlled risks cover visual-reference authority confusion, placeholder/completion confusion and the local runtime mismatch. Controls are explicit in the registers.

## Exit and next authority

DB-G0 PASS accepts branch provenance and documentation/control establishment only.
DB-G1 through DB-G11 remain NOT STARTED.
Next programme step: DB-G1 — BUILD Control System & UX/Capability Baseline, requiring a separate controller execution block. No further gateway is authorised by this run.

Do not merge the draft BUILD PR or make a production/release claim from this result.
