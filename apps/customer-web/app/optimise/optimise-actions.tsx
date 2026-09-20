"use client";

import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import type {ObjectiveVM,OptimisationControlVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";
import styles from "./optimise.module.css";

async function body(response:Response){
  return response.json().catch(()=>({}));
}

export function ObjectiveCards({
  profileId,versionId,objectives,
}:{
  profileId:string;versionId:string;objectives:ReadonlyArray<ObjectiveVM>;
}){
  const router=useRouter();
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  async function choose(objective:ObjectiveVM){
    if(!objective.executable)return;
    setBusy(objective.objectiveId);setError("");
    try{
      const response=await fetch(API_URL+`/profile-versions/${encodeURIComponent(versionId)}/customer-objectives`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({objectiveId:objective.objectiveId}),
      });
      const payload=await body(response);
      if(!response.ok)throw new Error(payload.error??"Unable to persist customer objective");
      const params=new URLSearchParams({profileId,customerObjectiveId:payload.item.customerObjectiveId});
      router.replace("/optimise?"+params.toString());
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy("");}
  }
  return <div>
    <div className={styles.objectiveGrid}>
      {objectives.map(objective=><button
        key={objective.objectiveId}
        type="button"
        className={objective.selected?styles.objectiveCard+" "+styles.objectiveSelected:styles.objectiveCard}
        disabled={!objective.executable||Boolean(busy)}
        aria-pressed={objective.selected}
        onClick={()=>choose(objective)}
      >
        <span className={styles.objectiveIcon} aria-hidden="true">{objective.label.slice(0,1)}</span>
        <span className={styles.objectiveCopy}>
          <strong>{objective.label}</strong>
          <span>{objective.explanation}</span>
          <small>{objective.executable?"Executable objective":"Dormant — methodology not approved"}</small>
        </span>
        <span className={styles.objectiveState}>{objective.selected?"●":objective.executable?"○":"—"}</span>
      </button>)}
    </div>
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}

function allowedNumbers(control:OptimisationControlVM|undefined){
  return (control?.options??[]).map(item=>item.value).filter((value):value is number=>typeof value==="number");
}
function allowedStrings(control:OptimisationControlVM|undefined){
  return (control?.options??[]).map(item=>item.value).filter((value):value is string=>typeof value==="string");
}

