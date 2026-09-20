import {
  composeCustomerActivityPageVM,
  type CustomerActivityAuditEventApi,
} from "@miqo/application-adapters";
import type {CustomerActivityPageVM} from "@miqo/application-contracts";
import {API_URL} from "../lib";

export async function loadActivityPage(profileId:string|null):Promise<CustomerActivityPageVM>{
  if(!profileId)return composeCustomerActivityPageVM({profileId:null,auditEvents:[]});
  const response=await fetch(API_URL+"/profiles/"+encodeURIComponent(profileId)+"/snapshot",{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    throw new Error(typeof body?.error==="string"?body.error:"Unable to load customer activity");
  }
  return composeCustomerActivityPageVM({
    profileId,
    auditEvents:(body.audit??[]) as ReadonlyArray<CustomerActivityAuditEventApi>,
  });
}
