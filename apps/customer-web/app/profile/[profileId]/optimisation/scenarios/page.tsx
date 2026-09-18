"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../lib";

export default function ScenarioPreview({params}:{params:Promise<{profileId:string}>}){
  const {profileId}=use(params);
  const [versionId,setVersionId]=useState("");
  const [preferences,setPreferences]=useState<any[]>([]);
  const [scenario,setScenario]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [signals,setSignals]=useState<any[]>([]);

  useEffect(()=>{(async()=>{
    const profile=await (await fetch(API_URL+"/profiles/"+profileId)).json();
    const locked=[...(profile.versions??[])].reverse().find((item:any)=>item.status==="LOCKED");
    if(!locked){setError("C-09 requires a LOCKED RiskProfileVersion.");return;}
    setVersionId(locked.versionId);
    const pref=await (await fetch(API_URL+"/profile-versions/"+locked.versionId+"/optimisation-preferences")).json();
    setPreferences(pref.items??[]);
    const generated=await fetch(API_URL+"/profile-versions/"+locked.versionId+"/scenarios/generated");
    if(generated.ok){
      const body=await generated.json();
      if(body.items?.length)setScenario(body.items[0]);
    }
  })().catch(error=>setError(String(error)))},[profileId]);

  async function generate(){
    setBusy(true);setError("");
    const response=await fetch(API_URL+"/profile-versions/"+versionId+"/scenarios/generate",{method:"POST"});
    const body=await response.json();
    if(!response.ok){setError(body.error??"Scenario generation failed");setBusy(false);return;}
    setScenario(body.items[0]);setBusy(false);
  }

  async function quote(){
    if(!scenario)return;
    setBusy(true);setError("");setSignals([]);
    const prepared=await fetch(API_URL+"/scenarios/"+scenario.scenarioId+"/quote-requests",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"}),
    });
    const preparedBody=await prepared.json();
    if(!prepared.ok){
      setSignals(preparedBody.signals??[]);
      setError(preparedBody.error??"Pre-quote integrity blocked");
      setBusy(false);return;
    }
    const executed=await fetch(API_URL+"/quote-requests/"+preparedBody.quoteRequestId+"/execute",{method:"POST"});
    const executedBody=await executed.json();
    if(!executed.ok){setError(executedBody.error??"Synthetic provider execution failed");setBusy(false);return;}
    const rawId=executedBody.item.rawProviderResponseId;
    const normalised=await fetch(API_URL+"/raw-provider-responses/"+rawId+"/normalise",{method:"POST"});
    const normalisedBody=await normalised.json();
    if(!normalised.ok){setError(normalisedBody.error??"Normalisation failed");setBusy(false);return;}
    location.href="/profile/"+profileId+"/quotes?rawProviderResponseId="+encodeURIComponent(rawId)+"&quoteRequestId="+encodeURIComponent(preparedBody.quoteRequestId);
  }

  return <main style={{maxWidth:860,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · C-09 · {profileId}</p>
    <h1>Scenario preview</h1>
    <p>Scenarios may contain <strong>O-class deltas only</strong>. Locked factual profile data remains unchanged.</p>
    <p>Source RiskProfileVersion: <span id="scenario-source-version">{versionId||"…"}</span></p>
    <h2>Saved optimisation preferences</h2>
    <ul id="saved-preferences">{preferences.map(item=><li key={item.key}>{item.key}: {JSON.stringify(item.value)}</li>)}</ul>
    {error&&<p role="alert">{error}</p>}
    {signals.length>0&&<ul id="integrity-signals">{signals.map((signal:any)=><li key={signal.ruleId}>{signal.ruleId}</li>)}</ul>}
    {!scenario?<button disabled={!versionId||busy||preferences.length===0} onClick={generate}>{busy?"Generating…":"Generate scenario preview"}</button>:
      <section id="scenario-preview">
        <h2>Generated scenario</h2>
        <p>Scenario ID: <span id="scenario-id">{scenario.scenarioId}</span></p>
        <p>Generation version: {scenario.generationVersion}</p>
        <ul id="scenario-deltas">{scenario.deltas.map((delta:any)=><li key={delta.fieldId}>{delta.fieldId} = {JSON.stringify(delta.value)} <strong>[{delta.controlClass}]</strong></li>)}</ul>
        <button disabled={busy} onClick={quote}>{busy?"Running synthetic quote…":"Run synthetic quote"}</button>
      </section>}
  </main>;
}
