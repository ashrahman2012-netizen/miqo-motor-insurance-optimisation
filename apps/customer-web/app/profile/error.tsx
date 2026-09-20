"use client";
import {PageHeader,PageState} from "@miqo/ui";
export default function ProfileError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main><PageHeader eyebrow="Your profile" title="Profile Review & Lock" description="Profile lifecycle"/><PageState state="ERROR" title="Profile unavailable" message="The current profile state could not be loaded."/><button className="miqos-button miqos-button--secondary" style={{marginTop:"1rem"}} onClick={reset}>Try again</button></main>;
}
