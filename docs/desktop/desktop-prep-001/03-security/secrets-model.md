# MIQOS Desktop Secrets Model v1.0

**Gateway:** G3  
**Status:** FROZEN AT G3

## 1. Secret classification

### Not secrets

These may be deployment configuration:

- OIDC issuer URL;
- native public client ID;
- MIQOS API audience/resource identifier;
- authorised API base URL;
- redirect path;
- environment identifier;
- public signing certificate chain.

They must still be integrity-controlled configuration.

### Secrets / sensitive credentials

- refresh token;
- access token;
- temporary authorisation code / PKCE verifier while active;
- any future DPoP/private key;
- production signing private key/certificate credential;
- server-side identity-provider credentials;
- API/service/database credentials.

## 2. Public-client rule

The Desktop application **must not contain an OAuth client secret**.

A secret embedded in a distributed native binary cannot establish confidential-client identity.

## 3. Storage rule

Long-lived user credential material, if required, is stored only through a Windows OS-protected credential facility exposed by the Tauri core.

Preferred Windows mechanism for persistent refresh credentials:

**Windows Credential Manager** under the interactive user's credential set.

DPAPI-protected per-user storage may be used only as a documented fallback where Credential Manager cannot satisfy an implementation requirement.

Machine-wide DPAPI protection is not appropriate for user-bound refresh credentials because it can allow other users on the same machine to decrypt machine-bound data.

## 4. Renderer prohibition

The following are prohibited for secrets/tokens:

- `localStorage`;
- `sessionStorage` as durable credential strategy;
- IndexedDB;
- cookies created solely to hide a native refresh token from application code;
- plaintext files;
- registry plaintext values;
- environment variables shipped to the renderer bundle;
- source files;
- logs/crash reports/support bundles.

## 5. CI/build secrets

Desktop source/build artefacts must not contain:

- production access/refresh tokens;
- IdP confidential-client secret;
- code-signing private key;
- timestamping credential;
- package repository secret.

Signing and CI credential handling is finalised in G4/G7.

## 6. Memory handling

- keep access-token lifetime in process memory only;
- minimise copies of token strings;
- do not expose token values through Tauri events or frontend state stores;
- overwrite/drop native buffers where practical after use;
- never include token material in exception text.

## 7. DPoP/sender-constraining

Current OAuth BCP recommends sender-constrained access tokens where feasible and requires public-client refresh tokens to be sender-constrained or rotated.

If the selected IdP/API supports DPoP, a per-installation/private key may be generated and held behind the native secure boundary. Adoption is an implementation decision requiring interoperability proof; absence of DPoP does not permit non-rotating replayable refresh tokens.

## 8. Secret rotation/revocation

The architecture must support:

- refresh-token rotation/revocation;
- IdP session revocation;
- signing-certificate rollover;
- API key/service-secret rotation on the server side;
- removing local credentials without reinstalling the application.

No secret rotation requires rebuilding the Desktop application except where a public trust anchor/configuration change genuinely requires a new signed release.
