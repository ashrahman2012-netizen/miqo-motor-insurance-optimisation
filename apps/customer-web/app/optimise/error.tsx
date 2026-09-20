"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function OptimiseError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main><PageHeader eyebrow="Scenarios" title="Objective & Scenario Explorer" description="Objective and scenario exploration"/><PageState state="ERROR" title="Scenario explorer unavailable" message="The current optimisation policy or scenario evidence could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;
}
