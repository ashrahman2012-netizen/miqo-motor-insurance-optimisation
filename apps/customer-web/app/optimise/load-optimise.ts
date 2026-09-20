import {
  composeScenarioExplorerVM,
  selectCurrentProfileLifecycleVersion,
  type CandidateVehicleApi,
  type CurrentOptimisationPolicyApi,
  type PersistedCustomerObjectiveApi,
  type ProfileSnapshotApi,
  type ScenarioExplorationApi,
} from "@miqo/application-adapters";
import type {ScenarioExplorerVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";

async function getJson<T>(path:string):Promise<T>{
  const response=await fetch(API_URL+path,{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=typeof body?.error==="string"?body.error:`Optimisation API request failed: ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function loadScenarioExplorer(args:{
  profileId:string;
  customerObjectiveId:string|null;
  explorationFingerprint:string|null;
}):Promise<ScenarioExplorerVM>{
  const [snapshot,policy]=await Promise.all([
    getJson<ProfileSnapshotApi>(`/profiles/${encodeURIComponent(args.profileId)}/snapshot`),
    getJson<CurrentOptimisationPolicyApi>("/optimisation/policy/current"),
  ]);
  const version=selectCurrentProfileLifecycleVersion(snapshot);
  if(!version)throw new Error("PROFILE_VERSION_NOT_FOUND");

  let persistedObjectives:ReadonlyArray<PersistedCustomerObjectiveApi>=[];
  let candidateVehicles:ReadonlyArray<CandidateVehicleApi>=[];
  if(version.status==="LOCKED"){
    const [objectiveResponse,candidateResponse]=await Promise.all([
      getJson<{items:ReadonlyArray<PersistedCustomerObjectiveApi>}>(`/profile-versions/${encodeURIComponent(version.versionId)}/customer-objectives`),
      getJson<{items:ReadonlyArray<CandidateVehicleApi>}>(`/profile-versions/${encodeURIComponent(version.versionId)}/candidate-vehicles`),
    ]);
    persistedObjectives=objectiveResponse.items??[];
    candidateVehicles=candidateResponse.items??[];
  }

  const requested=persistedObjectives.find(item=>item.customerObjectiveId===args.customerObjectiveId)??null;
  const selected=requested??[...persistedObjectives].sort((a,b)=>{
    const at=Date.parse(a.selectedAt??"1970-01-01T00:00:00Z");
    const bt=Date.parse(b.selectedAt??"1970-01-01T00:00:00Z");
    return bt-at||b.customerObjectiveId.localeCompare(a.customerObjectiveId);
  })[0]??null;

  let exploration:ScenarioExplorationApi|null=null;
  if(selected){
    const response=await getJson<{items:ReadonlyArray<ScenarioExplorationApi>}>(`/customer-objectives/${encodeURIComponent(selected.customerObjectiveId)}/scenario-explorations`);
    const items=response.items??[];
    exploration=items.find(item=>item.explorationFingerprint===args.explorationFingerprint)
      ??(items.length===1?items[0]:null);
  }

  return composeScenarioExplorerVM({
    profileId:args.profileId,
    version,
    policy,
    persistedObjectives,
    selectedCustomerObjectiveId:selected?.customerObjectiveId??null,
    candidateVehicles,
    exploration,
  });
}
