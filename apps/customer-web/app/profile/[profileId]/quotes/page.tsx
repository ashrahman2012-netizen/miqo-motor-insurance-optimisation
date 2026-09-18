"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../lib";

function money(value:number|null|undefined){
  return value===null||value===undefined?"Not available":new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value/100);
}

export default function QuoteComparison({params}:{params:Promise<{profileId:string}>}){
  const {profileId}=use(params);
  const [quote,setQuote]=useState<any>(null);
  const [shortlist,setShortlist]=useState<any>(null);
  const [error,setError]=useState("");
  const [selecting,setSelecting]=useState(false);
  const [signals,setSignals]=useState<any[]>([]);

  useEffect(()=>{(async()=>{
    const search=new URLSearchParams(window.location.search);
    const rawId=search.get("rawProviderResponseId")??"";
    const quoteRequestId=search.get("quoteRequestId")??"";
    if(!rawId||!quoteRequestId){setError("Missing quote lineage reference.");return;}

    const [normalisedResponse,requestResponse]=await Promise.all([
      fetch(API_URL+"/raw-provider-responses/"+encodeURIComponent(rawId)+"/normalised-quotes"),
      fetch(API_URL+"/quote-requests/"+encodeURIComponent(quoteRequestId)),
    ]);
    const normalisedBody=await normalisedResponse.json();
    const requestBody=await requestResponse.json();
    if(!normalisedResponse.ok){setError(normalisedBody.error??"Unable to load normalised quote");return;}
    if(!requestResponse.ok){setError(requestBody.error??"Unable to load quote lineage");return;}

    const selectedQuote=(normalisedBody.items??[]).at(-1)??null;
    setQuote(selectedQuote);
    const shortlistResponse=await fetch(API_URL+"/profile-versions/"+requestBody.riskProfileVersionId+"/shortlists",{method:"POST"});
    const shortlistBody=await shortlistResponse.json();
    if(!shortlistResponse.ok){setError(shortlistBody.error??"Unable to create comparison shortlist");return;}
    setShortlist(shortlistBody);
  })().catch(error=>setError(String(error)))},[]);

  async function selectQuote(){
    if(!quote||!shortlist)return;
    setSelecting(true);setError("");setSignals([]);
    const response=await fetch(API_URL+"/shortlists/"+shortlist.shortlistId+"/selections",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({normalisedQuoteId:quote.normalisedQuoteId}),
    });
    const body=await response.json();
    if(!response.ok){
      setSignals(body.signals??[]);
      setError(body.error??"Selection failed");
      setSelecting(false);
      return;
    }
    location.href="/profile/"+profileId+"/completion?selectionId="+encodeURIComponent(body.selectionId);
  }

  const eligible=Boolean(
    quote
    && shortlist?.entries?.some((entry:any)=>entry.normalisedQuoteId===quote.normalisedQuoteId)
    && quote.comparisonState==="DIRECTLY_COMPARABLE"
  );

  return <main style={{maxWidth:860,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · C-11 · {profileId}</p>
    <h1>Quote comparison</h1>
    <p>Synthetic provider results only. Premium and excess remain separate comparison dimensions.</p>
    {error&&<p role="alert">{error}</p>}
    {signals.length>0&&<ul id="final-integrity-signals">{signals.map((signal:any)=><li key={signal.ruleId}>{signal.ruleId}</li>)}</ul>}
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
      {shortlist&&<section id="shortlist-summary">
        <h3>Persisted shortlist</h3>
        <p>Shortlist ID: <span id="shortlist-id">{shortlist.shortlistId}</span></p>
        <p>Comparison rule: {shortlist.comparisonRuleVersion}</p>
        <p id="lowest-premium-marker">Lowest directly comparable premium: {shortlist.lowestDirectlyComparablePremiumId===quote.normalisedQuoteId?"this quote":"another eligible quote"}</p>
        {eligible?<button disabled={selecting} onClick={selectQuote}>{selecting?"Running final integrity…":"Select this quote"}</button>:<p id="selection-unavailable">This quote is not eligible for selection.</p>}
      </section>}
    </section>}
  </main>;
}
