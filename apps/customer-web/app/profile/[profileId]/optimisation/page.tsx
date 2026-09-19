"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../lib";

type LockedVersion={versionId:string;versionNo:number;status:string};

export default function OptimisationPreferences({params}:{params:Promise<{profileId:string}>}){
  const {profileId}=use(params);
  const [version,setVersion]=useState<LockedVersion|null>(null);
  const [voluntaryExcess,setVoluntaryExcess]=useState("500");
  const [paymentStructure,setPaymentStructure]=useState("ANNUAL");
  const [policyStartDate,setPolicyStartDate]=useState("");
  const [telematics,setTelematics]=useState(false);
  const [namedDrivers,setNamedDrivers]=useState("");
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{(async()=>{
    const response=await fetch(API_URL+"/profiles/"+profileId);
    const data=await response.json();
    const locked=[...(data.versions??[])].reverse().find((item:any)=>item.status==="LOCKED");
    if(!locked){setError("C-08 requires an already LOCKED RiskProfileVersion.");return;}
    setVersion(locked);
    const existing=await fetch(API_URL+"/profile-versions/"+locked.versionId+"/optimisation-preferences");
    if(existing.ok){
      const body=await existing.json();
      for(const item of body.items??[]){
        if(item.key==="voluntary_excess")setVoluntaryExcess(String(item.value));
        if(item.key==="payment_structure")setPaymentStructure(String(item.value));
        if(item.key==="policy_start_date")setPolicyStartDate(String(item.value));
        if(item.key==="telematics_preference")setTelematics(Boolean(item.value));
        if(item.key==="genuine_named_driver_inclusion")setNamedDrivers((item.value??[]).join(", "));
      }
    }
  })().catch(error=>setError(String(error)))},[profileId]);

  async function save(){
    if(!version)return;
    setSaving(true);setError("");
    const drivers=namedDrivers.split(",").map(value=>value.trim()).filter(Boolean);
    const payload:any={
      voluntary_excess:Number(voluntaryExcess),
      payment_structure:paymentStructure,
      telematics_preference:telematics,
    };
    if(policyStartDate)payload.policy_start_date=policyStartDate;
    if(drivers.length)payload.genuine_named_driver_inclusion=drivers;
    const response=await fetch(API_URL+"/profile-versions/"+version.versionId+"/optimisation-preferences",{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),
    });
    if(!response.ok){
      const body=await response.json().catch(()=>({error:"Unable to save preferences"}));
      setError(body.error??"Unable to save preferences");setSaving(false);return;
    }
    location.href="/profile/"+profileId+"/optimisation/scenarios";
  }

  return <main style={{maxWidth:800,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · C-08 · {profileId}</p>
    <h1>Optimisation preferences</h1>
    <p><strong>CHOICES ONLY.</strong> These controls may change quote choices. Your locked factual profile is not editable here.</p>
    <p id="locked-version">Source: {version?"LOCKED RiskProfileVersion "+version.versionNo+" · "+version.versionId:"Loading locked profile…"}</p>
    {error&&<p role="alert">{error}</p>}
    <section style={{border:"1px solid #bbb",padding:16,margin:"20px 0"}}>
      <h2>Sprint 4 multi-scenario optimisation</h2>
      <p>Choose an explicit customer objective, explore multiple O-only scenarios, run synthetic market routes, and review an explainable recommendation.</p>
      <button disabled={!version} onClick={()=>location.href="/profile/"+profileId+"/recommendations"}>
        Open Sprint 4 customer objective journey
      </button>
    </section>
    <label>Voluntary excess<br/>
      <select aria-label="Voluntary excess" value={voluntaryExcess} onChange={event=>setVoluntaryExcess(event.target.value)}>
        <option value="250">£250</option><option value="500">£500</option><option value="750">£750</option>
      </select>
    </label><br/><br/>
    <label>Payment structure<br/>
      <select aria-label="Payment structure" value={paymentStructure} onChange={event=>setPaymentStructure(event.target.value)}>
        <option value="ANNUAL">Annual</option><option value="MONTHLY">Monthly</option>
      </select>
    </label><br/><br/>
    <label>Policy start date<br/>
      <input aria-label="Policy start date" type="date" value={policyStartDate} onChange={event=>setPolicyStartDate(event.target.value)}/>
    </label><br/><br/>
    <label><input aria-label="Telematics preference" type="checkbox" checked={telematics} onChange={event=>setTelematics(event.target.checked)}/> Consider telematics</label><br/><br/>
    <label>Genuine named driver IDs (optional, comma separated)<br/>
      <input aria-label="Genuine named driver IDs" value={namedDrivers} onChange={event=>setNamedDrivers(event.target.value)} placeholder="Only drivers already present in the locked profile"/>
    </label><br/><br/>
    <button disabled={!version||saving} onClick={save}>{saving?"Saving…":"Save preferences & preview scenarios"}</button>
  </main>;
}
