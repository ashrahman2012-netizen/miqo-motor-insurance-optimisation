import {describe, expect, it} from "vitest";
import type {AdminSprint4TraceApi} from "@miqo/application-adapters";
import {loadDesktopDecisionTrace} from "../src/services/admin-decision-trace";
import type {DesktopApiTransport} from "../src/services/contracts";

const trace: AdminSprint4TraceApi = {
  profile: {profileId: "PRO-SYN-001"},
  riskProfileVersion: {
    riskProfileVersionId: "RPV-SYN-001-V1",
    versionNo: 1,
    status: "LOCKED",
    lockedAt: "2026-09-23T10:00:00.000Z",
  },
  customerObjective: {
    customerObjectiveId: "CO-SYN-001",
    objectiveId: "LOWEST_ANNUAL_PREMIUM",
    objectiveVersion: "sp4-objectives-v1",
    catalogueVersion: "sp4-catalogue-v2.1",
    policyFingerprint: "policy-fingerprint",
    selectedAt: "2026-09-23T10:01:00.000Z",
  },
  exploration: {
    explorationFingerprint: "exploration-fingerprint",
    generationVersion: "sp4-gen-v1",
    scenarioCount: 1,
    scenarios: [{
      scenarioId: "SCN-SYN-001",
      generationOrdinal: 1,
      generationVersion: "sp4-gen-v1",
      candidateFingerprint: "candidate-fingerprint",
      catalogueVersion: "sp4-catalogue-v2.1",
      policyFingerprint: "policy-fingerprint",
      deltas: [{fieldId: "voluntary_excess", controlClass: "O", value: 500}],
    }],
  },
  marketRouteQuotes: [{
    evidenceStatus: "ELIGIBLE",
    ordinal: 1,
    objectiveMetric: "annual_cash_premium_pence",
    objectiveMetricValuePence: 70140,
    exclusionReason: null,
    evidenceFingerprint: "evidence-fingerprint",
    scenarioId: "SCN-SYN-001",
    marketRoute: {
      marketRouteId: "MR-SYN-001",
      routeKey: "DIRECT",
      routeCatalogueVersion: "routes-v1",
      providerKey: "MOCK-PROVIDER-001",
      channelKey: "DIRECT_SYNTHETIC",
      adapterVersion: "mock-adapter-v1",
      mappingVersion: "mock-mapping-v1",
      routeFingerprint: "route-fingerprint",
    },
    quoteRequest: {
      quoteRequestId: "QREQ-SYN-001",
      requestFingerprint: "request-fingerprint",
      adapterVersion: "mock-adapter-v1",
      mappingVersion: "mock-mapping-v1",
      orchestrationVersion: "orchestration-v1",
    },
    rawProviderResponse: {
      rawProviderResponseId: "RAW-SYN-001",
      providerReference: "MOCK-REF",
      payloadSha256: "payload-sha",
    },
    normalisedQuote: {
      normalisedQuoteId: "NQ-SYN-001",
      normalisationVersion: "normalisation-v1",
      normalisationFingerprint: "normalisation-fingerprint",
      comparisonState: "DIRECTLY_COMPARABLE",
      annualCashPremiumPence: 70140,
      financeCostPence: 0,
      compulsoryExcessPence: 25000,
      voluntaryExcessPence: 50000,
    },
  }],
  recommendation: {
    recommendationSetId: "REC-SYN-001",
    recommendationRuleVersion: "sp4-recommendation-v1",
    recommendationFingerprint: "recommendation-fingerprint",
    surfacedNormalisedQuoteId: "NQ-SYN-001",
    explanation: {
      recommendationExplanationId: "REX-SYN-001",
      explanationRuleVersion: "sp4-explainability-v1",
      explanationFingerprint: "explanation-fingerprint",
      materialReasons: [{
        code: "COMMERCIAL_INPUTS_EXCLUDED",
        detail: "Commercial inputs excluded.",
      }],
    },
  },
  recommendationSelectionLink: {
    auditEventId: "AUD-LINK-001",
    recommendationSetId: "REC-SYN-001",
    recommendationFingerprint: "recommendation-fingerprint",
    explorationFingerprint: "exploration-fingerprint",
    customerObjectiveId: "CO-SYN-001",
  },
  selection: {
    selectionId: "SEL-SYN-001",
    status: "ACCEPTED",
    selectedAt: "2026-09-23T10:02:00.000Z",
  },
  shortlist: {
    shortlistId: "SHORT-SYN-001",
    comparisonRuleVersion: "comparison-v1",
    comparisonFingerprint: "comparison-fingerprint",
  },
  finalIntegrity: {
    finalIntegrityResultId: "FIR-SYN-001",
    ruleVersion: "final-integrity-v1",
    outcome: "PASS",
    evidence: {source: "persisted"},
  },
  completion: {
    prototypeCompletionId: "COMP-SYN-001",
    status: "PROTOTYPE_JOURNEY_COMPLETE",
    dataClassification: "SYNTHETIC",
    liveProviderActivity: "DISABLED",
  },
};

