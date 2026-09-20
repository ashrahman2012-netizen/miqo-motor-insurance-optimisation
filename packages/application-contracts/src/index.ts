/**
 * MIQOS application-facing ViewModel contracts.
 *
 * APP-PREP P4 baseline: type-only. These contracts do not implement business rules.
 */

export type ControlClass = "F" | "V" | "D" | "O" | "I";
export type ApplicationEnvironment = "SYNTHETIC" | "CERTIFICATION" | "PRODUCTION";
export type ProfileVersionStatus = "DRAFT" | "LOCKED" | "SUPERSEDED";
export type ComparisonState = "DIRECTLY_COMPARABLE" | "ADJUSTED_COMPARABLE" | "NOT_COMPARABLE";
export type CustomerObjectiveId =
  | "LOWEST_ANNUAL_PREMIUM"
  | "LOWEST_MONTHLY_COMMITMENT"
  | "LOWEST_FINANCE_COST"
  | "LOWER_EXCESS_EXPOSURE"
  | "BALANCED_COST_AND_EXPOSURE";

export type UiAsyncState =
  | "IDLE"
  | "LOADING"
  | "REFRESHING"
  | "SUCCESS"
  | "EMPTY"
  | "PARTIAL"
  | "ERROR"
  | "BLOCKED"
  | "NOT_AUTHORISED";

export type DomainUiStateCode =
  | "NO_PROFILE"
  | "PROFILE_INCOMPLETE"
  | "VALIDATION_FAILED"
  | "DISCREPANCY_REVIEW_REQUIRED"
  | "PROFILE_NOT_LOCKED"
  | "NO_OBJECTIVE"
  | "NO_SCENARIOS"
  | "ALL_SCENARIOS_REJECTED"
  | "NO_QUOTES"
  | "PARTIAL_QUOTES"
  | "ALL_QUOTES_NOT_COMPARABLE"
  | "NO_ELIGIBLE_RESULTS"
  | "FINAL_INTEGRITY_BLOCKED"
  | "ENVIRONMENT_UNKNOWN"
  | "PROVIDER_ACTION_NOT_AUTHORISED";

export type IsoDateTime = string;
export type Pence = number;

export type ActionState = "AVAILABLE" | "BLOCKED" | "NOT_AUTHORISED" | "HIDDEN";

export interface ActionAvailabilityVM {
  readonly state: ActionState;
  readonly reason: string | null;
}

export interface PageStateVM {
  readonly state: UiAsyncState;
  readonly code: DomainUiStateCode | null;
  readonly title: string | null;
  readonly message: string | null;
  readonly retryable: boolean;
  readonly referenceId: string | null;
}

export interface ApplicationEnvironmentVM {
  readonly environment: ApplicationEnvironment;
  readonly displayLabel: string;
  readonly dataClassification: string;
  readonly providerConnectivityClass: string;
  readonly customerBanner: "PERSISTENT" | "NONE";
  readonly customerBannerMessage: string | null;
  readonly adminBadge: "INFO" | "CERTIFICATION" | "NEUTRAL";
}

export interface StatusVM {
  readonly code: string;
  readonly label: string;
  readonly semanticFamily:
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "certification"
    | "dormant";
  readonly reason: string | null;
}

export interface ProfileVersionVM {
  readonly versionId: string;
  readonly versionNo: number;
  readonly status: ProfileVersionStatus;
  readonly lockedAt: IsoDateTime | null;
}

export interface ProfileFieldVM {
  readonly fieldId: string;
  readonly label: string;
  readonly controlClass: ControlClass;
  readonly value: unknown;
  readonly displayValue: string;
  readonly sourceType: string | null;
  readonly provenanceAvailable: boolean;
  readonly editable: boolean;
}

export interface ValidationIssueVM {
  readonly code: string | null;
  readonly fieldId: string | null;
  readonly message: string;
}

export interface ValidationResultVM {
  readonly valid: boolean;
  readonly versionId: string;
  readonly issues: ReadonlyArray<ValidationIssueVM>;
}

export interface DiscrepancyVM {
  readonly discrepancyId: string;
  readonly fieldId: string;
  readonly label: string;
  readonly status: string;
  readonly factualValue: unknown;
  readonly evidenceValue: unknown;
  readonly reason: string | null;
  readonly resolutionAction: ActionAvailabilityVM;
}

export interface ProfileReviewVM {
  readonly profileId: string;
  readonly version: ProfileVersionVM;
  readonly fields: ReadonlyArray<ProfileFieldVM>;
  readonly validation: ValidationResultVM;
  readonly discrepancies: ReadonlyArray<DiscrepancyVM>;
  readonly lockAction: ActionAvailabilityVM;
  readonly pageState: PageStateVM;
}

export interface ObjectiveVM {
  readonly customerObjectiveId: string | null;
  readonly objectiveId: CustomerObjectiveId;
  readonly label: string;
  readonly explanation: string;
  readonly primaryDimension: string;
  readonly executable: boolean;
  readonly selected: boolean;
  readonly objectiveVersion: string;
  readonly catalogueVersion: string;
}

export interface ObjectiveSelectorVM {
  readonly riskProfileVersionId: string;
  readonly objectives: ReadonlyArray<ObjectiveVM>;
  readonly selectedObjectiveId: CustomerObjectiveId | null;
  readonly pageState: PageStateVM;
}

export interface OptimisationOptionVM {
  readonly value: string | number | boolean;
  readonly label: string;
}

export interface OptimisationControlVM {
  readonly controlId: string;
  readonly label: string;
  readonly controlClass: "O";
  readonly value: unknown;
  readonly options: ReadonlyArray<OptimisationOptionVM> | null;
  readonly applicability: string;
  readonly factualBoundary: string;
  readonly helpText: string | null;
  readonly action: ActionAvailabilityVM;
}

