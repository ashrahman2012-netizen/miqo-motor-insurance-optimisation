import type {ProfileReviewVM, ProfileVersionStatus, ResultDetailVM} from "@miqo/application-contracts";

type DashboardProfileInput = Pick<ProfileReviewVM, "profileId" | "version" | "pageState">;
type DashboardResultInput = Pick<ResultDetailVM, "sourceRecommendationSetId" | "surfacedResult" | "pageState">;

export interface DashboardFoundationVM {
  readonly profileStatus: ProfileVersionStatus;
  readonly objectiveLabel: string;
  readonly activeScenarioCount: number;
  readonly resultStatus: "READY";
  readonly caseId: string;
  readonly profileVersionId: string;
  readonly journey: ReadonlyArray<{readonly label: string; readonly status: "PASS" | "READY" | "LOCKED"}>;
  readonly surfacedResult: NonNullable<ResultDetailVM["surfacedResult"]>;
}

export function toDashboardFoundationVM(input: {
  readonly profile: DashboardProfileInput;
  readonly result: DashboardResultInput;
  readonly objectiveLabel: string;
  readonly activeScenarioCount: number;
  readonly resultStatus: "READY";
  readonly caseId: string;
  readonly journey: DashboardFoundationVM["journey"];
}): DashboardFoundationVM {
  if (!input.result.surfacedResult) {
    throw new Error("BUILD-001A fixture requires an already-surfaced P4 result ViewModel");
  }
  return {
    profileStatus: input.profile.version.status,
    objectiveLabel: input.objectiveLabel,
    activeScenarioCount: input.activeScenarioCount,
    resultStatus: input.resultStatus,
    caseId: input.caseId,
    profileVersionId: input.profile.version.versionId,
    journey: input.journey,
    surfacedResult: input.result.surfacedResult,
  };
}

const profileFixture = {
  profileId: "PRO-SYN-DASH-001",
  version: {versionId: "RPV-SYN-001", versionNo: 1, status: "LOCKED", lockedAt: "2026-09-20T12:00:00.000Z"},
  pageState: {state: "SUCCESS", code: null, title: null, message: null, retryable: false, referenceId: null},
} satisfies DashboardProfileInput;

const resultFixture = {
  sourceRecommendationSetId: "REC-SP4-SYN-DASH-001",
  surfacedResult: {
    normalisedQuoteId: "NQ-SYN-DASH-001",
    quoteRequestId: "QR-SYN-DASH-001",
    scenarioId: "SCN-SYN-DASH-001",
    marketRoute: {
      marketRouteId: "MR-SYN-DASH-001",
      routeKey: "synthetic-direct",
      displayName: "Synthetic Direct Route",
      providerKey: "MOCK-PROVIDER-001",
      channelKey: "DIRECT_SYNTHETIC",
      environment: "SYNTHETIC",
      adapterVersion: "adapter-v1",
      mappingVersion: "mapping-v1",
      certificationState: null,
    },
    comparisonState: "DIRECTLY_COMPARABLE",
    comparisonReason: "Eligible under the active direct-comparison rule.",
    ordinal: 1,
    objectiveMetric: "annual_cash_premium_pence",
    objectiveMetricValuePence: 64215,
    pricing: {annualCashPremiumPence: 64215, financeCostPence: 0, monthlyCommitmentPence: null, totalPayablePence: 64215},
    excess: {compulsoryExcessPence: 25000, voluntaryExcessPence: 50000, totalExcessExposurePence: 75000},
    normalisationVersion: "norm-v1",
    eligible: true,
    exclusionReason: null,
    openAction: {state: "AVAILABLE", reason: null},
  },
  pageState: {state: "SUCCESS", code: null, title: null, message: null, retryable: false, referenceId: null},
} satisfies DashboardResultInput;

export const dashboardFoundationFixture = toDashboardFoundationVM({
  profile: profileFixture,
  result: resultFixture,
  objectiveLabel: "Lowest annual premium",
  activeScenarioCount: 4,
  resultStatus: "READY",
  caseId: "CASE-SYN-001",
  journey: [
    {label: "Profile", status: "LOCKED"},
    {label: "Objective", status: "PASS"},
    {label: "Scenarios", status: "PASS"},
    {label: "Quotes", status: "PASS"},
    {label: "Your Results", status: "READY"},
  ],
});