function transport(rawQuoteRequestId = "QREQ-SYN-001"): DesktopApiTransport {
  return {
    getRuntimeProfile: async () => ({
      schemaVersion: "miqos-desktop-config-v1",
      profileId: "test-synthetic",
      deploymentStage: "TEST",
      applicationEnvironment: "SYNTHETIC",
      apiService: "127.0.0.1:4000",
      apiAudience: "miqos-api-test",
      authenticationMode: "NON_PRODUCTION_STUB",
      buildVersion: "0.1.0",
      buildId: "test",
      sourceCommit: "test",
      deploymentProfileSha256: "test",
    }),
    getHealth: async () => ({
      status: "ok",
      dataClassification: "SYNTHETIC",
      liveProvidersEnabled: false,
    }),
    loadAdminProfile: async () => { throw new Error("NOT_USED"); },
    loadAdminProfileVersion: async () => { throw new Error("NOT_USED"); },
    loadAdminProfileAudit: async () => { throw new Error("NOT_USED"); },
    loadAdminSelectionTrace: async () => ({
      trace,
      auditEvents: [{
        auditEventId: "AUD-1",
        eventType: "quote_selected",
        entityType: "selection",
        entityId: "SEL-SYN-001",
        traceId: "PRO-SYN-001",
        occurredAt: "2026-09-23T10:02:00.000Z",
        metadataJson: {},
      }],
      discrepancies: [],
      rawProviderResponse: {
        rawProviderResponseId: "RAW-SYN-001",
        quoteRequestId: rawQuoteRequestId,
        providerReference: "MOCK-REF",
        responseTimestamp: "2026-09-23T10:01:30.000Z",
        payloadText: "{\"premium\":70140}",
        payload: {premium: 70140},
        payloadSha256: "payload-sha",
        receivedAt: "2026-09-23T10:01:31.000Z",
      },
    }),
  };
}

describe("DB-G5 deep decision evidence", () => {
  it("preserves authoritative lineage, comparison and integrity evidence", async () => {
    const proof = await loadDesktopDecisionTrace(transport(), "SEL-SYN-001");
    expect(proof.trace.exploration.scenarios).toHaveLength(1);
    expect(proof.trace.marketRouteQuotes[0]).toMatchObject({
      evidenceStatus: "ELIGIBLE",
      ordinal: 1,
      objectiveMetricValuePence: 70140,
    });
    expect(proof.viewModel.normalisedEvidence?.comparisonState).toBe("DIRECTLY_COMPARABLE");
    expect(proof.viewModel.rawProviderResponse?.payloadSha256).toBe("payload-sha");
    expect(
      proof.viewModel.integrityQueue.find(item => item.category === "FINAL_INTEGRITY")?.status.code,
    ).toBe("PASS");
    expect(proof.viewModel.lineage?.nodes.map(node => node.kind)).toContain("RECOMMENDATION_SET");
  });

  it("fails closed when raw provider evidence mismatches the surfaced quote request", async () => {
    await expect(loadDesktopDecisionTrace(transport("QREQ-OTHER"), "SEL-SYN-001"))
      .rejects.toThrow("DESKTOP_TRACE_RAW_RESPONSE_MISMATCH");
  });
});
