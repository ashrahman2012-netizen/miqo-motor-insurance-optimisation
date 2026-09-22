# MIQOS Desktop CI Workflow Security v1.0

**Gateway:** G7  
**Status:** FROZEN AT G7

## Token permissions

Ordinary Desktop CI declares:

~~~yaml
permissions:
  contents: read
~~~

No repository write/release permission is granted to PR/package-validation jobs.

## Immutable action pins

The controlled workflow pins GitHub Actions to full commit SHAs:

~~~text
actions/checkout
3d3c42e5aac5ba805825da76410c181273ba90b1
v7.0.1

actions/setup-node
820762786026740c76f36085b0efc47a31fe5020
v7.0.0

actions/upload-artifact
043fb46d1a93c77aae656e7c1c64a875d1fc6a0a
v7.0.1
~~~

Pin updates require review.

## Pull-request trust

- do not use `pull_request_target` for Desktop build execution;
- PR builds receive no production signing/provider/identity secrets;
- checkout credential persistence is disabled;
- repository scripts executed by CI are reviewable in the proposed commit.

## Caches

Caches are disabled initially.

If introduced later:

- secret/credential paths are prohibited;
- untrusted PR cache-write access remains disabled;
- release/signing does not rely on untrusted caches.

## Dependency restore

Use `npm ci` against the committed lockfile.

Do not use `npm install` in controlled CI.

When G8 creates Rust dependencies, `Cargo.lock` becomes mandatory for release/package CI.

## Signing boundary

Production signing belongs to a protected release environment/job.

PR or ordinary branch jobs may create unsigned/test-signed mechanical package evidence only and must not represent it as production.
