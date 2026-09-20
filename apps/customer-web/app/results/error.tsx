"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function ResultsError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main><PageHeader eyebrow="Your Results" title="Your Results" description="Objective-specific result evidence"/><PageState state="ERROR" title="Your Results are unavailable" message="The persisted result or explanation evidence could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;
}
