"use client";
import {use,useEffect,useState} from "react";
import {adminApiFetch} from "../../../../admin-api";

export default function AuditHistory({params}:{params:Promise<{profileId:string}>}){
  const {profileId}=use(params);
  const [items,setItems]=useState<any[]>([]);
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{
    const response=await adminApiFetch("/audit?profileId="+encodeURIComponent(profileId));
    const body=await response.json();
    if(!response.ok){setError(body.error??"Unable to load audit history");return;}
    setItems(body.items??[]);
  })().catch(error=>setError(String(error)))},[profileId]);

  return <main style={{maxWidth:1050,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Admin · A-08 · {profileId}</p>
    <h1>Audit history</h1>
    <p>Chronological append-only lifecycle events.</p>
    {error&&<p role="alert">{error}</p>}
    <ol id="audit-history">{items.map((item:any)=><li key={item.auditEventId}>
      <strong>{item.eventType}</strong> · {item.entityType} · {item.entityId} · {item.occurredAt}
    </li>)}</ol>
  </main>;
}
