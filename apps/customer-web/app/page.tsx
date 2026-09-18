"use client";
import {API_URL} from "./lib";
export default function PrototypeEntry(){async function start(){const r=await fetch(`${API_URL}/profiles`,{method:"POST"});if(!r.ok)throw new Error("create profile failed");const p=await r.json();location.href=`/profile/${p.profileId}/section/identity`;}
return <main style={{maxWidth:760,margin:"48px auto",padding:24,fontFamily:"system-ui"}}><p>Customer · C-01</p><h1>Build one truthful profile. Change choices, not facts.</h1><p>No real customer data. No live insurer/provider connections.</p><button onClick={start}>Start synthetic profile</button></main>}
