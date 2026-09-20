"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function ErrorState({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main><PageHeader eyebrow="Activity" title="Your Activity" description="Significant events across your MIQOS journey."/><PageState state="ERROR" title="Activity unavailable" message="Your customer journey activity could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;}