export function ScenarioControls({
  profileId,customerObjectiveId,controls,
}:{
  profileId:string;
  customerObjectiveId:string|null;
  controls:ReadonlyArray<OptimisationControlVM>;
}){
  const router=useRouter();
  const byId=useMemo(()=>new Map(controls.map(control=>[control.controlId,control])),[controls]);
  const excessOptions=allowedNumbers(byId.get("voluntary_excess"));
  const paymentOptions=allowedStrings(byId.get("payment_structure"));
  const driverOptions=allowedStrings(byId.get("genuine_named_driver_inclusion"));
  const vehicleOptions=allowedStrings(byId.get("candidate_vehicle"));

  const defaultExcess=excessOptions.filter(value=>value===250||value===500);
  const [excesses,setExcesses]=useState<number[]>(defaultExcess.length?defaultExcess:excessOptions.slice(0,1));
  const [payment,setPayment]=useState(paymentOptions.includes("ANNUAL")?"ANNUAL":paymentOptions[0]??"");
  const [telematics,setTelematics]=useState<"EITHER"|"YES"|"NO">("EITHER");
  const [startDate,setStartDate]=useState("");
  const [namedDriver,setNamedDriver]=useState("");
  const [candidateVehicle,setCandidateVehicle]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  function toggleExcess(value:number){
    setExcesses(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value].sort((a,b)=>a-b));
  }

  async function generate(){
    if(!customerObjectiveId)return;
    if(excessOptions.length&&excesses.length===0){setError("Select at least one voluntary-excess choice.");return;}
    setBusy(true);setError("");
    try{
      const choices:Record<string,unknown[]>= {};
      if(excesses.length)choices.voluntary_excess=excesses;
      if(payment)choices.payment_structure=[payment];
      choices.telematics_preference=telematics==="EITHER"?[false,true]:[telematics==="YES"];
      if(startDate)choices.policy_start_date=[startDate];
      if(namedDriver)choices.genuine_named_driver_inclusion=[[namedDriver]];
      if(candidateVehicle)choices.candidate_vehicle=[candidateVehicle];

      const response=await fetch(API_URL+`/customer-objectives/${encodeURIComponent(customerObjectiveId)}/scenario-explorations`,{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({choices}),
      });
      const payload=await body(response);
      if(!response.ok)throw new Error(payload.error??"Unable to generate scenario exploration");
      const params=new URLSearchParams({profileId,customerObjectiveId,explorationFingerprint:payload.explorationFingerprint});
      router.replace("/optimise?"+params.toString());
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }

  const control=(id:string)=>byId.get(id);
  return <div>
    <div className={styles.controlGrid}>
      <fieldset className={styles.controlCard} disabled={!customerObjectiveId||control("payment_structure")?.action.state!=="AVAILABLE"}>
        <legend>Payment structure <span>O</span></legend>
        <select aria-label="Payment structure" value={payment} onChange={event=>setPayment(event.target.value)}>
          {paymentOptions.map(value=><option key={value} value={value}>{value==="ANNUAL"?"Annual":"Monthly"}</option>)}
        </select>
        <small>{control("payment_structure")?.factualBoundary}</small>
      </fieldset>

      <fieldset className={styles.controlCard} disabled={!customerObjectiveId||control("voluntary_excess")?.action.state!=="AVAILABLE"}>
        <legend>Voluntary excess <span>O</span></legend>
        <div className={styles.checkboxRow}>
          {excessOptions.map(value=><label key={value}><input aria-label={"Voluntary excess £"+value} type="checkbox" checked={excesses.includes(value)} onChange={()=>toggleExcess(value)}/><span>£{value}</span></label>)}
        </div>
        <small>{control("voluntary_excess")?.factualBoundary}</small>
      </fieldset>

      <fieldset className={styles.controlCard} disabled={!customerObjectiveId||control("policy_start_date")?.action.state!=="AVAILABLE"}>
        <legend>Policy start date <span>O</span></legend>
        <input aria-label="Policy start date choice" type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/>
        <small>Optional. A supplied date must be a genuine customer timing choice.</small>
      </fieldset>

      <fieldset className={styles.controlCard} disabled={!customerObjectiveId||control("telematics_preference")?.action.state!=="AVAILABLE"}>
        <legend>Telematics preference <span>O</span></legend>
        <select aria-label="Telematics preference choices" value={telematics} onChange={event=>setTelematics(event.target.value as "EITHER"|"YES"|"NO")}>
          <option value="EITHER">Either — explore both</option>
          <option value="NO">No telematics</option>
          <option value="YES">Telematics accepted</option>
        </select>
        <small>{control("telematics_preference")?.factualBoundary}</small>
      </fieldset>

      <fieldset className={styles.controlCard} disabled={!customerObjectiveId||control("genuine_named_driver_inclusion")?.action.state!=="AVAILABLE"}>
        <legend>Named-driver option <span>O</span></legend>
        <select aria-label="Named-driver choice" value={namedDriver} onChange={event=>setNamedDriver(event.target.value)}>
          <option value="">Do not vary</option>
          {driverOptions.map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <small>{control("genuine_named_driver_inclusion")?.action.reason??control("genuine_named_driver_inclusion")?.factualBoundary}</small>
      </fieldset>

      <fieldset className={styles.controlCard} disabled={!customerObjectiveId||control("candidate_vehicle")?.action.state!=="AVAILABLE"}>
        <legend>Candidate vehicle <span>O</span></legend>
        <select aria-label="Candidate vehicle choice" value={candidateVehicle} onChange={event=>setCandidateVehicle(event.target.value)}>
          <option value="">Not varied</option>
          {vehicleOptions.map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <small>{control("candidate_vehicle")?.action.reason??control("candidate_vehicle")?.factualBoundary}</small>
      </fieldset>
    </div>
    <div className={styles.generateRow}>
      <div><strong>Change choices, not facts.</strong><span> F/V/D/I remain outside this control surface. Scenario deltas are O-class only.</span></div>
      <button className={styles.generateButton} onClick={generate} disabled={!customerObjectiveId||busy}>{busy?"Generating…":"Generate scenarios"}</button>
    </div>
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}
