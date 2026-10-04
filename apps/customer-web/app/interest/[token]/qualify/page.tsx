"use client";
import {FormEvent,useState} from "react";
import {useParams} from "next/navigation";
import {API_URL} from "../../../lib";

export default function QualifyPage(){
  const params=useParams<{token:string}>();
  const [done,setDone]=useState(false);
  const [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setError("");
    const data=new FormData(e.currentTarget);
    const r=await fetch(`${API_URL}/lead-generation/interest/${encodeURIComponent(params.token)}/qualify`,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({renewalWindow:data.get("renewalWindow"),contactPreference:data.get("contactPreference")})
    });
    if(!r.ok){setError("We could not save your answers. Please try again.");return;}
    setDone(true);
  }
  return <main className="lead-shell"><section className="lead-card">
    <div className="lead-brand">MIQOS</div><div className="lead-kicker">Motor Insurance Quotation Optimisation</div>
    {done?<><h1>You are registered.</h1><p>Thank you. Your interest has been recorded for the MIQOS quotation-optimisation journey.</p></>:
    <><h1>A couple of quick questions</h1><p>This short step helps MIQOS understand when your insurance renewal is relevant.</p>
    <form onSubmit={submit} className="lead-form">
      <label>When is your car insurance due for renewal?<select name="renewalWindow" required defaultValue=""><option value="" disabled>Select one</option><option value="WITHIN_30_DAYS">Within 30 days</option><option value="ONE_TO_THREE_MONTHS">1–3 months</option><option value="THREE_TO_SIX_MONTHS">3–6 months</option><option value="OVER_SIX_MONTHS">More than 6 months</option><option value="NOT_SURE">Not sure</option></select></label>
      <label>How would you prefer MIQOS to contact you?<select name="contactPreference" required defaultValue="EMAIL"><option value="EMAIL">Email</option><option value="PHONE">Phone</option></select></label>
      <button type="submit">Submit my interest</button>
      {error&&<p role="alert">{error}</p>}
    </form><p className="lead-small">Prototype boundary: synthetic data only. No live insurer/provider connection.</p></>}
  </section></main>;
}
