"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import type {ActionAvailabilityVM,QuoteExplorationOptionVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";
import styles from "./quotes.module.css";

async function readBody(response:Response){
  return response.json().catch(()=>({}));
}

export function QuoteComparisonControls({
  profileId,
  customerObjectiveId,
  explorationFingerprint,
  explorations,
  runAction,
  hasQuotes,
}:{
  profileId:string;
  customerObjectiveId:string|null;
  explorationFingerprint:string|null;
  explorations:ReadonlyArray<QuoteExplorationOptionVM>;
  runAction:ActionAvailabilityVM;
  hasQuotes:boolean;
}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  function selectExploration(value:string){
    if(!customerObjectiveId||!value)return;
    const params=new URLSearchParams({profileId,customerObjectiveId,explorationFingerprint:value});
    router.replace("/quotes?"+params.toString());
    router.refresh();
  }

  async function run(){
    if(!customerObjectiveId||!explorationFingerprint||runAction.state!=="AVAILABLE")return;
    setBusy(true);setError("");
    try{
      const base=API_URL+`/customer-objectives/${encodeURIComponent(customerObjectiveId)}/scenario-explorations/${encodeURIComponent(explorationFingerprint)}`;
      const response=await fetch(base+"/market-route-quotes",{method:"POST"});
      const payload=await readBody(response);
      if(!response.ok)throw new Error(payload.error??"Unable to run quote routes");
      router.refresh();
      setBusy(false);
    }catch(error){
      setError(String(error instanceof Error?error.message:error));
      setBusy(false);
    }
  }

  return <div className={styles.controlBar}>
    <label>
      <span>Scenario exploration</span>
      <select
        aria-label="Scenario exploration"
        value={explorationFingerprint??""}
        onChange={event=>selectExploration(event.target.value)}
        disabled={!customerObjectiveId||explorations.length===0}
      >
        <option value="">Select exploration</option>
        {explorations.map(item=><option key={item.explorationFingerprint} value={item.explorationFingerprint}>
          {item.scenarioCount} scenarios · {item.explorationFingerprint.slice(0,12)}…
        </option>)}
      </select>
    </label>
    <div className={styles.executionControl}>
      <button
        className={styles.runButton}
        type="button"
        onClick={run}
        disabled={busy||runAction.state!=="AVAILABLE"}
      >
        {busy?"Running quote routes…":hasQuotes?"Refresh quote evidence":"Run quote comparison"}
      </button>
      {runAction.state!=="AVAILABLE"?<small>{runAction.reason}</small>:<small>Synthetic route execution only in the current certified runtime.</small>}
    </div>
    {error?<p role="alert" className={styles.errorText}>{error}</p>:null}
  </div>;
}
