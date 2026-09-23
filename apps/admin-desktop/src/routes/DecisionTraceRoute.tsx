import {useEffect, useState} from "react";
import {
  Card,
  ComparisonStateBadge,
  ContentGrid,
  DefinitionList,
  FingerprintValue,
  LineageId,
  MoneyAmount,
  PageHeader,
  PageState,
  StatusBadge,
} from "@miqo/ui";
import {classifyDesktopReadFailure} from "../services/admin-profile";
import {loadDesktopDecisionTrace} from "../services/admin-decision-trace";
import type {DesktopApiTransport, DesktopDecisionTraceProof} from "../services/contracts";

function valueText(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function evidenceStatus(status: "ELIGIBLE" | "EXCLUDED") {
  return status === "ELIGIBLE"
    ? <StatusBadge status="READY" label="ELIGIBLE" />
    : <StatusBadge status="EXCLUDED" label="EXCLUDED" />;
}

export function DecisionTraceRoute({
  transport,
  selectionId,
}: {
  transport: DesktopApiTransport;
  selectionId: string;
}) {
  const [proof, setProof] = useState<DesktopDecisionTraceProof | null>(null);
  const [failure, setFailure] = useState<ReturnType<typeof classifyDesktopReadFailure> | null>(null);

  useEffect(() => {
    let active = true;
    setProof(null);
    setFailure(null);
    void loadDesktopDecisionTrace(transport, selectionId)
      .then(value => { if (active) setProof(value); })
      .catch(reason => { if (active) setFailure(classifyDesktopReadFailure(reason)); });
    return () => { active = false; };
  }, [selectionId, transport]);

  const trace = proof?.trace ?? null;
  const viewModel = proof?.viewModel ?? null;
  const finalOutcome = trace?.finalIntegrity?.outcome ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Deep decision evidence"
        title={`Selection Trace ${selectionId}`}
        description="Authoritative persisted lineage is reconstructed read-only. Desktop does not rank quotes, decide comparability, generate recommendations or evaluate integrity."
        actions={
          finalOutcome === "PASS"
            ? <StatusBadge status="PASS" label="FINAL INTEGRITY PASS" />
            : finalOutcome === "BLOCKED"
              ? <StatusBadge status="BLOCKED" label="FINAL INTEGRITY BLOCKED" />
              : <StatusBadge status="PENDING" label="INTEGRITY NOT EVALUATED" />
        }
      />

      {failure ? (
        <Card>
          <PageState state={failure.state} title={failure.title} message={failure.message} />
          <p className="desktop-technical-reference">Reference: {failure.reference}</p>
        </Card>
      ) : null}
      {!proof && !failure ? (
        <PageState state="LOADING" title="Loading decision lineage" message="Reading the authorised SP4 selection trace and linked evidence." />
      ) : null}

      {trace && viewModel ? (
        <>
          <ContentGrid columns={3}>
            <Card emphasis>
              <h2>Selection</h2>
              <DefinitionList compact items={[
                {label: "Selection ID", value: <LineageId value={trace.selection.selectionId} label="Selection ID" />},
                {label: "Status", value: trace.selection.status},
                {label: "Selected at", value: trace.selection.selectedAt},
              ]} />
            </Card>
            <Card>
              <h2>Objective</h2>
              <DefinitionList compact items={[
                {label: "Objective", value: trace.customerObjective.objectiveId},
                {label: "Objective version", value: trace.customerObjective.objectiveVersion},
                {label: "Catalogue", value: trace.customerObjective.catalogueVersion},
              ]} />
            </Card>
            <Card>
              <h2>Recommendation</h2>
              <DefinitionList compact items={[
                {label: "Set", value: <LineageId value={trace.recommendation.recommendationSetId} label="Recommendation set" />},
                {label: "Rule", value: trace.recommendation.recommendationRuleVersion},
                {label: "Surfaced quote", value: trace.recommendation.surfacedNormalisedQuoteId ?? "—"},
              ]} />
            </Card>
          </ContentGrid>

          <Card className="desktop-evidence-section">
            <h2>Selection lineage</h2>
            {viewModel.lineage?.nodes.length ? (
              <ol className="desktop-lineage-list">
                {viewModel.lineage.nodes.map(node => (
                  <li key={node.nodeId}>
                    <span className="desktop-kicker">{node.kind.replaceAll("_", " ")}</span>
                    <strong>{node.label}</strong>
                    <LineageId value={node.nodeId} label={node.kind} />
                    {node.status ? <span className="desktop-trace-meta">{node.status.label}</span> : null}
                  </li>
                ))}
              </ol>
            ) : <PageState state="EMPTY" title="No lineage" message="No selection lineage was returned." />}
          </Card>

          <Card className="desktop-evidence-section">
            <h2>Scenario exploration evidence</h2>
            <p>Generation version: <strong>{trace.exploration.generationVersion ?? "—"}</strong> · scenarios: <strong>{trace.exploration.scenarioCount}</strong></p>
            <p>Exploration fingerprint: <FingerprintValue value={trace.exploration.explorationFingerprint} /></p>
            <div className="desktop-table-scroll">
              <table className="desktop-evidence-table">
                <thead><tr><th>Scenario</th><th>Generation</th><th>Candidate fingerprint</th><th>O-class deltas supplied by trace</th></tr></thead>
                <tbody>{trace.exploration.scenarios.map(item => (
                  <tr key={item.scenarioId}>
                    <td><LineageId value={item.scenarioId} label="Scenario ID" /></td>
                    <td>#{item.generationOrdinal ?? "—"} · {item.generationVersion}</td>
                    <td><FingerprintValue value={item.candidateFingerprint} /></td>
                    <td>{item.deltas.length ? item.deltas.map(delta => `${delta.fieldId}=${valueText(delta.value)} [${delta.controlClass}]`).join("; ") : "No deltas"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>

          <Card className="desktop-evidence-section">
            <h2>Market-route, quote-request and normalised quotation evidence</h2>
            <p>Comparison states, evidence ordinals and exclusions are persisted/supplied evidence; Desktop does not calculate them.</p>
            <div className="desktop-table-scroll">
              <table className="desktop-evidence-table desktop-evidence-table--wide">
                <thead><tr><th>Scenario / route</th><th>Quote request / raw response</th><th>Normalised quotation</th><th>Premium / excess</th><th>Recommendation evidence</th></tr></thead>
                <tbody>{trace.marketRouteQuotes.map(item => (
                  <tr key={item.evidenceFingerprint}>
                    <td>
                      <LineageId value={item.scenarioId} label="Scenario ID" /><br />
                      <strong>{item.marketRoute.routeKey}</strong> · {item.marketRoute.providerKey} · {item.marketRoute.channelKey}<br />
                      <span className="desktop-trace-meta">adapter {item.marketRoute.adapterVersion} · mapping {item.marketRoute.mappingVersion}</span>
                    </td>
                    <td>
                      <LineageId value={item.quoteRequest.quoteRequestId} label="Quote request" /><br />
                      raw <LineageId value={item.rawProviderResponse.rawProviderResponseId} label="Raw provider response" /><br />
                      <FingerprintValue value={item.rawProviderResponse.payloadSha256} />
                    </td>
                    <td>
                      <LineageId value={item.normalisedQuote.normalisedQuoteId} label="Normalised quote" /><br />
                      <ComparisonStateBadge state={item.normalisedQuote.comparisonState} /><br />
                      <span className="desktop-trace-meta">{item.normalisedQuote.normalisationVersion}</span>
                    </td>
                    <td>
                      annual <MoneyAmount pence={item.normalisedQuote.annualCashPremiumPence} /><br />
                      finance <MoneyAmount pence={item.normalisedQuote.financeCostPence} /><br />
                      compulsory excess <MoneyAmount pence={item.normalisedQuote.compulsoryExcessPence} /><br />
                      voluntary excess <MoneyAmount pence={item.normalisedQuote.voluntaryExcessPence} />
                    </td>
                    <td>
                      {evidenceStatus(item.evidenceStatus)}
                      <div className="desktop-trace-meta">
                        {item.ordinal ? `Persisted ordinal #${item.ordinal}` : item.exclusionReason ?? "No ordinal supplied"}
                      </div>
                      <FingerprintValue value={item.evidenceFingerprint} />
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>

          <Card className="desktop-evidence-section">
            <h2>Recommendation and explanation evidence</h2>
            <DefinitionList items={[
              {label: "Recommendation set", value: trace.recommendation.recommendationSetId},
              {label: "Recommendation rule", value: trace.recommendation.recommendationRuleVersion},
              {label: "Recommendation fingerprint", value: <FingerprintValue value={trace.recommendation.recommendationFingerprint} />},
              {label: "Surfaced normalised quote", value: trace.recommendation.surfacedNormalisedQuoteId ?? "—"},
              {label: "Explanation rule", value: trace.recommendation.explanation.explanationRuleVersion},
              {label: "Explanation fingerprint", value: <FingerprintValue value={trace.recommendation.explanation.explanationFingerprint} />},
            ]} />
            <h3>Persisted material reasons</h3>
            <ul>{trace.recommendation.explanation.materialReasons.map(reason => (
              <li key={reason.code}><strong>{reason.code}</strong> — {reason.detail}</li>
            ))}</ul>
          </Card>

          <ContentGrid columns={2}>
            <Card className="desktop-evidence-section">
              <h2>Integrity evidence</h2>
              {trace.finalIntegrity ? (
                <>
                  <StatusBadge status={trace.finalIntegrity.outcome === "PASS" ? "PASS" : "BLOCKED"} label={trace.finalIntegrity.outcome} />
                  <DefinitionList compact items={[
                    {label: "Result ID", value: trace.finalIntegrity.finalIntegrityResultId},
                    {label: "Rule version", value: trace.finalIntegrity.ruleVersion},
                    {label: "Evidence", value: valueText(trace.finalIntegrity.evidence)},
                  ]} />
                </>
              ) : <PageState state="EMPTY" title="Not evaluated" message="No final-integrity result is persisted for this selection." />}
              <h3>Integrity / governance queue</h3>
              <ul className="desktop-trace-list">{viewModel.integrityQueue.map(item => (
                <li key={item.itemId}><strong>{item.label}: {item.status.label}</strong><span>{item.detail}</span></li>
              ))}</ul>
            </Card>
            <Card className="desktop-evidence-section">
              <h2>Current artefact</h2>
              {viewModel.currentArtefact ? (
                <DefinitionList compact items={[
                  {label: "Profile", value: viewModel.currentArtefact.profileId},
                  {label: "Profile version", value: viewModel.currentArtefact.profileVersionId},
                  {label: "Scenario", value: viewModel.currentArtefact.scenarioId ?? "—"},
                  {label: "Market route", value: viewModel.currentArtefact.marketRouteId ?? "—"},
                  {label: "Quote request", value: viewModel.currentArtefact.quoteRequestId ?? "—"},
                  {label: "Normalised quote", value: viewModel.currentArtefact.normalisedQuoteId ?? "—"},
                ]} />
              ) : null}
            </Card>
          </ContentGrid>

          <Card className="desktop-evidence-section">
            <h2>Raw provider / normalised evidence</h2>
            {viewModel.rawProviderResponse ? (
              <>
                <DefinitionList compact items={[
                  {label: "Raw response ID", value: viewModel.rawProviderResponse.rawProviderResponseId},
                  {label: "Quote request ID", value: viewModel.rawProviderResponse.quoteRequestId},
                  {label: "Provider reference", value: viewModel.rawProviderResponse.providerReference ?? "—"},
                  {label: "Payload SHA-256", value: <FingerprintValue value={viewModel.rawProviderResponse.payloadSha256} />},
                ]} />
                <details className="desktop-raw-evidence">
                  <summary>View synthetic provider payload</summary>
                  <pre>{JSON.stringify(viewModel.rawProviderResponse.payload, null, 2)}</pre>
                </details>
              </>
            ) : <PageState state="EMPTY" title="No raw response attached" message="The authoritative trace did not identify a surfaced raw provider response." />}
            {viewModel.normalisedEvidence ? (
              <div className="desktop-normalised-summary">
                <h3>Surfaced normalised evidence</h3>
                <ComparisonStateBadge state={viewModel.normalisedEvidence.comparisonState} />
                <DefinitionList compact items={[
                  {label: "Normalised quote", value: viewModel.normalisedEvidence.normalisedQuoteId},
                  {label: "Normalisation version", value: viewModel.normalisedEvidence.normalisationVersion},
                  {label: "Annual cash premium", value: <MoneyAmount pence={viewModel.normalisedEvidence.annualCashPremiumPence} />},
                  {label: "Finance cost", value: <MoneyAmount pence={viewModel.normalisedEvidence.financeCostPence} />},
                ]} />
              </div>
            ) : null}
          </Card>

          <Card className="desktop-evidence-section">
            <h2>Append-only audit timeline</h2>
            {viewModel.timeline?.events.length ? (
              <ol className="desktop-audit-list">{viewModel.timeline.events.map(event => (
                <li key={event.auditEventId}>
                  <strong>{event.summary}</strong>
                  <span><code>{event.eventType}</code> · {event.entityType} · <code>{event.entityId}</code></span>
                  <time dateTime={event.occurredAt}>{event.occurredAt}</time>
                </li>
              ))}</ol>
            ) : <PageState state="EMPTY" title="No audit events" message="No append-only audit evidence was returned for the trace profile." />}
          </Card>
        </>
      ) : null}
    </>
  );
}
