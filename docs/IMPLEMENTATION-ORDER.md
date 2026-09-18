# MIQO implementation order

## Walking skeleton
1. Environment boundary checks.
2. PostgreSQL bootstrap and migration.
3. SYN-001 seed.
4. Profile creation.
5. Minimum factual questionnaire.
6. Validation.
7. Lock RiskProfileVersion v1.
8. O-only scenario creation.
9. Deterministic mock provider A.
10. Raw response persistence.
11. Normalisation.
12. Comparison.
13. Final integrity.
14. Audit trace.
15. Admin inspection.

Do not expand horizontally across all 23 screens before this vertical trace works end-to-end.
