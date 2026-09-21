# MIQOS Desktop Environment Attestation v1.0

**Gateway:** G5  
**Status:** FROZEN AT G5

## 1. Startup sequence

Before protected Admin evidence is shown:

```text
load bundled deployment profile
→ validate schema
→ validate stage/environment coherence
→ initialise G3 auth configuration
→ contact expected MIQOS API
→ read minimal health/environment evidence
→ compare expected versus server-reported classification
→ establish effective environment state
→ allow or block protected UI
```

## 2. Current health evidence

The certified API currently exposes:

```text
GET /health
status
dataClassification
liveProvidersEnabled
```

and the certified backend can currently report only SYNTHETIC with live providers disabled.

G8 synthetic proof can therefore attest a TEST/SYNTHETIC Desktop package against that endpoint.

Future certification/production platform extensions should retain a machine-readable environment/health descriptor sufficient for the same coherence check.

## 3. Coherence rules

### SYNTHETIC

Require:

- Desktop application environment = SYNTHETIC;
- API data classification = SYNTHETIC;
- live-provider activity = false/disabled.

Any contradiction blocks protected activity.

### CERTIFICATION

Require:

- Desktop application environment = CERTIFICATION;
- API explicitly reports certification classification/authority;
- provider activity, if any, is server-authorised controlled certification activity.

Do not infer certification from URL naming.

### PRODUCTION

Require:

- Desktop application environment = PRODUCTION;
- API explicitly reports production environment;
- authentication/authorisation security extension is active;
- production provider capability remains independently server-controlled.

Do not infer production authority from successful connectivity alone.

## 4. Mismatch state

Environment mismatch maps to:

```text
NOT_AUTHORISED
ENVIRONMENT_UNKNOWN / ENVIRONMENT_MISMATCH
```

with:

- no silent fallback;
- no retry loop;
- no alternate endpoint discovery;
- no user-editable endpoint switch;
- build/profile ID and correlation information available for support.

## 5. Endpoint pinning semantics

G5 pins the **expected service identity/configuration**, not server certificates/leaf keys.

Normal operating-system TLS trust validation applies initially.

Certificate pinning is not introduced without a separate lifecycle/rotation design because unmanaged pinning can create availability and certificate-rollover risk.

## 6. Network failure

Network failure is distinct from environment mismatch.

A disconnected application shows ERROR/OFFLINE state and does not reinterpret the environment.

Cached authoritative MIQOS state is not substituted because G3 forbids persistent business-data caching by default.
