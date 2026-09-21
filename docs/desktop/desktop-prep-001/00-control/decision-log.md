# Decision Log

## D-G0-001 — Desktop PREP upstream baseline

**Decision:** Base Desktop PREP on `miqos/app-build-001` at `ce211bf4e23643f1eab75e865210f4de121841fb`.

**Reason:** The repository certification record identifies MIQOS-APP-BUILD-001 as CERTIFIED/COMPLETE. The branch is 166 commits ahead of `main`; therefore `main` is not an acceptable substitute for the certified application baseline.

## D-G0-002 — Execution branch

**Decision:** Create `miqos/desktop-prep-001` directly from the certified SHA.

**Reason:** This preserves exact provenance and isolates Desktop preparation from both `main` and the frozen upstream branch.

## D-G0-003 — Package-management baseline

**Decision:** Preserve the existing npm workspaces and lockfile model during G0.

**Evidence:** Root `package.json` declares npm 10.9.2, Node 22.16.0 and workspaces `apps/*`, `packages/*`; `package-lock.json` is present.

No Desktop framework or packaging technology is selected in G0. That decision belongs to G1/G4.
