import {
  composeResultsPageVM,
  type ResultExplanationApi,
  type ResultRecommendationApi,
  type ResultSelectionApi,
} from "@miqo/application-adapters";
import type {ApplicationEnvironment,ResultsPageVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";
import {loadQuoteComparison} from "../quotes/load-quotes";

async function getJson<T>(path:string):Promise<T>{
  const response=await fetch(API_URL+path,{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=typeof body?.error==="string"?body.error:`Results API request failed: ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

async function optionalRecommendation(path:string):Promise<ResultRecommendationApi|null>{
  const response=await fetch(API_URL+path,{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(response.ok)return body as ResultRecommendationApi;
  if(response.status===422&&body?.error==="SP4_RECOMMENDATION_SET_NOT_FOUND")return null;
  throw new Error(typeof body?.error==="string"?body.error:`Results API request failed: ${response.status}`);
}

export async function loadResultsPage(args:{
  profileId:string;
  customerObjectiveId:string|null;
  explorationFingerprint:string|null;
  selectionId:string|null;
  environment:ApplicationEnvironment;
}):Promise<ResultsPageVM>{
  const comparisonPage=await loadQuoteComparison({
    profileId:args.profileId,
    customerObjectiveId:args.customerObjectiveId,
    explorationFingerprint:args.explorationFingerprint,
    environment:args.environment,
  });

  let recommendation:ResultRecommendationApi|null=null;
  let explanation:ResultExplanationApi|null=null;
  let selection:ResultSelectionApi|null=null;

  if(comparisonPage.customerObjectiveId&&comparisonPage.explorationFingerprint){
    const base=`/customer-objectives/${encodeURIComponent(comparisonPage.customerObjectiveId)}/scenario-explorations/${encodeURIComponent(comparisonPage.explorationFingerprint)}`;
    recommendation=await optionalRecommendation(base+"/recommendations");
    if(recommendation){
      explanation=await getJson<ResultExplanationApi>(`/recommendations/${encodeURIComponent(recommendation.recommendationSetId)}/explanation`);
    }
  }

  if(args.selectionId){
    selection=await getJson<ResultSelectionApi>(`/selections/${encodeURIComponent(args.selectionId)}`);
  }

  return composeResultsPageVM({
    profileId:args.profileId,
    comparisonPage,
    recommendation,
    explanation,
    selection,
    environment:args.environment,
  });
}
