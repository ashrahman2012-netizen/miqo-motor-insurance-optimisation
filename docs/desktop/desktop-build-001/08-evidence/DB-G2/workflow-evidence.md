# DB-G2 workflow evidence

Accepted executable source: `34ab244b28e6f97f89bc823e18232986e31e1144`.

| Workflow | Event | Run | Result | Jobs |
|---|---|---:|---|---|
| ci #675 | push | `35766441270` | SUCCESS | target-stack `106877060762`; postgres `106877061005`; locked-dependencies `106877061084` |
| ci #676 | pull_request | `35766445688` | SUCCESS | postgres `106877074913`; target-stack `106877075411`; locked-dependencies `106877076291` |
| desktop-prep-g7 #213 | pull_request | `35766445779` | SUCCESS | Windows full `106877076275` |
| desktop-prep-g8 #33 | pull_request | `35766445697` | SUCCESS | Windows installed `106877076310`; API integration `106877076555` |

Windows PR checkout/provenance uses GitHub synthetic merge `2884adb0bab21ec75676caab039f7e825bad2fcb`, paired with PR head `34ab244b28e6f97f89bc823e18232986e31e1144` and frozen base `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`.

## Artifacts

| Evidence | Artifact ID | Digest |
|---|---:|---|
| G7 Windows package | `10712319639` | `sha256:76c53c481a27241d7e0b511e12ea755f7f3c0287f3090e1a601748cc1bf27f80` |
| G8 installed Windows proof | `10712703007` | `sha256:acb2c9f3a6ad345f93e57580a5a43b37ace492a9b0e025923c43c532eab995e1` |
| G8 API proof | `10712336904` | `sha256:7a13b058890933023567a5231e26664d6f9c01b9c98b6089d2bd01e509efdac3` |

No production signature is claimed.
