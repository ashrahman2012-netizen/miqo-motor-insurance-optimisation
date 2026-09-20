"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import type {ActionAvailabilityVM, ProfileFieldVM, ProfileVersionStatus} from "@miqo/application-contracts";
import {API_URL} from "../lib";
import styles from "./profile.module.css";

async function responseBody(response:Response){
  return response.json().catch(()=>({}));
}

export function StartProfileButton(){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function start(){
    setBusy(true);setError("");
    try{
      const response=await fetch(API_URL+"/profiles",{method:"POST"});
      const body=await responseBody(response);
      if(!response.ok)throw new Error(body.error??"Unable to create profile");
      document.cookie=`miqos_active_profile=${encodeURIComponent(body.profileId)}; Path=/; SameSite=Lax`;
      router.push("/profile/capture?profileId="+encodeURIComponent(body.profileId));
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }
  return <div className={styles.actionBlock}>
    <button className="miqos-button miqos-button--primary" onClick={start} disabled={busy}>
      {busy?"Creating synthetic profile…":"Start synthetic profile"}
    </button>
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}

export function ProfileCaptureForm({
  profileId,
  versionId,
  status,
  fields,
}:{
  profileId:string;
  versionId:string;
  status:ProfileVersionStatus;
  fields:ReadonlyArray<ProfileFieldVM>;
}){
  const router=useRouter();
  const field=(id:string)=>fields.find(item=>item.fieldId===id);
  const [driver,setDriver]=useState(String(field("main_driver_id")?.value??""));
  const [mileage,setMileage]=useState(String(field("annual_mileage")?.value??""));
  const [licence,setLicence]=useState(String(field("licence_held_since")?.value??""));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const locked=status!=="DRAFT";

  async function save(){
    setBusy(true);setError("");
    try{
      const values:[string,unknown][]=[
        ["main_driver_id",driver.trim()],
        ["annual_mileage",Number(mileage)],
        ["licence_held_since",licence],
      ];
      if(!driver.trim()||!mileage||!Number.isFinite(Number(mileage))||Number(mileage)<=0||!licence){
        throw new Error("Complete all required factual fields before continuing.");
      }
      for(const [fieldId,value] of values){
        const response=await fetch(API_URL+`/profile-versions/${encodeURIComponent(versionId)}/facts/${fieldId}`,{
          method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({value}),
        });
        const body=await responseBody(response);
        if(!response.ok)throw new Error(body.error??"Unable to save factual profile");
      }
      document.cookie=`miqos_active_profile=${encodeURIComponent(profileId)}; Path=/; SameSite=Lax`;
      router.push("/profile/validation?profileId="+encodeURIComponent(profileId));
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }

  return <div className={styles.captureForm}>
    <label>
      <span>Main driver ID</span>
      <input aria-label="Main driver ID" value={driver} readOnly={locked} onChange={event=>setDriver(event.target.value)} />
      <small>Factual field · synthetic identifier for this controlled build.</small>
    </label>
    <label>
      <span>Annual mileage</span>
      <input aria-label="Annual mileage" inputMode="numeric" value={mileage} readOnly={locked} onChange={event=>setMileage(event.target.value)} />
      <small>Enter the factual annual mileage. Optimisation cannot alter it later.</small>
    </label>
    <label>
      <span>Licence held since</span>
      <input aria-label="Licence held since" type="date" value={licence} readOnly={locked} onChange={event=>setLicence(event.target.value)} />
      <small>Factual date used by the existing profile service.</small>
    </label>
    {locked
      ?<div className={styles.formActions}><a className="miqos-button miqos-button--secondary" href={"/profile/discrepancies?profileId="+encodeURIComponent(profileId)}>Review corrections</a></div>
      :<div className={styles.formActions}><button className="miqos-button miqos-button--primary" onClick={save} disabled={busy}>{busy?"Saving…":"Save & continue to validation"}</button></div>}
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}

export function ValidateProfileButton({profileId,valid}:{profileId:string;valid:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function validate(){
    setBusy(true);setError("");
    try{
      const response=await fetch(API_URL+`/profiles/${encodeURIComponent(profileId)}/validate`,{method:"POST"});
      const body=await responseBody(response);
      if(!response.ok)throw new Error(body.error??"Unable to validate profile");
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }
  return <div className={styles.actionBlock}>
    <button className="miqos-button miqos-button--secondary" onClick={validate} disabled={busy}>
      {busy?"Running validation…":valid?"Run validation again":"Run validation"}
    </button>
    {valid?<a className={styles.inlineLink} href={"/profile/review?profileId="+encodeURIComponent(profileId)}>Continue to review →</a>:null}
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}

export function CreateCorrectionFromEvidence({
  profileId,fieldId,evidenceValue,status,
}:{
  profileId:string;fieldId:string;evidenceValue:unknown;status:ProfileVersionStatus;
}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const supported=(status==="LOCKED"||status==="SUPERSEDED")&&evidenceValue!==null&&evidenceValue!==undefined;
  async function correct(){
    setBusy(true);setError("");
    try{
      const response=await fetch(API_URL+`/profiles/${encodeURIComponent(profileId)}/corrections`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({fieldId,value:evidenceValue}),
      });
      const body=await responseBody(response);
      if(!response.ok)throw new Error(body.error??"Unable to create corrected profile version");
      document.cookie=`miqos_active_profile=${encodeURIComponent(profileId)}; Path=/; SameSite=Lax`;
      router.push("/profile/review?profileId="+encodeURIComponent(profileId));
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }
  return <div className={styles.discrepancyActions}>
    {supported
      ?<button className="miqos-button miqos-button--primary" onClick={correct} disabled={busy}>{busy?"Creating corrected version…":"Use verified value in a new version"}</button>
      :<a className="miqos-button miqos-button--secondary" href={"/profile/capture?profileId="+encodeURIComponent(profileId)}>Review factual entry</a>}
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}

export function LockProfileControl({
  profileId,
  availability,
}:{
  profileId:string;
  availability:ActionAvailabilityVM;
}){
  const router=useRouter();
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const available=availability.state==="AVAILABLE";

  async function lock(){
    if(!confirmed||!available)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(API_URL+`/profiles/${encodeURIComponent(profileId)}/lock`,{method:"POST"});
      const body=await responseBody(response);
      if(!response.ok)throw new Error(body.error??"Unable to lock profile");
      document.cookie=`miqos_active_profile=${encodeURIComponent(profileId)}; Path=/; SameSite=Lax`;
      router.push("/dashboard?profileId="+encodeURIComponent(profileId));
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }

  if(availability.state==="HIDDEN"){
    return <div className={styles.lockedNotice}><strong>Profile locked</strong><span>{availability.reason}</span></div>;
  }

  return <div className={styles.lockControl}>
    <label className={styles.confirmationCheck}>
      <input aria-label="I confirm my profile is accurate" type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} disabled={!available||busy}/>
      <span><strong>I confirm this factual profile is accurate and complete.</strong><small>Locking preserves this version. Later factual corrections create a new version rather than mutating the locked one.</small></span>
    </label>
    <button className={styles.lockButton} onClick={lock} disabled={!available||!confirmed||busy}>
      {busy?"Locking profile…":"Confirm & Lock Profile"}
    </button>
    {!available?<p className={styles.blockReason}><strong>Lock unavailable:</strong> {availability.reason}</p>:null}
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}
