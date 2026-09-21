# MIQOS Desktop Mutation Authority Matrix v1.0

**Gateway:** G2  
**Status:** FROZEN AT G2

## 1. Default

**The Desktop Admin Application has no implicit authority to mutate MIQOS domain state.**

Existing API mutation endpoints are not automatically Admin capabilities.

## 2. Authority matrix

| Operation | Desktop may present? | Desktop may execute at G2? | Authoritative owner |
|---|---|---:|---|
| Change local route/filter/view state | Yes | Yes | Desktop |
| Open/copy opaque IDs/fingerprints | Yes | Yes | Desktop presentation |
| Refresh authoritative evidence | Yes | Yes | API read contract |
| Read profile/version | Yes | Yes | API/profile service |
| Read audit/trace | Yes | Yes | API/audit/trace |
| Read discrepancy/integrity evidence | Yes | Yes | API/domain |
| Create profile | Not as Admin capability | **No** | profile service/customer/application flow |
| Write factual field | Not as Admin capability | **No** | profile service; current-version guard |
| Lock profile | May display state | **No** | profile service |
| Create correction draft | May inspect resulting lineage | **No** | profile service |
| Save optimisation preferences | May inspect | **No** | optimisation preference service |
| Select customer objective | May inspect | **No** | optimisation policy service |
| Generate scenarios | May inspect | **No** | scenario service |
| Execute market-route quotes | May inspect | **No** | quote/provider orchestration |
| Create recommendation | May inspect | **No** | recommendation service |
| Select quote | May inspect | **No** | selection service |
| Override ranking/comparison | No | **PROHIBITED** | no UI authority |
| Override integrity outcome | No | **PROHIBITED** | no UI authority |
| Mutate/delete audit evidence | No | **PROHIBITED** | append-only audit |
| Directly edit DB | No | **PROHIBITED** | service/database layer |
| Activate live provider | No | **PROHIBITED / DEFERRED** | provider certification/activation |
| Execute generic shell/filesystem command | No | **PROHIBITED** | not an MIQOS admin capability |

## 3. Future admin mutation admission rule

A future Desktop admin mutation may be added only when all of these are defined:

1. explicit admin use case;
2. dedicated or explicitly authorised API command;
3. server-side authentication and role/permission requirement;
4. server-side validation;
5. immutable/auditable event;
6. idempotency/concurrency behaviour;
7. failure and rollback semantics;
8. ViewModel/action availability contract;
9. tests proving unauthorised/invalid paths fail;
10. change-control assessment against certified invariants.

## 4. No endpoint privilege escalation

The Desktop app must not use an existing general/customer mutation endpoint as an Admin command solely because the endpoint is technically reachable.

This prevents:

```text
UI location == authority
```

from becoming an accidental security model.

## 5. Action rendering

Where a future action exists, the Desktop UI must render it from explicit authoritative availability/permission state.

A visible button is not authority.

A hidden button is not security.

The server remains authoritative.
