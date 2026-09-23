import {composeAdminAuditTracePageVM} from "@miqo/application-adapters";
import type {AdminAuditTraceFiltersVM} from "@miqo/application-contracts";
import type {DesktopApiTransport, DesktopDecisionTraceProof} from "./contracts";

const EMPTY_TRACE_FILTERS: Omit<AdminAuditTraceFiltersVM, "selectionId"> = {
  profileId: null,
  profileVersionId: null,
  recommendationSetId: null,
  scenarioId: null,
  eventType: null,
  dateFrom: null,
  dateTo: null,
};

export async function loadDesktopDecisionTrace(
  transport: DesktopApiTransport,
  selectionId: string,
): Promise<DesktopDecisionTraceProof> {
  const runtime = await transport.getRuntimeProfile();
  if (
    runtime.deploymentStage !== "TEST"
    || runtime.applicationEnvironment !== "SYNTHETIC"
    || runtime.profileId !== "test-synthetic"
  ) {
    throw new Error("DESKTOP_ENVIRONMENT_PROFILE_MISMATCH");
  }

  const health = await transport.getHealth();
  if (
    health.status !== "ok"
    || health.dataClassification !== "SYNTHETIC"
    || health.liveProvidersEnabled
  ) {
    throw new Error("DESKTOP_ENVIRONMENT_ATTESTATION_FAILED");
  }

  const evidence = await transport.loadAdminSelectionTrace(selectionId);
  if (evidence.trace.selection.selectionId !== selectionId) {
    throw new Error("DESKTOP_TRACE_SELECTION_MISMATCH");
  }

  const surfacedId = evidence.trace.recommendation.surfacedNormalisedQuoteId;
  const surfaced = surfacedId
    ? evidence.trace.marketRouteQuotes.find(
        item => item.normalisedQuote.normalisedQuoteId === surfacedId,
      )
    : null;

  if (surfacedId && !surfaced) {
    throw new Error("DESKTOP_TRACE_SURFACED_QUOTE_NOT_FOUND");
  }
  if (
    evidence.rawProviderResponse
    && surfaced
    && evidence.rawProviderResponse.quoteRequestId !== surfaced.quoteRequest.quoteRequestId
  ) {
    throw new Error("DESKTOP_TRACE_RAW_RESPONSE_MISMATCH");
  }

  return {
    runtime,
    health,
    trace: evidence.trace,
    viewModel: composeAdminAuditTracePageVM({
      filters: {selectionId, ...EMPTY_TRACE_FILTERS},
      environment: "SYNTHETIC",
      trace: evidence.trace,
      auditEvents: evidence.auditEvents,
      rawProviderResponse: evidence.rawProviderResponse,
      discrepancies: evidence.discrepancies,
    }),
  };
}
