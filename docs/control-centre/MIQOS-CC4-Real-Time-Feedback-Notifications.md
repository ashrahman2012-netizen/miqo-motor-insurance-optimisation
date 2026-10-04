# MIQOS CC4 — Real-time Feedback & Notifications

## Boundary

CC4 is an observational control-plane capability. It converts GitHub/broker observations into a normalized event model, canonical Control Centre state, operator notifications and System Map projections.

Event receipt does not authorize GitHub mutation. CC3 remains the exclusive mutation boundary.

## Data flow

GitHub/broker/runtime observations → event normalizer → bounded event store → canonical state → SSE → notification centre / status views / System Map.

The browser falls back to periodic `GET /api/state` refresh when SSE is unavailable.

## Endpoints

- `GET /api/events`
- `GET /api/events/stream`
- `GET /api/state`
- `GET /api/notifications`
- `POST /api/notifications/:id/ack`
- `POST /api/notifications/ack-all`

The POST endpoints alter operator acknowledgement state only. They do not invoke GitHub write operations.

## Bounds

- Raw normalized events: 500
- Notifications: 250
- SSE replay on connect: latest 25 events

## Security invariants

- No GitHub token, Authorization header, secret, password, cookie or API key is persisted.
- CC4 does not import or invoke `github-write.mjs` or mutation-policy operations.
- Repeated observations are deduplicated by logical transition key.
- System Map node state derives from the same canonical state used by notifications/status views.
- Failure events never automatically dispatch, rerun, merge or deploy anything.
