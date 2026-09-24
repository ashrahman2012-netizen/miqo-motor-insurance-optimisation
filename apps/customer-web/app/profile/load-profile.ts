import {
  composeProfileLifecycleVM,
  type CustomerProfileDiscrepancyApi,
  type CustomerProfileSnapshotApi,
} from "@miqo/application-adapters";
import type {ProfileLifecycleVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";

async function getJson<T>(path:string):Promise<T> {
  const response=await fetch(API_URL+path,{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=typeof body?.error==="string"?body.error:`Profile API request failed: ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function loadProfileLifecycle(profileId:string):Promise<ProfileLifecycleVM> {
  const encoded=encodeURIComponent(profileId);
  const [snapshot,discrepancyResponse]=await Promise.all([
    getJson<CustomerProfileSnapshotApi>(`/profiles/${encoded}/snapshot`),
    getJson<{items:ReadonlyArray<CustomerProfileDiscrepancyApi>}>(`/profiles/${encoded}/discrepancies`),
  ]);
  return composeProfileLifecycleVM({
    profileId,
    snapshot,
    discrepancies:discrepancyResponse.items??[],
  });
}
