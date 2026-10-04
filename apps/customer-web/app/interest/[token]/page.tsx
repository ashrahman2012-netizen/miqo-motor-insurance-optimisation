"use client";
import {useParams,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {API_URL} from "../../lib";

export default function InterestPage(){
  const params=useParams<{token:string}>();
  const router=useRouter();
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [leadState,setLeadState]=useState("");

  useEffect(()=>{
    fetch(`${API_URL}/lead-generation/interest/${encodeURIComponent(params.token)}`)
      .then(async r=>{if(!r.ok)throw new Error();const j=await r.json();setLeadState(j.state);setStatus("ready");})
      .catch(()=>setStatus("error"));
  },[params.token]);

  async function answer(value:"YES"|"NO"){
    setStatus("loading");
    const r=await fetch(`${API_URL}/lead-generation/interest/${encodeURIComponent(params.token)}/response`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answer:value})
    });
    if(!r.ok){setStatus("error");return;}
    if(value==="YES")router.push(`/interest/${params.token}/qualify`);
    else {setLeadState("SUPPRESSED");setStatus("ready");}
  }

  return <main className="lead-shell"><section className="lead-card">
    <div className="lead-brand">MIQOS</div>
    <div className="lead-kicker">Motor Insurance Quotation Optimisation</div>
    {status==="error"?<><h1>We could not load this invitation.</h1><p>Please use the latest MIQOS link you received.</p></>:
    leadState==="SUPPRESSED"?<><h1>Thank you.</h1><p>We have recorded that you do not need this motor-insurance journey.</p></>:
    <><h1>Could you be paying more than you need to for car insurance?</h1>
      <p>MIQOS helps you explore legitimate quotation choices while keeping your factual information unchanged.</p>
      <h2>Do you currently own a car that needs insurance?</h2>
      <div className="lead-actions"><button onClick={()=>answer("YES")} disabled={status==="loading"}>Yes — check my options</button><button className="secondary" onClick={()=>answer("NO")} disabled={status==="loading"}>No</button></div>
      <p className="lead-small">No obligation to proceed. This prototype uses synthetic data only.</p></>}
  </section></main>;
}
