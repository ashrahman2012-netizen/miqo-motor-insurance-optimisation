# Upstream Change Control

## Protected baseline

`MIQOS-APP-BUILD-001` at:

`ce211bf4e23643f1eab75e865210f4de121841fb`

is the frozen upstream baseline for MIQOS-DESKTOP-PREP-001.

Desktop PREP may consume contracts, adapters, UI assets and backend interfaces from that baseline. It must not silently alter certified business behaviour, invariants, persisted semantics or certification controls.

## Required change record

Any required upstream alteration must record:

- change ID;
- discovering gateway;
- affected certified component;
- behavioural impact;
- risk;
- proposed remediation;
- test/certification impact;
- approval requirement.

No upstream correction is to be hidden inside Desktop-specific commits.
