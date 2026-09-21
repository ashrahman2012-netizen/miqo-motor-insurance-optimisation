# MIQOS Desktop Windows Runner Contract v1.0

**Gateway:** G7  
**Status:** FROZEN AT G7

## Runner

Selected hosted runner:

~~~text
windows-2025
x64
~~~

## Toolchain authority

The workflow explicitly selects/verifies:

~~~text
Node 22.16.0
npm 10.9.2
Rust 1.98.1
Cargo 1.98.1
MSVC x64 C++ build tools
~~~

The hosted image is moving infrastructure and is not itself the toolchain pin.

## Runner-provided build prerequisites

The selected image is expected to provide:

- Windows Server 2025 x64;
- Visual Studio/MSVC;
- Windows SDK;
- PowerShell;
- Git;
- rustup;
- normal Tauri Windows build prerequisites.

The workflow verifies the MSVC C++ workload before invoking the canonical build.

## Cache policy

Initial controlled Desktop CI uses:

~~~text
cache-mode: none
package-manager-cache: false
~~~

No npm or Rust build cache is used in the first certification path.

Reasons:

- clear reproducibility evidence;
- reduced cache-poisoning complexity on a public repository;
- no risk of signing/release jobs consuming untrusted cache contents.

Caching may be introduced later under a separate trusted-trigger policy.

## Environment

Desktop PREP/G8 package CI remains:

~~~text
MIQO_DATA_CLASSIFICATION=SYNTHETIC
MIQO_LIVE_PROVIDERS_ENABLED=false
~~~

No production IdP/provider/signing secret is required for ordinary package CI.

## Timeout

Primary Windows Desktop job timeout: 45 minutes.

Timeout or cancellation is not accepted as proof.
