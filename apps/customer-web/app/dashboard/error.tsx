"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function DashboardError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main><PageHeader eyebrow="Customer" title="Customer dashboard" description="Your motor insurance journey, optimised."/><PageState state="ERROR" title="Dashboard unavailable" message="The dashboard could not read the current application state."/><button className="miqos-button miqos-button--secondary" onClick={reset} style={{marginTop:"1rem"}}>Try again</button></main>;
}
