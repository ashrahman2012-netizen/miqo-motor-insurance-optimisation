# MIQOS Desktop CI Artefact Contract v1.0

**Gateway:** G7  
**Status:** FROZEN AT G7

## Canonical files

~~~text
miqos-admin_<semver>_windows-x64_nsis.exe
miqos-admin_<semver>_windows-x64_nsis.exe.sha256
build-manifest.json
~~~

## Manifest minimum

The canonical build script records:

- schema version;
- product/version;
- package filename;
- SHA-256;
- byte size;
- x64 architecture;
- NSIS installer family;
- source commit;
- CI run/build ID;
- Node/npm/Rust/Cargo versions;
- synthetic/live-provider boundary values;
- Authenticode status;
- UTC package production timestamp.

G8 may extend but not remove these fields.

## Actions artefact

Full CI uploads:

~~~text
miqos-admin-windows-x64-<source-sha>
~~~

Retention: 14 days for routine CI evidence.

Routine Actions artefacts are not the durable certified-release archive; final certification/release provenance must retain checksums and source/run identity independently.

## Immutability

Workflow artefacts are treated as immutable outputs. Different jobs/runs must not mutate the same artefact name.

## Missing package

Full mode fails unless exactly one NSIS setup executable exists.

Upload uses `if-no-files-found: error`.

## Signing

Unsigned/test-signed output is mechanical evidence only.

Production release requires the G4 Authenticode/UI-SIGN contract.
