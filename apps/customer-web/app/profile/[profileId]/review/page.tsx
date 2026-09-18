"use client";
import {use,useEffect,useState} from "react";
import {API_URL} from "../../../lib";
export default function Review({params}:{params:Promise<{profileId:string}>}){
  const {profileId:id}=use(params); const [result,setResult]=useState<any>();
  useEffect(()=>{(async()=>{const r=await fetch(`${API_URL}/profiles/${id}/validate`,{method:"POST"});setResult(await r.json())})()},[id]);
  return <main style={{maxWidth:760,margin:"48px auto",padding:24,fontFamily:"system-ui"}}><p>Customer · C-05 · {id}</p><h1>Review your factual profile</h1><p id="validation-pass">Validation: {result?.valid?"PASS":result?"FAIL":"…"}</p>{result?.issues?.map((x:string)=><p key={x}>{x}</p>)}<button disabled={!result?.valid} onClick={()=>location.href=`/profile/${id}/lock`}>Continue to confirmation</button></main>
}
