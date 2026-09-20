"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import type {ActionAvailabilityVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";
import styles from "./results.module.css";

async function body(response:Response){return response.json().catch(()=>({}));}

function resultsUrl(args:{profileId:string;customerObjectiveId:string;explorationFingerprint:string;selectionId?:string}){
  const params=new URLSearchParams({
    profileId:args.profileId,
    customerObjectiveId:args.customerObjectiveId,
    explorationFingerprint:args.explorationFingerprint,
  });
  if(args.selectionId)params.set("selectionId",args.selectionId);
  return "/results?"+params.toString();
}

export function GenerateResultsButton({
  profileId,customerObjectiveId,explorationFingerprint,availability,
}:{
  profileId:string;
  customerObjectiveId:string;
  explorationFingerprint:string;
  availability:ActionAvailabilityVM;
}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function run(){
    if(availability.state!=="AVAILABLE")return;
    setBusy(true);setError("");
    try{
      const response=await fetch(API_URL+`/customer-objectives/${encodeURIComponent(customerObjectiveId)}/scenario-explorations/${encodeURIComponent(explorationFingerprint)}/recommendations`,{method:"POST"});
      const payload=await body(response);
      if(!response.ok)throw new Error(payload.error??"Unable to generate Your Results");
      router.replace(resultsUrl({profileId,customerObjectiveId,explorationFingerprint}));
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }
  return <div className={styles.actionStack}>
    <button className={styles.primaryAction} type="button" onClick={run} disabled={busy||availability.state!=="AVAILABLE"}>{busy?"Generating…":"Generate Your Results"}</button>
    {availability.state!=="AVAILABLE"&&availability.reason?<small>{availability.reason}</small>:null}
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}

export function FinalIntegrityButton({
  profileId,profileVersionId,customerObjectiveId,explorationFingerprint,recommendationSetId,normalisedQuoteId,availability,
}:{
  profileId:string;
  profileVersionId:string;
  customerObjectiveId:string;
  explorationFingerprint:string;
  recommendationSetId:string;
  normalisedQuoteId:string;
  availability:ActionAvailabilityVM;
}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function run(){
    if(availability.state!=="AVAILABLE")return;
    setBusy(true);setError("");
    try{
      const shortlistResponse=await fetch(API_URL+`/profile-versions/${encodeURIComponent(profileVersionId)}/shortlists`,{method:"POST"});
      const shortlist=await body(shortlistResponse);
      if(!shortlistResponse.ok)throw new Error(shortlist.error??"Unable to prepare final integrity evidence");
      const member=(shortlist.entries??[]).some((item:any)=>item.normalisedQuoteId===normalisedQuoteId);
      if(!member)throw new Error("SURFACED_RESULT_NOT_IN_COMPARABLE_SHORTLIST");
      const selectionResponse=await fetch(API_URL+`/shortlists/${encodeURIComponent(shortlist.shortlistId)}/selections`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({normalisedQuoteId,recommendationSetId}),
      });
      const selection=await body(selectionResponse);
      if(!selectionResponse.ok)throw new Error(selection.error??"Final integrity evaluation failed");
      router.replace(resultsUrl({profileId,customerObjectiveId,explorationFingerprint,selectionId:selection.selectionId}));
      router.refresh();
    }catch(error){setError(String(error instanceof Error?error.message:error));setBusy(false);}
  }
  return <div className={styles.actionStack}>
    <button className={styles.secondaryAction} type="button" onClick={run} disabled={busy||availability.state!=="AVAILABLE"}>{busy?"Running integrity…":"Run final integrity proof"}</button>
    {availability.state!=="AVAILABLE"&&availability.reason?<small>{availability.reason}</small>:null}
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}
