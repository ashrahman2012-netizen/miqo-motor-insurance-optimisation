"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function QuotesError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main><PageHeader eyebrow="Quotes" title="Quote Comparison" description="Normalised quotation evidence"/><PageState state="ERROR" title="Quote comparison unavailable" message="The current quotation evidence could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;
}
