# MIQOS Desktop Support Runbook v1.0

**Gateway:** G6
**Status:** FROZEN AT G6

## 1. First-line information

For any Desktop incident collect:

1. user-visible support reference;
2. app version/build ID;
3. deployment stage/environment;
4. time of incident in UTC if known;
5. symptom category;
6. support bundle if policy permits.

Do not ask users to send screenshots containing sensitive raw evidence unless required and authorised.

## 2. Symptom routing

### Application will not start

Check:

- Windows support baseline;
- package/signature state;
- WebView2 runtime;
- deployment-profile validation;
- local log write path;
- previous-run crash marker.

### Environment mismatch

Check:

- deployment profile ID/fingerprint;
- expected application environment;
- API health-reported classification/provider state.

Do not change local configuration to bypass the mismatch.

### Sign-in failure

Check:

- deployment profile/issuer identity;
- system browser launch;
- loopback callback outcome;
- safe OAuth error code;
- clock/time validity;
- IdP availability.

Never request token contents from the user.

### Authenticated but unauthorised

Treat HTTP 403 as a permission/role configuration issue, not a retry/network issue.

Use subject reference and server access-audit/trace correlation.

### API unavailable

Check:

- DNS/network/TLS reachability;
- API health;
- environment profile;
- correlation reference.

Do not switch to an arbitrary endpoint.

### Audit/trace evidence missing

Distinguish:

- API/network failure;
- 403 permission failure;
- expected EMPTY state;
- missing authoritative evidence.

Do not reconstruct missing MIQOS evidence from local logs.

### Repeated crash

Use:

- unclean-run marker;
- recent local logs;
- build/version;
- support bundle;
- controlled repair/reinstall if package corruption is suspected.

Memory dumps require separate authorisation.

## 3. Escalation

Engineering escalation should include:

- support-bundle SHA-256;
- source/build identity;
- trace/request IDs;
- server-side correlated logs;
- reproduction steps;
- environment;
- classification of whether issue is Desktop, platform/API, identity, packaging, or domain evidence.

## 4. Evidence hierarchy

For incident analysis:

~~~text
domain/audit evidence = business/history authority
server security audit = access authority
API/server logs       = server operational evidence
Desktop local logs    = client operational evidence
support bundle        = packaged diagnostic projection
~~~

A lower layer does not override a higher-authority business/security record.
