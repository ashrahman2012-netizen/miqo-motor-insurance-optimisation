"use client";
import {use,useEffect,useState} from "react";
import {adminApiFetch} from "../../../../admin-api";

function value(input:unknown){return typeof input==="string"?input:JSON.stringify(input);}

export default function Sprint4SelectionTrace({params}:{params:Promise<{selectionId:string}>}){
  const {selectionId}=use(params);
  const [trace,setTrace]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{
    const response=await adminApiFetch("/selections/"+selectionId+"/sp4-trace");
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to load Sprint 4 trace");return;}
    setTrace(body);
  })().catch(error=>setError(String(error)))},[selectionId]);

  return <main style={{maxWidth:1180,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Admin · Sprint 4 · S4-G15</p>
    <h1>Sprint 4 end-to-end optimisation trace</h1>
    {error&&<p role="alert">{error}</p>}
    {!trace&&!error&&<p>Loading trace…</p>}
    {trace&&<>
      <ol id="sp4-admin-trace">
        <li>
          Profile <strong id="sp4-trace-profile-id">{trace.profile.profileId}</strong>
        </li>
        <li>
          RiskProfileVersion v{trace.riskProfileVersion.versionNo} ·
          <strong id="sp4-trace-profile-status"> {trace.riskProfileVersion.status}</strong> ·
          <span id="sp4-trace-version-id"> {trace.riskProfileVersion.riskProfileVersionId}</span>
        </li>
        <li>
          CustomerObjective ·
          <strong id="sp4-trace-objective-id"> {trace.customerObjective.objectiveId}</strong>
          <ul>
            <li>Customer objective ID: {trace.customerObjective.customerObjectiveId}</li>
            <li>Objective version: <span id="sp4-trace-objective-version">{trace.customerObjective.objectiveVersion}</span></li>
            <li>Catalogue version: <span id="sp4-trace-catalogue-version">{trace.customerObjective.catalogueVersion}</span></li>
            <li>Policy fingerprint: {trace.customerObjective.policyFingerprint}</li>
          </ul>
        </li>
        <li>
          Scenario exploration ·
          <span id="sp4-trace-exploration-fingerprint">{trace.exploration.explorationFingerprint}</span>
          <ul>
            <li>Generation version: <span id="sp4-trace-generation-version">{trace.exploration.generationVersion}</span></li>
            <li>Scenario count: <strong id="sp4-trace-scenario-count">{trace.exploration.scenarioCount}</strong></li>
          </ul>
          <div id="sp4-trace-scenarios">{trace.exploration.scenarios.map((scenario:any)=>
            <section key={scenario.scenarioId} className="sp4-trace-scenario">
              <h3>Scenario {scenario.generationOrdinal} · {scenario.scenarioId}</h3>
              <p>Candidate fingerprint: {scenario.candidateFingerprint}</p>
              <ul>{scenario.deltas.map((delta:any)=>
                <li key={delta.fieldId}>{delta.fieldId} = {value(delta.value)} <strong>[{delta.controlClass}]</strong></li>
              )}</ul>
            </section>
          )}</div>
        </li>
        <li>
          MarketRoute quotation evidence
          <p>Quote lineage count: <strong id="sp4-trace-quote-count">{trace.marketRouteQuotes.length}</strong></p>
          <div id="sp4-trace-route-quotes">{trace.marketRouteQuotes.map((item:any)=>
            <section key={item.evidenceFingerprint} className="sp4-trace-route-quote">
              <h3>
                MarketRoute · {item.marketRoute.routeKey} · {item.marketRoute.providerKey} · {item.marketRoute.channelKey}
              </h3>
              <ul>
                <li>Route catalogue: {item.marketRoute.routeCatalogueVersion}</li>
                <li>Adapter version: <strong>{item.marketRoute.adapterVersion}</strong></li>
                <li>Mapping version: <strong>{item.marketRoute.mappingVersion}</strong></li>
                <li>Route fingerprint: {item.marketRoute.routeFingerprint}</li>
                <li>QuoteRequest <strong>{item.quoteRequest.quoteRequestId}</strong> · orchestration {item.quoteRequest.orchestrationVersion}</li>
                <li>Request fingerprint: {item.quoteRequest.requestFingerprint}</li>
                <li>RawProviderResponse <strong>{item.rawProviderResponse.rawProviderResponseId}</strong> · SHA-256 {item.rawProviderResponse.payloadSha256}</li>
                <li>NormalisedQuote <strong>{item.normalisedQuote.normalisedQuoteId}</strong> · <span className="sp4-normalisation-version">{item.normalisedQuote.normalisationVersion}</span> · {item.normalisedQuote.comparisonState}</li>
                <li>Recommendation evidence: {item.evidenceStatus}{item.ordinal?" · #"+item.ordinal:""}{item.exclusionReason?" · "+item.exclusionReason:""}</li>
              </ul>
            </section>
          )}</div>
        </li>
        <li>
          RecommendationSet ·
          <strong id="sp4-trace-recommendation-set-id"> {trace.recommendation.recommendationSetId}</strong>
          <ul>
            <li>Recommendation rule: <span id="sp4-trace-recommendation-rule">{trace.recommendation.recommendationRuleVersion}</span></li>
            <li>Recommendation fingerprint: {trace.recommendation.recommendationFingerprint}</li>
            <li>Surfaced quote: <span id="sp4-trace-surfaced-quote">{trace.recommendation.surfacedNormalisedQuoteId}</span></li>
            <li>Explanation rule: <span id="sp4-trace-explanation-rule">{trace.recommendation.explanation.explanationRuleVersion}</span></li>
            <li>Explanation fingerprint: {trace.recommendation.explanation.explanationFingerprint}</li>
          </ul>
        </li>
        <li>
          Selection · <strong id="sp4-trace-selection-id">{trace.selection.selectionId}</strong> · {trace.selection.status}
          <p>Exact Recommendation→Selection audit link: <span id="sp4-trace-link-audit-id">{trace.recommendationSelectionLink.auditEventId}</span></p>
        </li>
        <li>
          Final Integrity ·
          <strong id="sp4-trace-final-integrity">{trace.finalIntegrity?.outcome??"UNKNOWN"}</strong> ·
          <span id="sp4-trace-integrity-rule">{trace.finalIntegrity?.ruleVersion}</span>
        </li>
        <li>
          Completion · <strong id="sp4-trace-completion">{trace.completion?.status??"NOT COMPLETED"}</strong> ·
          {trace.completion?.dataClassification} · live provider {trace.completion?.liveProviderActivity}
        </li>
      </ol>
      <button onClick={()=>location.href="/admin/profiles/"+trace.profile.profileId+"/audit"}>Open audit history</button>
    </>}
  </main>;
}
