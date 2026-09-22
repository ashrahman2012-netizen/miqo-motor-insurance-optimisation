# DB-G3 evidence — Native Platform, Transport & Environment Boundary

**Status:** IN PROGRESS — executable source committed; exact-source CI/Windows evidence pending.

Entry: `c03a9ec518683121cf6816f6faeb8d9b580fce6a`.

Expected evidence:

- exact source delta / boundary review;
- Rust negative tests through canonical Desktop CI;
- repository push/PR CI;
- Windows G7 full package proof;
- Windows/API G8 installed regression proof;
- final DB-G3 acceptance record.

No production identity, production signing or non-synthetic environment proof is claimed.

## Repair history

Initial source `ce4fd0c95b50b61a3c4d3dfc91ee0951c459c654` reached Desktop typecheck/tests successfully but G7 and Windows G8 stopped at Rust formatting. DB-G3 does not count those failed jobs as proof. The next source revision contains formatter-only correction plus this evidence note and must rerun the complete validation chain.
