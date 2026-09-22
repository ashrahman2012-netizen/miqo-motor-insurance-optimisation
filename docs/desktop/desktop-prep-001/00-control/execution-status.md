# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G8 — Desktop Skeleton Proof
**Status:** G8 PASS — WINDOWS INSTALLED DESKTOP SKELETON PROOF COMPLETE
**Execution branch:** miqos/desktop-prep-001
**Upstream certified branch:** miqos/app-build-001
**Upstream certified SHA:** ce211bf4e23643f1eab75e865210f4de121841fb
**Validated source head:** d8eb075b894ead75b00f7a501a2acde032d7a6c3
**Date:** 2026-09-22

## Current control position

G0 through G8 are PASS. G9 is NOT STARTED.

The validated head adds a pre-install NSIS hook that compares the incoming package version with the registered installed version and aborts a downgrade before file copy. The permanent proof retains the independent post-attempt assertion that the older package did not replace the installed 0.1.1 package.

## Same-head certification evidence

- repository CI run `35736586648` / #661 — **SUCCESS**;
- Desktop G7 run `35736586650` / #208, job `106775275617` — **SUCCESS**;
- Desktop G8 run `35736586909` / #30 — **SUCCESS**;
- G8 Windows installed proof job `106775277095` — **SUCCESS**;
- G8 API integration job `106775277382` — **SUCCESS**.

The Windows proof completed package build, install, launch, controlled unavailable/retry behaviour, SYNTHETIC/ATTESTED evidence, structured logging, runtime independence, 0.1.0 → 0.1.1 upgrade, downgrade rejection, uninstall and artefact upload.

## Evidence artefacts

- G8 Windows artefact `10698328970`, digest `sha256:49974751bd01a4cce48b837cbe8c98eaf4ef740a2608e46580bca1401afd69a8`;
- G8 API artefact `10697247792`, digest `sha256:565d383a990a29f37871f2f2daae2c3b48435358318a5b00f2f16008d7a8cc85`;
- G7 package artefact `10699045077`, digest `sha256:c33a935edbaafb00ca26ecd9b14f00226a36ce05778cf75c980ce261eeec78ec`.

## Next controlled operation

Begin G9 PREP certification and final evidence review. Production signing and real-environment identity/configuration dependencies remain separately controlled and were not broadened by G8.
