"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../../lib";

function value(value:unknown){return typeof value==="string"?value:JSON.stringify(value);}

export default function SelectionTrace({params}:{params:Promise<{selectionId:string}>}){
  const {selectionId}=use(params);
  const [trace,setTrace]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{
    const response=await fetch(API_URL+"/admin/selections/"+selectionId+"/trace");
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to load trace");return;}
    setTrace(body);
  })().catch(error=>setError(String(error)))},[selectionId]);

  return <main style={{maxWidth:1050,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Admin · A-07</p>
    <h1>End-to-end quote trace</h1>
    {error&&<p role="alert">{error}</p>}
    {!trace&&!error&&<p>Loading trace…</p>}
    {trace&&<>
      <ol id="end-to-end-trace">
        <li>Profile <strong>{trace.profile.profileId}</strong></li>
        <li>RiskProfileVersion v{trace.riskProfileVersion.versionNo} · <strong>{trace.riskProfileVersion.status}</strong> · {trace.riskProfileVersion.riskProfileVersionId}</li>
        <li>Optimisation Preferences<ul>{trace.optimisationPreferences.map((item:any)=><li key={item.preferenceId}>{item.key} = {value(item.value)}</li>)}</ul></li>
        <li>Scenario <strong>{trace.scenario.scenarioId}</strong><ul>{trace.scenario.deltas.map((item:any)=><li key={item.fieldId}>{item.fieldId} = {value(item.value)} [{item.controlClass}]</li>)}</ul></li>
        <li>QuoteRequest <strong>{trace.quoteRequest.quoteRequestId}</strong> · {trace.quoteRequest.providerKey} · {trace.quoteRequest.channel}</li>
        <li>RawProviderResponse <strong>{trace.rawProviderResponse.rawProviderResponseId}</strong> · SHA-256 {trace.rawProviderResponse.payloadSha256}</li>
        <li>NormalisedQuote <strong>{trace.normalisedQuote.normalisedQuoteId}</strong> · {trace.normalisedQuote.normalisationVersion} · {trace.normalisedQuote.comparisonState}</li>
        <li>Shortlist <strong>{trace.shortlist.shortlistId}</strong> · {trace.shortlist.comparisonRuleVersion}</li>
        <li>Selection <strong id="trace-selection-id">{trace.selection.selectionId}</strong> · {trace.selection.status}</li>
        <li>Final Integrity <strong id="trace-integrity-outcome">{trace.finalIntegrity?.outcome}</strong> · {trace.finalIntegrity?.ruleVersion}</li>
        <li>Completion <strong id="trace-completion-status">{trace.completion?.status??"NOT COMPLETED"}</strong></li>
      </ol>
      <button onClick={()=>location.href="/admin/profiles/"+trace.profile.profileId+"/audit"}>Open audit history</button>
    </>}
  </main>;
}
