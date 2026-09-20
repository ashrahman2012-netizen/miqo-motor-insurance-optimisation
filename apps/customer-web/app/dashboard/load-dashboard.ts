import {
  composeCustomerDashboardVM,
  selectCurrentProfileVersion,
  selectDashboardExploration,
  selectLatestObjective,
  selectLatestRecommendation,
  type DashboardCustomerObjectiveApi,
  type DashboardExplorationApi,
  type DashboardProfileSnapshotApi,
  type DashboardRecommendationApi,
  type DashboardRouteQuoteApi,
} from "@miqo/application-adapters";
import type {ApplicationEnvironment, CustomerDashboardVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";

async function getJson<T>(path:string):Promise<T> {
  const response=await fetch(API_URL+path,{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=typeof body?.error==="string"?body.error:`Dashboard API request failed: ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

async function getOptionalJson<T>(path:string):Promise<T|null> {
  const response=await fetch(API_URL+path,{cache:"no-store"});
  if(response.status===404||response.status===422) return null;
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=typeof body?.error==="string"?body.error:`Dashboard API request failed: ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function loadCustomerDashboard(args:{
  profileId:string|null;
  environment:ApplicationEnvironment;
}):Promise<CustomerDashboardVM> {
  if(!args.profileId){
    return composeCustomerDashboardVM({
      profileId:null,
      environment:args.environment,
      snapshot:null,
      objectives:[],
      explorations:[],
      selectedExploration:null,
      routeQuotes:[],
      recommendation:null,
    });
  }

  const encodedProfile=encodeURIComponent(args.profileId);
  const snapshot=await getJson<DashboardProfileSnapshotApi>(`/profiles/${encodedProfile}/snapshot`);
  const current=selectCurrentProfileVersion(snapshot);

  let objectives:ReadonlyArray<DashboardCustomerObjectiveApi>=[];
  let explorations:ReadonlyArray<DashboardExplorationApi>=[];
  let selectedExploration:DashboardExplorationApi|null=null;
  let recommendation:DashboardRecommendationApi|null=null;
  let routeQuotes:ReadonlyArray<DashboardRouteQuoteApi>=[];

  if(current){
    const objectiveResponse=await getJson<{items:ReadonlyArray<DashboardCustomerObjectiveApi>}>(`/profile-versions/${encodeURIComponent(current.versionId)}/customer-objectives`);
    objectives=objectiveResponse.items??[];
    const objective=selectLatestObjective(objectives);

    if(objective){
      const explorationResponse=await getJson<{items:ReadonlyArray<DashboardExplorationApi>}>(`/customer-objectives/${encodeURIComponent(objective.customerObjectiveId)}/scenario-explorations`);
      explorations=explorationResponse.items??[];

      const recommendationCandidates=(await Promise.all(
        explorations.map(exploration=>getOptionalJson<DashboardRecommendationApi>(
          `/customer-objectives/${encodeURIComponent(objective.customerObjectiveId)}/scenario-explorations/${encodeURIComponent(exploration.explorationFingerprint)}/recommendations`
        ))
      )).filter((item):item is DashboardRecommendationApi=>item!==null);

      recommendation=selectLatestRecommendation(recommendationCandidates);
      selectedExploration=selectDashboardExploration(explorations,recommendation);

      if(selectedExploration){
        const quoteResponse=await getJson<{items:ReadonlyArray<DashboardRouteQuoteApi>}>(`/customer-objectives/${encodeURIComponent(objective.customerObjectiveId)}/scenario-explorations/${encodeURIComponent(selectedExploration.explorationFingerprint)}/market-route-quotes`);
        routeQuotes=quoteResponse.items??[];
      }
    }
  }

  return composeCustomerDashboardVM({
    profileId:args.profileId,
    environment:args.environment,
    snapshot,
    objectives,
    explorations,
    selectedExploration,
    routeQuotes,
    recommendation,
  });
}
