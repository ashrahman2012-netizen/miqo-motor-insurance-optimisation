"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function AdminAuditError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main><PageHeader eyebrow="Administration" title="Audit & Trace Console" description="Complete provenance and append-only evidence."/><PageState state="ERROR" title="Audit evidence unavailable" message="The requested audit or trace evidence could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;
}
