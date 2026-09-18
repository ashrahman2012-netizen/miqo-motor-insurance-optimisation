"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../lib";

function money(value:number|null|undefined){
  return value===null||value===undefined?"Not available":new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value/100);
}

export default function Completion({params}:{params:Promise<{profileId:string}>}){
  const {profileId}=use(params);
  const [selection,setSelection]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{
    const selectionId=new URLSearchParams(window.location.search).get("selectionId")??"";
    if(!selectionId){setError("Missing selection reference.");return;}
    const response=await fetch(API_URL+"/selections/"+encodeURIComponent(selectionId));
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to load completion state");return;}
    setSelection(body);
  })().catch(error=>setError(String(error)))},[]);

  return <main style={{maxWidth:860,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · C-14 / C-15 · {profileId}</p>
    <h1>Prototype completion</h1>
    {error&&<p role="alert">{error}</p>}
    {!selection&&!error&&<p>Loading final integrity result…</p>}
    {selection&&<>
      <section id="final-integrity">
        <h2>C-14 Final Integrity</h2>
        <p>Selection status: <strong id="selection-status">{selection.status}</strong></p>
        <p>Final Integrity: <strong id="final-integrity-outcome">{selection.finalIntegrity?.outcome??"UNKNOWN"}</strong></p>
        <p>Rule version: {selection.finalIntegrity?.ruleVersion}</p>
      </section>
      <section id="prototype-completion">
        <h2>C-15</h2>
        <p><strong id="completion-status">{selection.completion?.status??"NOT COMPLETED"}</strong></p>
        <dl>
          <dt>Risk Profile</dt><dd id="completion-profile-state">LOCKED</dd>
          <dt>Selected Scenario</dt><dd id="completion-scenario">{selection.scenarioId}</dd>
          <dt>Provider</dt><dd id="completion-provider">{selection.selectedQuote?.providerKey}</dd>
          <dt>Selected Premium</dt><dd id="completion-premium">{money(selection.selectedQuote?.annualCashPremiumPence)}</dd>
          <dt>Comparison State</dt><dd id="completion-comparison-state">{selection.selectedQuote?.comparisonState}</dd>
          <dt>Final Integrity</dt><dd>{selection.finalIntegrity?.outcome}</dd>
          <dt>Data Classification</dt><dd id="completion-data-classification">{selection.completion?.dataClassification}</dd>
          <dt>Live Provider Activity</dt><dd id="completion-live-provider">{selection.completion?.liveProviderActivity}</dd>
        </dl>
        <p><strong>This is synthetic prototype completion only.</strong> No policy purchase, payment or binding has occurred.</p>
      </section>
    </>}
  </main>;
}
