"use client";

import {useEffect,useState} from "react";
import {API_URL,apiFetch} from "./lib";

type ProfileSummary={
  profileId:string;
  createdAt:string;
  currentVersion:{
    versionId:string;
    versionNo:number;
    status:string;
    lockedAt:string|null;
  };
};

function resumePath(profile:ProfileSummary){
  if(profile.currentVersion.status==="DRAFT"){
    return `/profile/${profile.profileId}/section/identity`;
  }
  if(profile.currentVersion.status==="LOCKED"){
    return `/profile/${profile.profileId}/optimisation`;
  }
  return null;
}

export default function PrototypeEntry(){
  const [profiles,setProfiles]=useState<ProfileSummary[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      setError("");
      const response=await apiFetch(`${API_URL}/profiles`);
      if(!response.ok)throw new Error("profile discovery failed");
      const body=await response.json();
      if(!cancelled)setProfiles(Array.isArray(body.items)?body.items:[]);
    })().catch(()=>{
      if(!cancelled)setError("Unable to discover retained profiles.");
    }).finally(()=>{
      if(!cancelled)setLoading(false);
    });
    return ()=>{cancelled=true;};
  },[]);

  async function start(){
    const response=await apiFetch(`${API_URL}/profiles`,{method:"POST"});
    if(!response.ok)throw new Error("create profile failed");
    const profile=await response.json();
    location.href=`/profile/${profile.profileId}/section/identity`;
  }

  function resume(profile:ProfileSummary){
    const path=resumePath(profile);
    if(path)location.href=path;
  }

  return <main style={{maxWidth:760,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · C-01</p>
    <h1>Build one truthful profile. Change choices, not facts.</h1>
    <p>No real customer data. No live insurer/provider connections.</p>

    {loading&&<p role="status">Checking for retained synthetic profiles…</p>}
    {error&&<p role="alert">{error}</p>}

    {!loading&&profiles.length>0&&
      <section aria-labelledby="retained-profiles-heading">
        <h2 id="retained-profiles-heading">{profiles.length===1?"Retained synthetic profile":"Retained synthetic profiles"}</h2>
        <div>
          {profiles.map(profile=>{
            const path=resumePath(profile);
            return <article
              key={profile.profileId}
              data-profile-id={profile.profileId}
              style={{border:"1px solid #bbb",padding:16,margin:"12px 0"}}
            >
              <p><strong>Profile:</strong> {profile.profileId}</p>
              <p><strong>Version:</strong> {profile.currentVersion.versionNo}</p>
              <p><strong>Status:</strong> {profile.currentVersion.status}</p>
              <p><strong>Created:</strong> <time dateTime={profile.createdAt}>{profile.createdAt}</time></p>
              {path
                ? <button onClick={()=>resume(profile)}>Resume profile</button>
                : <button disabled aria-disabled="true">Resume unavailable</button>}
            </article>;
          })}
        </div>
      </section>
    }

    {!loading&&profiles.length===0&&!error&&<p>No retained synthetic profiles found.</p>}

    <section aria-labelledby="new-profile-heading" style={{marginTop:24}}>
      <h2 id="new-profile-heading">Start a new profile</h2>
      <button onClick={start}>Start new synthetic profile</button>
    </section>
  </main>;
}
