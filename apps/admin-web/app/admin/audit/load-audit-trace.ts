import {
  composeAdminAuditTracePageVM,
  type AdminAuditEventApi,
  type AdminDiscrepancyApi,
  type AdminRawProviderResponseApi,
  type AdminSprint4TraceApi,
} from "@miqo/application-adapters";
import type {
  AdminAuditTraceFiltersVM,
  AdminAuditTracePageVM,
  ApplicationEnvironment,
} from "@miqo/application-contracts";
import {cookies} from "next/headers";
import {API_URL} from "../../lib";

async function getJson<T>(path:string):Promise<T>{
  const token=(await cookies()).get("miqo_admin_access")?.value;
  if(!token)throw new Error("ADMIN_AUTHENTICATION_REQUIRED");
  const response=await fetch(API_URL+path,{cache:"no-store",headers:{authorization:"Bearer "+token}});
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
  let discrepancies:ReadonlyArray<AdminDiscrepancyApi>=[];
  let rawProviderResponse:AdminRawProviderResponseApi|null=null;
  let profileId=args.filters.profileId;

  if(args.filters.selectionId){
    trace=await getJson<AdminSprint4TraceApi>(
      `/desktop-admin/selections/${encodeURIComponent(args.filters.selectionId)}/sp4-trace`,
    );
    if(profileId&&profileId!==trace.profile.profileId){
      throw new Error("ADMIN_TRACE_PROFILE_SELECTION_MISMATCH");
    }
    if(args.filters.profileVersionId&&args.filters.profileVersionId!==trace.riskProfileVersion.riskProfileVersionId){
      throw new Error("ADMIN_TRACE_PROFILE_VERSION_SELECTION_MISMATCH");
    }
    if(args.filters.recommendationSetId&&args.filters.recommendationSetId!==trace.recommendation.recommendationSetId){
      throw new Error("ADMIN_TRACE_RECOMMENDATION_SELECTION_MISMATCH");
    }
    profileId=trace.profile.profileId;

    const selected=trace.marketRouteQuotes.find(item=>
      item.normalisedQuote.normalisedQuoteId===trace?.recommendation.surfacedNormalisedQuoteId
    );
    if(selected){
      rawProviderResponse=await getJson<AdminRawProviderResponseApi>(
        `/desktop-admin/quote-requests/${encodeURIComponent(selected.quoteRequest.quoteRequestId)}/raw-response`,
      );
    }
  }

  if(profileId){
    const [audit,discrepancyResponse]=await Promise.all([
      getJson<{items:ReadonlyArray<AdminAuditEventApi>}>(`/desktop-admin/audit?profileId=${encodeURIComponent(profileId)}`),
      getJson<{items:ReadonlyArray<AdminDiscrepancyApi>}>(`/desktop-admin/profiles/${encodeURIComponent(profileId)}/discrepancies`),
    ]);
    auditEvents=audit.items??[];
    discrepancies=discrepancyResponse.items??[];
  }

  return composeAdminAuditTracePageVM({
    filters:{...args.filters,profileId},
    environment:args.environment,
    trace,
    auditEvents,
    rawProviderResponse,
    discrepancies,
  });
}
