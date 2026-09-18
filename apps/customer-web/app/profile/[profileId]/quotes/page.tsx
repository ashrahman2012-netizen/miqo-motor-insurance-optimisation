"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../lib";

function money(value:number|null|undefined){
  return value===null||value===undefined?"Not available":new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value/100);
}

export default function QuoteComparison({params}:{params:Promise<{profileId:string}>}){
  const {profileId}=use(params);
  const [rawId,setRawId]=useState("");
  const [quote,setQuote]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    const value=new URLSearchParams(window.location.search).get("rawProviderResponseId")??"";
    setRawId(value);
    if(!value){setError("Missing raw provider response reference.");return;}
    (async()=>{
    const response=await fetch(API_URL+"/raw-provider-responses/"+encodeURIComponent(value)+"/normalised-quotes");
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to load normalised quote");return;}
    setQuote((body.items??[]).at(-1)??null);
    })().catch(error=>setError(String(error)));
  },[]);

  return <main style={{maxWidth:860,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · C-11 · {profileId}</p>
    <h1>Quote comparison</h1>
    <p>Synthetic provider results only. Premium and excess remain separate comparison dimensions.</p>
    {error&&<p role="alert">{error}</p>}
    {!quote&&!error&&<p>Loading normalised quote…</p>}
    {quote&&<section id="quote-comparison">
      <h2>MOCK-PROVIDER-001</h2>
      <p>Comparison state: <strong id="comparison-state">{quote.comparisonState}</strong></p>
      <p id="comparison-reason">Eligibility reason: {quote.comparisonReason}</p>
      <dl>
        <dt>Annual cash premium</dt><dd id="annual-premium">{money(quote.annualCashPremiumPence)}</dd>
        <dt>Finance cost</dt><dd id="finance-cost">{money(quote.financeCostPence)}</dd>
        <dt>Compulsory excess</dt><dd id="compulsory-excess">{money(quote.compulsoryExcessPence)}</dd>
        <dt>Voluntary excess</dt><dd id="voluntary-excess">{money(quote.voluntaryExcessPence)}</dd>
      </dl>
      <p id="comparison-boundary"><strong>No universal effective-cost calculation is used.</strong> MIQO does not add premium and excess into a single ranking value.</p>
      <p>Normalisation version: {quote.normalisationVersion}</p>
    </section>}
  </main>;
}
