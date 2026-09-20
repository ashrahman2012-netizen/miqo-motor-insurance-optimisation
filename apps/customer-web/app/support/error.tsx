"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function ErrorState({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main><PageHeader eyebrow="Help & Support" title="Help & Support" description="Guidance for using MIQOS."/><PageState state="ERROR" title="Help unavailable" message="Support guidance could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;}
