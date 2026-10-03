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

function profileLabel(index:number){
  return `Saved profile ${index+1}`;
}

export default function CustomerHome(){
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

  return <main id="main-content">
    <section className="hero" aria-labelledby="customer-home-title">
      <p className="eyebrow">Customer journey</p>
      <h1 id="customer-home-title">Build one truthful profile. Change choices, not facts.</h1>
      <p className="lede">Create or resume a protected local profile, confirm the facts once, then optimise only the choices that can legitimately change.</p>
    </section>

    {loading&&<p className="notice" role="status">Checking for retained synthetic profiles…</p>}
    {error&&<p className="notice notice--error" role="alert">{error}</p>}

    <div className="grid">
      {!loading&&profiles.length>0&&
        <section className="panel" aria-labelledby="retained-profiles-heading">
          <div className="panel__heading">
            <div>
              <h2 id="retained-profiles-heading">{profiles.length===1?"Retained synthetic profile":"Retained synthetic profiles"}</h2>
              <p>Continue from the latest saved local state without creating a duplicate profile.</p>
            </div>
          </div>
          <div className="profile-list">
            {profiles.map((profile,index)=>{
              const path=resumePath(profile);
              return <article
                key={profile.profileId}
                data-profile-id={profile.profileId}
                className="profile-card"
              >
                <span className="visually-hidden">Profile: {profile.profileId}</span>
                <div className="profile-card__top">
                  <h3 className="profile-card__title">{profileLabel(index)}</h3>
                  <span className="status-pill">{profile.currentVersion.status}</span>
                </div>
                <div className="profile-card__meta">
                  <span>Version: {profile.currentVersion.versionNo}</span>
                  <span>Status: {profile.currentVersion.status}</span>
                  <span>Created: <time dateTime={profile.createdAt}>{new Date(profile.createdAt).toLocaleDateString("en-GB")}</time></span>
                </div>
                {path
                  ? <button className="button button--secondary" onClick={()=>resume(profile)}>Resume profile</button>
                  : <button className="button button--secondary" disabled aria-disabled="true">Resume unavailable</button>}
              </article>;
            })}
          </div>
        </section>
      }

      {!loading&&profiles.length===0&&!error&&
        <section className="panel panel--half" aria-labelledby="empty-profile-heading">
          <h2 id="empty-profile-heading">No saved profile yet</h2>
          <p>No retained synthetic profiles found.</p>
          <p className="lede">Start with a new local profile. Nothing is sent to a live insurer or provider.</p>
        </section>
      }

      <section className="panel panel--half" aria-labelledby="new-profile-heading">
        <p className="eyebrow">New journey</p>
        <h2 id="new-profile-heading">Start a new profile</h2>
        <p>Create a fresh synthetic profile only when you intend to begin a separate customer journey.</p>
        <button className="button" onClick={start}>Start new synthetic profile</button>
      </section>
    </div>
  </main>;
}
