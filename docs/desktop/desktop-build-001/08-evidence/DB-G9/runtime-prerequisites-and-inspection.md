# DB-G9 runtime prerequisites and package inspection

Accepted source: `1903298c897e3aadb2ed89fbbd9309e24d68005a`

Package/install-tree inspection proves absence of hidden runtime dependencies for:
- Node / npm;
- Rust / Cargo;
- PostgreSQL / libpq / pg_ctl;
- Git;
- Visual Studio compiler/build tooling.

The installed application is launched under a restricted PATH to avoid accidental developer-tool dependency.

The package inspection also rejects:
- `.env` files;
- private/signing key filenames and private-key markers;
- client-secret/database/provider/signing-secret markers;
- private-key/certificate container extensions;
- local authoritative database files.

Observed WebView2 Evergreen runtime: `152.0.4191.66`.

Result: **PASS**.
