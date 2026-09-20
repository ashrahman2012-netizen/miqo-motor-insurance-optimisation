import {
  composeAdminAuditTracePageVM,
  type AdminAuditEventApi,
  type AdminRawProviderResponseApi,
  type AdminSprint4TraceApi,
} from "@miqo/application-adapters";
import type {
  AdminAuditTraceFiltersVM,
  AdminAuditTracePageVM,
  ApplicationEnvironment,
} from "@miqo/application-contracts";
import {API_URL} from "../../lib";

async function getJson<T>(path:string):Promise<T>{
  const response=await fetch(API_URL+path,{cache:"no-store"});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    throw new Error(typeof payload?.error==="string"?payload.error:`Admin API request failed: ${response.status}`);
  }
  return payload as T;
}

export async function loadAdminAuditTrace(args:{
  filters:AdminAuditTraceFiltersVM;
  environment:ApplicationEnvironment;
}):Promise<AdminAuditTracePageVM>{
  let trace:AdminSprint4TraceApi|null=null;
  let auditEvents:ReadonlyArray<AdminAuditEventApi>=[];
  let rawProviderResponse:AdminRawProviderResponseApi|null=null;
  let profileId=args.filters.profileId;

  if(args.filters.selectionId){
    trace=await getJson<AdminSprint4TraceApi>(
      `/admin/selections/${encodeURIComponent(args.filters.selectionId)}/sp4-trace`,
    );
    if(profileId&&profileId!==trace.profile.profileId){
      throw new Error("ADMIN_TRACE_PROFILE_SELECTION_MISMATCH");
    }
    profileId=trace.profile.profileId;

    const selected=trace.marketRouteQuotes.find(item=>
      item.normalisedQuote.normalisedQuoteId===trace?.recommendation.surfacedNormalisedQuoteId
    );
    if(selected){
      rawProviderResponse=await getJson<AdminRawProviderResponseApi>(
        `/quote-requests/${encodeURIComponent(selected.quoteRequest.quoteRequestId)}/raw-response`,
      );
    }
  }

  if(profileId){
    const audit=await getJson<{items:ReadonlyArray<AdminAuditEventApi>}>(
      `/admin/audit?profileId=${encodeURIComponent(profileId)}`,
    );
    auditEvents=audit.items??[];
  }

  return composeAdminAuditTracePageVM({
    filters:{...args.filters,profileId},
    environment:args.environment,
    trace,
    auditEvents,
    rawProviderResponse,
  });
}
