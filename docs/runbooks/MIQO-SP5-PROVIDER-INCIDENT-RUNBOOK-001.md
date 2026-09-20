# MIQO-SP5-PROVIDER-INCIDENT-RUNBOOK-001 — Provider Incident, Recovery & Replay

**Version:** v1  
**Status:** Sprint 5 controlled runbook  
**Scope:** provider outage, bad provider response, and controlled replay

## Required sequence

1. Detect and correlate the affected provider route and request IDs without logging secrets or customer PII.
2. Isolate the affected route/circuit. Do not convert outage/failure states into quotation or recommendation evidence.
3. Preserve exact immutable request/raw-response evidence already captured. Never overwrite historical provider evidence.
4. Recover the route only after the configured health/circuit criteria succeed.
5. Replay only through the governed idempotency key for the exact request; payload conflict must fail closed.
6. Verify that replay did not duplicate actions or mutate historical raw evidence.
7. Re-run recommendation-integrity checks using only successful eligible quotation evidence.
8. Record the exercise/incident ID, affected request IDs, replay keys, containment state, recovery state, replay verification and recommendation-integrity verification.
9. Closure is prohibited until recovery, replay verification and recommendation-integrity verification are all positive.

## Production boundary

This runbook proves the engineering recovery control. It does not authorise any provider route to become LIVE and does not substitute for provider contractual authority, production credentials, legal/regulatory approval or activation decisions.

**Runbook version identifier:** MIQO-SP5-PROVIDER-INCIDENT-RUNBOOK-001-v1
