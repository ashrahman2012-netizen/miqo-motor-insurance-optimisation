import {
  composeQuoteComparisonPageVM,
  selectCurrentProfileLifecycleVersion,
  type ObjectiveQuoteComparisonApi,
  type PersistedCustomerObjectiveApi,
  type ProfileSnapshotApi,
  type ScenarioExplorationApi,
} from "@miqo/application-adapters";
import type {ApplicationEnvironment,QuoteComparisonPageVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";

async function getJson<T>(path:string):Promise<T>{
  const response=await fetch(API_URL+path,{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=typeof body?.error==="string"?body.error:`Quote comparison API request failed: ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

function latestObjective(items:ReadonlyArray<PersistedCustomerObjectiveApi>){
  return [...items].sort((a,b)=>{
    const at=Date.parse(a.selectedAt??"1970-01-01T00:00:00Z");
    const bt=Date.parse(b.selectedAt??"1970-01-01T00:00:00Z");
    return bt-at||b.customerObjectiveId.localeCompare(a.customerObjectiveId);
  })[0]??null;
}

export async function loadQuoteComparison(args:{
  profileId:string;
  customerObjectiveId:string|null;
  explorationFingerprint:string|null;
  environment:ApplicationEnvironment;
}):Promise<QuoteComparisonPageVM>{
  const snapshot=await getJson<ProfileSnapshotApi>(`/profiles/${encodeURIComponent(args.profileId)}/snapshot`);
  const version=selectCurrentProfileLifecycleVersion(snapshot);
  if(!version)throw new Error("PROFILE_VERSION_NOT_FOUND");

  let objectives:ReadonlyArray<PersistedCustomerObjectiveApi>=[];
  let explorations:ReadonlyArray<ScenarioExplorationApi>=[];
  let selectedObjective:PersistedCustomerObjectiveApi|null=null;
  let selectedExploration:ScenarioExplorationApi|null=null;
  let comparison:ObjectiveQuoteComparisonApi|null=null;

  if(version.status==="LOCKED"){
    const objectiveResponse=await getJson<{items:ReadonlyArray<PersistedCustomerObjectiveApi>}>(`/profile-versions/${encodeURIComponent(version.versionId)}/customer-objectives`);
    objectives=objectiveResponse.items??[];
    selectedObjective=objectives.find(item=>item.customerObjectiveId===args.customerObjectiveId)??latestObjective(objectives);

    if(selectedObjective){
      const explorationResponse=await getJson<{items:ReadonlyArray<ScenarioExplorationApi>}>(`/customer-objectives/${encodeURIComponent(selectedObjective.customerObjectiveId)}/scenario-explorations`);
      explorations=explorationResponse.items??[];
      selectedExploration=explorations.find(item=>item.explorationFingerprint===args.explorationFingerprint)
        ??(explorations.length===1?explorations[0]:null);

      if(selectedExploration){
        comparison=await getJson<ObjectiveQuoteComparisonApi>(
          `/customer-objectives/${encodeURIComponent(selectedObjective.customerObjectiveId)}/scenario-explorations/${encodeURIComponent(selectedExploration.explorationFingerprint)}/quote-comparison`
        );
      }
    }
  }

  return composeQuoteComparisonPageVM({
    profileId:args.profileId,
    version,
    persistedObjectives:objectives,
    selectedCustomerObjectiveId:selectedObjective?.customerObjectiveId??null,
    explorations,
    selectedExplorationFingerprint:selectedExploration?.explorationFingerprint??null,
    comparison,
    environment:args.environment,
  });
}
