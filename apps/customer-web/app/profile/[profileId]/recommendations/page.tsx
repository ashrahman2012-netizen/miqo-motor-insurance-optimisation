"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../lib";

function money(value:number|null|undefined){
  return value===null||value===undefined
    ?"Not available"
    :new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value/100);
}

export default function Sprint4Recommendations({params}:{params:Promise<{profileId:string}>}){
  const {profileId}=use(params);
  const [versionId,setVersionId]=useState("");
  const [objectiveId,setObjectiveId]=useState("LOWEST_ANNUAL_PREMIUM");
  const [objective,setObjective]=useState<any>(null);
  const [exploration,setExploration]=useState<any>(null);
  const [routeQuotes,setRouteQuotes]=useState<any>(null);
  const [recommendation,setRecommendation]=useState<any>(null);
  const [explanation,setExplanation]=useState<any>(null);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{
    const response=await fetch(API_URL+"/profiles/"+profileId);
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to load profile");return;}
    const locked=[...(body.versions??[])].reverse().find((item:any)=>item.status==="LOCKED");
    if(!locked){setError("Sprint 4 optimisation requires a LOCKED RiskProfileVersion.");return;}
    setVersionId(locked.versionId);

    const existing=await fetch(API_URL+"/profile-versions/"+locked.versionId+"/customer-objectives");
    if(existing.ok){
      const existingBody=await existing.json();
      const selected=(existingBody.items??[]).find((item:any)=>item.objectiveId==="LOWEST_ANNUAL_PREMIUM");
      if(selected)setObjective(selected);
    }
  })().catch(error=>setError(String(error)))},[profileId]);

  async function saveObjective(){
    if(!versionId)return;
    setBusy("objective");setError("");
    const response=await fetch(API_URL+"/profile-versions/"+versionId+"/customer-objectives",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({objectiveId}),
    });
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to save customer objective");setBusy("");return;}
    setObjective(body.item);
    setExploration(null);setRouteQuotes(null);setRecommendation(null);setExplanation(null);
    setBusy("");
  }

  async function generateExploration(){
    if(!objective)return;
    setBusy("exploration");setError("");
    const response=await fetch(API_URL+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({choices:{
        voluntary_excess:[250,500],
        payment_structure:["ANNUAL"],
        telematics_preference:[false,true],
      }}),
    });
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to generate scenario exploration");setBusy("");return;}
    setExploration(body);setRouteQuotes(null);setRecommendation(null);setExplanation(null);setBusy("");
  }

  async function runRoutes(){
    if(!objective||!exploration)return;
    setBusy("routes");setError("");
    const base=API_URL+"/customer-objectives/"+objective.customerObjectiveId+
      "/scenario-explorations/"+encodeURIComponent(exploration.explorationFingerprint);
    const response=await fetch(base+"/market-route-quotes",{method:"POST"});
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to run synthetic market routes");setBusy("");return;}
    setRouteQuotes(body);setRecommendation(null);setExplanation(null);setBusy("");
  }

  async function buildRecommendation(){
    if(!objective||!exploration)return;
    setBusy("recommendation");setError("");
    const base=API_URL+"/customer-objectives/"+objective.customerObjectiveId+
      "/scenario-explorations/"+encodeURIComponent(exploration.explorationFingerprint);
    const response=await fetch(base+"/recommendations",{method:"POST"});
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to build recommendation");setBusy("");return;}
    const explanationResponse=await fetch(API_URL+"/recommendations/"+encodeURIComponent(body.recommendationSetId)+"/explanation");
    const explanationBody=await explanationResponse.json();
    if(!explanationResponse.ok){
      setError(explanationBody.error??"Unable to load recommendation explanation");
      setBusy("");
      return;
    }
    setRecommendation(body);setExplanation(explanationBody);setBusy("");
  }

  async function selectRecommendation(){
    if(!recommendation||!versionId)return;
    setBusy("selection");setError("");
    const shortlistResponse=await fetch(API_URL+"/profile-versions/"+versionId+"/shortlists",{method:"POST"});
    const shortlistBody=await shortlistResponse.json();
    if(!shortlistResponse.ok){setError(shortlistBody.error??"Unable to create selection shortlist");setBusy("");return;}
    const eligible=shortlistBody.entries?.some(
      (entry:any)=>entry.normalisedQuoteId===recommendation.surfacedNormalisedQuoteId
    );
    if(!eligible){
      setError("Surfaced recommendation is not eligible for final selection.");
      setBusy("");
      return;
    }
    const response=await fetch(API_URL+"/shortlists/"+shortlistBody.shortlistId+"/selections",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({normalisedQuoteId:recommendation.surfacedNormalisedQuoteId}),
    });
    const body=await response.json();
    if(!response.ok){setError(body.error??"Final selection failed");setBusy("");return;}
    location.href="/profile/"+profileId+"/completion?selectionId="+encodeURIComponent(body.selectionId);
  }

  return <main style={{maxWidth:980,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · Sprint 4 · S4-G14 · {profileId}</p>
    <h1>Customer objective optimisation</h1>
    <p><strong>SYNTHETIC PROTOTYPE ONLY.</strong> Explore legitimate O-class choices across synthetic market routes. Locked facts are not changed.</p>
    <p>Source: <strong id="sp4-source-version">{versionId?"LOCKED · "+versionId:"Loading locked profile…"}</strong></p>
    {error&&<p role="alert">{error}</p>}

    <section>
      <h2>1. Choose customer objective</h2>
      <label>Customer objective<br/>
        <select aria-label="Customer objective" value={objectiveId} onChange={event=>setObjectiveId(event.target.value)}>
          <option value="LOWEST_ANNUAL_PREMIUM">Lowest annual premium</option>
          <option value="LOWEST_MONTHLY_COMMITMENT">Lowest monthly commitment</option>
          <option value="LOWEST_FINANCE_COST">Lowest finance cost</option>
          <option value="LOWER_EXCESS_EXPOSURE">Lower excess exposure</option>
        </select>
      </label>{" "}
      <button disabled={!versionId||Boolean(busy)} onClick={saveObjective}>
        {busy==="objective"?"Saving…":"Save customer objective"}
      </button>
      {objective&&<p id="sp4-objective-state">
        Persisted objective: <strong>{objective.objectiveId}</strong> · {objective.objectiveVersion} · {objective.catalogueVersion}
      </p>}
    </section>

    {objective&&<section>
      <h2>2. Explore multiple legitimate choices</h2>
      <p>The bounded browser proof explores voluntary excess £250/£500, annual payment, and telematics false/true. The Cartesian exploration therefore produces four O-only candidates.</p>
      <button disabled={Boolean(busy)} onClick={generateExploration}>
        {busy==="exploration"?"Generating…":"Generate multi-scenario exploration"}
      </button>
      {exploration&&<>
        <p>Exploration fingerprint: <span id="sp4-exploration-fingerprint">{exploration.explorationFingerprint}</span></p>
        <p>Accepted scenarios: <strong id="sp4-scenario-count">{exploration.items?.length??0}</strong></p>
        <div id="sp4-scenarios">{(exploration.items??[]).map((item:any)=><article key={item.scenarioId} className="sp4-scenario">
          <h3>Scenario {item.generationOrdinal}</h3>
          <p>{item.scenarioId}</p>
          <ul>{item.deltas.map((delta:any)=><li key={delta.fieldId}>
            {delta.fieldId} = {JSON.stringify(delta.value)} <strong>[{delta.controlClass}]</strong>
          </li>)}</ul>
        </article>)}</div>
        {(exploration.rejections??[]).length>0&&<p id="sp4-rejection-count">Rejected candidates: {exploration.rejections.length}</p>}
      </>}
    </section>}

    {exploration&&<section>
      <h2>3. Run synthetic market routes</h2>
      <button disabled={Boolean(busy)} onClick={runRoutes}>
        {busy==="routes"?"Running…":"Run synthetic market routes"}
      </button>
      {routeQuotes&&<dl id="sp4-route-summary">
        <dt>Scenario count</dt><dd>{routeQuotes.scenarioCount}</dd>
        <dt>Market route count</dt><dd id="sp4-route-count">{routeQuotes.marketRouteCount}</dd>
        <dt>Quote count</dt><dd id="sp4-quote-count">{routeQuotes.quoteCount}</dd>
      </dl>}
    </section>}

    {routeQuotes&&<section>
      <h2>4. Explainable recommendation</h2>
      <button disabled={Boolean(busy)} onClick={buildRecommendation}>
        {busy==="recommendation"?"Analysing…":"Build recommendation"}
      </button>
      {recommendation&&<>
        <p>Recommendation set: <span id="sp4-recommendation-set-id">{recommendation.recommendationSetId}</span></p>
        <p>Objective: <strong id="sp4-recommendation-objective">{recommendation.objectiveId}</strong></p>
        <p>Rule version: <span id="sp4-recommendation-rule">{recommendation.recommendationRuleVersion}</span></p>
        <p>Surfaced quote: <span id="sp4-surfaced-quote">{recommendation.surfacedNormalisedQuoteId}</span></p>
        <ol id="sp4-ranked-quotes">{(recommendation.eligible??[]).map((item:any)=><li key={item.normalisedQuoteId}>
          #{item.ordinal} · {item.normalisedQuoteId} · {item.objectiveMetric}: {money(item.objectiveMetricValuePence)}
        </li>)}</ol>
      </>}
      {explanation&&<section id="sp4-explanation">
        <h3>Why this recommendation was surfaced</h3>
        <p>Explanation rule: <span id="sp4-explanation-rule">{explanation.explanationRuleVersion}</span></p>
        <ul id="sp4-material-reasons">{(explanation.materialReasons??[]).map((reason:any,index:number)=>
          <li key={index}>{typeof reason==="string"?reason:JSON.stringify(reason)}</li>
        )}</ul>
        <ul id="sp4-control-explanations">{(explanation.controls??[]).map((control:any)=>
          <li key={control.explanationId}>{control.fieldOrControl} · {control.classification} · customer can change: {String(control.customerCanChange)}</li>
        )}</ul>
        <button disabled={Boolean(busy)} onClick={selectRecommendation}>
          {busy==="selection"?"Running final integrity…":"Select recommended quote & run final integrity"}
        </button>
      </section>}
    </section>}

    <p><strong>No policy purchase, payment or binding is available in this prototype.</strong></p>
  </main>;
}