export interface ScenarioDeltaVM {
  readonly fieldId: string;
  readonly label: string;
  readonly controlClass: "O";
  readonly value: unknown;
  readonly displayValue: string;
}

export interface ScenarioVM {
  readonly scenarioId: string;
  readonly generationOrdinal: number | null;
  readonly generationVersion: string;
  readonly candidateFingerprint: string;
  readonly deltas: ReadonlyArray<ScenarioDeltaVM>;
}

export interface RejectedCombinationVM {
  readonly rejectionId: string;
  readonly candidateFingerprint: string;
  readonly category: string;
  readonly ruleId: string;
  readonly reason: string;
  readonly candidate: Readonly<Record<string, unknown>>;
}

export interface ScenarioExplorationVM {
  readonly customerObjectiveId: string;
  readonly explorationFingerprint: string;
  readonly generationVersion: string;
  readonly scenarios: ReadonlyArray<ScenarioVM>;
  readonly rejections: ReadonlyArray<RejectedCombinationVM>;
  readonly pageState: PageStateVM;
}

export interface MarketRouteVM {
  readonly marketRouteId: string;
  readonly routeKey: string;
  readonly displayName: string;
  readonly providerKey: string;
  readonly channelKey: string;
  readonly environment: ApplicationEnvironment;
  readonly adapterVersion: string;
  readonly mappingVersion: string;
  readonly certificationState: string | null;
}

export interface PricingVM {
  readonly annualCashPremiumPence: Pence;
  readonly financeCostPence: Pence | null;
  readonly monthlyCommitmentPence: Pence | null;
  readonly totalPayablePence: Pence | null;
}

export interface ExcessVM {
  readonly compulsoryExcessPence: Pence;
  readonly voluntaryExcessPence: Pence;
  readonly totalExcessExposurePence: Pence | null;
}

export interface NormalisedQuoteVM {
  readonly normalisedQuoteId: string;
  readonly quoteRequestId: string;
  readonly scenarioId: string;
  readonly marketRoute: MarketRouteVM;
  readonly comparisonState: ComparisonState;
  readonly comparisonReason: string | null;
  readonly ordinal: number | null;
  readonly objectiveMetric: string | null;
  readonly objectiveMetricValuePence: Pence | null;
  readonly pricing: PricingVM;
  readonly excess: ExcessVM;
  readonly normalisationVersion: string;
  readonly eligible: boolean;
  readonly exclusionReason: string | null;
  readonly openAction: ActionAvailabilityVM;
}

export interface QuoteRouteFailureVM {
  readonly marketRouteId: string | null;
  readonly routeKey: string | null;
  readonly reason: string;
  readonly retryable: boolean;
}

export interface QuoteComparisonVM {
  readonly objective: ObjectiveVM;
  readonly directlyComparable: ReadonlyArray<NormalisedQuoteVM>;
  readonly notComparable: ReadonlyArray<NormalisedQuoteVM>;
  readonly unavailableRoutes: ReadonlyArray<QuoteRouteFailureVM>;
  readonly pageState: PageStateVM;
}

export interface ResultReasonVM {
  readonly reasonId: string;
  readonly title: string;
  readonly detail: string;
  readonly controlId: string | null;
  readonly controlClass: ControlClass | null;
}

export interface IntegrityVM {
  readonly outcome: "PASS" | "BLOCKED" | "INFORMATIONAL" | "UNKNOWN";
  readonly ruleVersion: string | null;
  readonly reasons: ReadonlyArray<string>;
}

export interface HandoffVM {
  readonly action: ActionAvailabilityVM;
  readonly label: string | null;
  readonly disclosure: string;
}

export interface ResultDetailVM {
  readonly resultSetId: string;
  readonly sourceRecommendationSetId: string;
  readonly objective: ObjectiveVM;
  readonly surfacedResult: NormalisedQuoteVM | null;
  readonly alternatives: ReadonlyArray<NormalisedQuoteVM>;
  readonly excluded: ReadonlyArray<NormalisedQuoteVM>;
  readonly whyThisSurfaced: ReadonlyArray<ResultReasonVM>;
  readonly integrity: IntegrityVM;
  readonly handoff: HandoffVM;
  readonly pageState: PageStateVM;
}

export interface AuditEventVM {
  readonly auditEventId: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly occurredAt: IsoDateTime;
  readonly summary: string;
}

export interface LineageNodeVM {
  readonly nodeId: string;
  readonly kind:
    | "PROFILE"
    | "PROFILE_VERSION"
    | "OBJECTIVE"
    | "SCENARIO"
    | "MARKET_ROUTE"
    | "QUOTE_REQUEST"
    | "RAW_PROVIDER_RESPONSE"
    | "NORMALISED_QUOTE"
    | "RECOMMENDATION_SET"
    | "EXPLANATION"
    | "SELECTION"
    | "FINAL_INTEGRITY"
    | "COMPLETION";
  readonly label: string;
  readonly status: StatusVM | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface LineageExplorerVM {
  readonly selectionId: string;
  readonly nodes: ReadonlyArray<LineageNodeVM>;
  readonly pageState: PageStateVM;
}

export interface AuditTimelineVM {
  readonly profileId: string;
  readonly events: ReadonlyArray<AuditEventVM>;
  readonly pageState: PageStateVM;
}

export interface ApiErrorDTO {
  readonly error: string;
  readonly message?: string;
  readonly issues?: ReadonlyArray<string>;
  readonly signals?: ReadonlyArray<unknown>;
  readonly selectionId?: string;
}
