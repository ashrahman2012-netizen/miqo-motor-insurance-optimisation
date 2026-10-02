"use client";

import {use,useEffect,useState} from "react";
import {API_URL,apiFetch} from "../../../../lib";

type SnapshotValue={fieldId:string;value:unknown};
type SnapshotVersion={
  versionId:string;
  status:string;
  values?:SnapshotValue[];
};

export default function Section({params}:{params:Promise<{profileId:string;sectionKey:string}>}){
  const {profileId}=use(params);
  const [locked,setLocked]=useState(false);
  const [mileage,setMileage]=useState("8000");
  const [driver,setDriver]=useState("DRV-SYN-001");
  const [licence,setLicence]=useState("2018-04-16");
  const [versionId,setVersionId]=useState("");
  const [hydrationState,setHydrationState]=useState<"loading"|"ready"|"error">("loading");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setHydrationState("loading");
      const response=await apiFetch(`${API_URL}/profiles/${profileId}`);
      if(!response.ok)throw new Error("profile snapshot load failed");

      const body=await response.json();
      const versions:Array<SnapshotVersion>=Array.isArray(body.versions)?body.versions:[];
      const latest=versions.at(-1);
      if(!latest?.versionId)throw new Error("profile snapshot missing latest version");

      if(cancelled)return;
      setVersionId(latest.versionId);
      setLocked(latest.status!=="DRAFT");

      if(latest.status==="DRAFT"){
        const values=Array.isArray(latest.values)?latest.values:[];
        const persisted=new Map(values.map(item=>[item.fieldId,item.value]));

        if(persisted.has("main_driver_id")){
          setDriver(String(persisted.get("main_driver_id")??""));
        }
        if(persisted.has("annual_mileage")){
          setMileage(String(persisted.get("annual_mileage")??""));
        }
        if(persisted.has("licence_held_since")){
          setLicence(String(persisted.get("licence_held_since")??""));
        }
      }

      setHydrationState("ready");
    })().catch(()=>{
      if(!cancelled)setHydrationState("error");
    });

    return ()=>{cancelled=true;};
  },[profileId]);

  async function save(){
    if(hydrationState!=="ready"||locked||!versionId)return;

    for(const [fieldId,value] of [
      ["main_driver_id",driver],
      ["annual_mileage",Number(mileage)],
      ["licence_held_since",licence],
    ] as const){
      const response=await apiFetch(
        `${API_URL}/profile-versions/${versionId}/facts/${fieldId}`,
        {
          method:"PUT",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({value}),
        },
      );
      if(!response.ok)throw new Error(await response.text());
    }

    location.href=`/profile/${profileId}/review`;
  }

  return <main style={{maxWidth:760,margin:"48px auto",padding:24,fontFamily:"system-ui"}}>
    <p>Customer · C-03 · {profileId}</p>
    <h1>Minimum factual questionnaire</h1>
    <p><strong>FACT</strong> — synthetic test circumstances.</p>

    {hydrationState==="loading"&&<p role="status">Loading retained profile…</p>}
    {hydrationState==="error"&&<p role="alert">Unable to load the retained profile. Saving is disabled.</p>}

    <label>Main driver ID<br/>
      <input
        aria-label="Main driver ID"
        value={driver}
        readOnly={locked}
        disabled={hydrationState!=="ready"}
        onChange={event=>setDriver(event.target.value)}
      />
    </label><br/><br/>
    <label>Annual mileage<br/>
      <input
        aria-label="Annual mileage"
        value={mileage}
        readOnly={locked}
        disabled={hydrationState!=="ready"}
        onChange={event=>setMileage(event.target.value)}
      />
    </label><br/><br/>
    <label>Licence held since<br/>
      <input
        aria-label="Licence held since"
        value={licence}
        readOnly={locked}
        disabled={hydrationState!=="ready"}
        onChange={event=>setLicence(event.target.value)}
      />
    </label><br/><br/>

    {locked
      ? <>
          <button disabled={hydrationState!=="ready"} onClick={()=>location.href=`/profile/${profileId}/correction`}>Correct factual information</button>{" "}
          <button disabled={hydrationState!=="ready"} onClick={()=>location.href=`/profile/${profileId}/optimisation`}>Optimise quote choices</button>
        </>
      : <button disabled={hydrationState!=="ready"} onClick={save}>Save &amp; continue</button>}
  </main>;
}
