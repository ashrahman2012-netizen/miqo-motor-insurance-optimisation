"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function ErrorState({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main><PageHeader eyebrow="Documents" title="Documents & Records" description="Application records associated with your MIQOS journey."/><PageState state="ERROR" title="Records unavailable" message="Your MIQOS application records could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;}
