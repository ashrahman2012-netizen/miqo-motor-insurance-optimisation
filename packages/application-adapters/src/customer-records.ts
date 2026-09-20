
import type {
  ActionAvailabilityVM,
  ApplicationEnvironment,
  CustomerActivityEventVM,
  CustomerActivityPageVM,
  CustomerDashboardVM,
  CustomerDocumentsPageVM,
  CustomerRecordVM,
  CustomerSupportPageVM,
  CustomerSupportTopicVM,
  PageStateVM,
  StatusVM,
} from "@miqo/application-contracts";

export interface CustomerActivityAuditEventApi {
  readonly auditEventId:string;
  readonly eventType:string;
  readonly entityType:string;
  readonly entityId:string;
  readonly occurredAt:string;
  readonly metadataJson?:unknown;
}

function pageState(
  state:PageStateVM["state"],
  code:PageStateVM["code"],
  title:string|null,
  message:string|null,
):PageStateVM{
  return {state,code,title,message,retryable:false,referenceId:null};
}

function status(code:string,label:string,semanticFamily:StatusVM["semanticFamily"],reason:string|null=null):StatusVM{
  return {code,label,semanticFamily,reason};
}

function action(state:ActionAvailabilityVM["state"],reason:string|null=null):ActionAvailabilityVM{
  return {state,reason};
}

function profileQuery(profileId:string|null){
  return profileId?"?profileId="+encodeURIComponent(profileId):"";
}

export function composeCustomerDocumentsPageVM(args:{
  dashboard:CustomerDashboardVM;
}):CustomerDocumentsPageVM{
  const {dashboard}=args;
  if(!dashboard.profileId||!dashboard.profileVersion){
    return {
      profileId:null,
      records:[],
      uploadAction:action("BLOCKED","Document upload is not part of the current application build."),
      pageState:pageState("EMPTY","NO_PROFILE","No customer records yet","Open or create a profile before application records can be shown."),
    };
  }

  const query=profileQuery(dashboard.profileId);
  const records:CustomerRecordVM[]=[
    {
      recordId:"profile:"+dashboard.profileVersion.versionId,
      kind:"PROFILE_RECORD",
      title:"Profile record v"+dashboard.profileVersion.versionNo,
      description:dashboard.profileVersion.status==="LOCKED"
        ?"The locked factual profile used as the application baseline."
        :"The current factual profile record.",
      status:status(
        dashboard.profileVersion.status,
        dashboard.profileVersion.status,
        dashboard.profileVersion.status==="LOCKED"?"success":dashboard.profileVersion.status==="DRAFT"?"warning":"neutral",
      ),
      createdAt:dashboard.profileVersion.lockedAt,
      sourceId:dashboard.profileVersion.versionId,
      fingerprint:null,
      openHref:"/profile"+query,
      downloadAction:action("BLOCKED","No downloadable profile file has been generated."),
    },
  ];

  if(dashboard.scenarios.explorationFingerprint){
    records.push({
      recordId:"exploration:"+dashboard.scenarios.explorationFingerprint,
      kind:"SCENARIO_EXPLORATION",
      title:"Scenario exploration record",
      description:String(dashboard.scenarios.generatedScenarioCount)+" generated scenario"+(dashboard.scenarios.generatedScenarioCount===1?"":"s")+" associated with your selected objective.",
      status:status("READY","READY","success"),
      createdAt:null,
      sourceId:dashboard.scenarios.explorationFingerprint,
      fingerprint:dashboard.scenarios.explorationFingerprint,
      openHref:"/optimise"+query+"#generated-scenarios",
      downloadAction:action("BLOCKED","No downloadable scenario file has been generated."),
    });
  }

  if(dashboard.quotes.quoteCount>0){
    records.push({
      recordId:"quotes:"+(dashboard.scenarios.explorationFingerprint??dashboard.profileVersion.versionId),
      kind:"QUOTE_EVIDENCE",
      title:"Quote comparison record",
      description:String(dashboard.quotes.quoteCount)+" normalised quotation evidence record"+(dashboard.quotes.quoteCount===1?"":"s")+" available for comparison.",
      status:status("READY","READY","success"),
      createdAt:null,
      sourceId:dashboard.scenarios.explorationFingerprint,
      fingerprint:null,
      openHref:"/quotes"+query,
      downloadAction:action("BLOCKED","No downloadable insurer or MIQOS quote document has been generated."),
    });
  }

  if(dashboard.result){
    records.push({
      recordId:"results:"+dashboard.result.recommendationSetId,
      kind:"RESULT_SET",
      title:"Your Results record",
      description:"The persisted objective-specific result set and its recommendation fingerprint.",
      status:status("READY","READY","success"),
      createdAt:null,
      sourceId:dashboard.result.recommendationSetId,
      fingerprint:dashboard.result.recommendationFingerprint,
      openHref:"/results"+query,
      downloadAction:action("BLOCKED","No downloadable policy or recommendation document has been generated."),
    });
  }

  return {
    profileId:dashboard.profileId,
    records,
    uploadAction:action("BLOCKED","Document upload is not implemented in BUILD-001H."),
    pageState:pageState("SUCCESS",null,null,null),
  };
}

const ACTIVITY_PRESENTATION:Readonly<Record<string,{
  category:CustomerActivityEventVM["category"];
  title:string;
  detail:string;
  semanticFamily:StatusVM["semanticFamily"];
  statusCode:string;
  statusLabel:string;
}>>={
  profile_created:{category:"PROFILE",title:"Profile started",detail:"A new MIQOS factual profile was created.",semanticFamily:"info",statusCode:"STARTED",statusLabel:"STARTED"},
  profile_correction_started:{category:"PROFILE",title:"Profile correction started",detail:"A correction created a new factual profile version for review.",semanticFamily:"warning",statusCode:"REVIEW",statusLabel:"REVIEW"},
  profile_validated:{category:"PROFILE",title:"Profile validation completed",detail:"MIQOS completed the current profile validation checks.",semanticFamily:"success",statusCode:"COMPLETE",statusLabel:"COMPLETE"},
  profile_locked:{category:"PROFILE",title:"Profile locked",detail:"The factual profile was locked for downstream optimisation and quotation activity.",semanticFamily:"success",statusCode:"LOCKED",statusLabel:"LOCKED"},
  customer_objective_selected:{category:"OBJECTIVE",title:"Objective selected",detail:"Your selected optimisation objective was recorded.",semanticFamily:"info",statusCode:"APPLIED",statusLabel:"APPLIED"},
  optimisation_preferences_saved:{category:"OBJECTIVE",title:"Optimisation choices saved",detail:"Your permitted optimisation choices were recorded without changing factual profile fields.",semanticFamily:"info",statusCode:"SAVED",statusLabel:"SAVED"},
  sp4_scenario_exploration_generated:{category:"SCENARIO",title:"Scenarios generated",detail:"MIQOS generated scenarios from your selected objective and permitted choices.",semanticFamily:"success",statusCode:"READY",statusLabel:"READY"},
  comparison_generated:{category:"QUOTES",title:"Quote comparison updated",detail:"Comparable quotation evidence was evaluated under the applicable comparison rules.",semanticFamily:"info",statusCode:"UPDATED",statusLabel:"UPDATED"},
  sp4_recommendation_set_created:{category:"RESULTS",title:"Your Results created",detail:"An objective-specific result set was persisted from eligible quotation evidence.",semanticFamily:"success",statusCode:"READY",statusLabel:"READY"},
  sp4_recommendation_explanation_created:{category:"RESULTS",title:"Why This Surfaced created",detail:"The persisted result explanation was generated from recommendation and scenario evidence.",semanticFamily:"success",statusCode:"READY",statusLabel:"READY"},
  quote_selected:{category:"JOURNEY",title:"Result selected for final checks",detail:"A surfaced result was selected for the controlled final-integrity step.",semanticFamily:"info",statusCode:"SELECTED",statusLabel:"SELECTED"},
  final_integrity_passed:{category:"INTEGRITY",title:"Final integrity passed",detail:"The authoritative final-integrity check passed for the selected result.",semanticFamily:"success",statusCode:"PASS",statusLabel:"PASS"},
  final_integrity_blocked:{category:"INTEGRITY",title:"Final integrity blocked",detail:"The selected result did not pass the authoritative final-integrity check.",semanticFamily:"danger",statusCode:"BLOCKED",statusLabel:"BLOCKED"},
  prototype_completed:{category:"JOURNEY",title:"Synthetic journey completed",detail:"The controlled synthetic journey reached completion. No live provider purchase or binding occurred.",semanticFamily:"success",statusCode:"COMPLETE",statusLabel:"COMPLETE"},
};

export function composeCustomerActivityPageVM(args:{
  profileId:string|null;
  auditEvents:ReadonlyArray<CustomerActivityAuditEventApi>;
}):CustomerActivityPageVM{
  if(!args.profileId){
    return {
      profileId:null,
      events:[],
      fullAuditAction:action("HIDDEN","The detailed Audit & Trace Console is an administrative surface."),
      pageState:pageState("EMPTY","NO_PROFILE","No activity yet","Open or create a profile to view customer journey activity."),
    };
  }

  const events=args.auditEvents.flatMap((event):CustomerActivityEventVM[]=>{
    const presentation=ACTIVITY_PRESENTATION[event.eventType];
    if(!presentation)return [];
    return [{
      activityId:"activity:"+event.auditEventId,
      occurredAt:event.occurredAt,
      category:presentation.category,
      title:presentation.title,
      detail:presentation.detail,
      status:status(presentation.statusCode,presentation.statusLabel,presentation.semanticFamily),
      sourceAuditEventId:event.auditEventId,
    }];
  }).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt)||b.activityId.localeCompare(a.activityId));

  return {
    profileId:args.profileId,
    events,
    fullAuditAction:action("HIDDEN","Full technical lineage, raw provider evidence and append-only audit details are available only in the administrative Audit & Trace Console."),
    pageState:events.length
      ?pageState("SUCCESS",null,null,null)
      :pageState("EMPTY",null,"No customer-facing activity yet","No customer-facing journey events are available for this profile."),
  };
}

export function composeCustomerSupportPageVM(args:{
  profileId:string|null;
  environment:ApplicationEnvironment;
}):CustomerSupportPageVM{
  const query=profileQuery(args.profileId);
  const topics:ReadonlyArray<CustomerSupportTopicVM>=[
    {
      topicId:"PROFILE",
      title:"Profile information and corrections",
      summary:"Review factual information, validation results, discrepancies and the locked-profile lifecycle.",
      href:"/profile"+query,
      actionLabel:"Open Your Profile",
    },
    {
      topicId:"SCENARIOS",
      title:"Objectives and scenarios",
      summary:"Understand what MIQOS can optimise and why factual information is not changed by the scenario engine.",
      href:"/optimise"+query,
      actionLabel:"Open Scenarios",
    },
    {
      topicId:"QUOTES",
      title:"Quote comparison",
      summary:"Review directly comparable quotation evidence and the selected objective used for ordering.",
      href:"/quotes"+query,
      actionLabel:"Open Quotes",
    },
    {
      topicId:"RESULTS",
      title:"Your Results and Why This Surfaced",
      summary:"See the persisted result set, objective-specific explanation and controlled handoff state.",
      href:"/results"+query,
      actionLabel:"Open Your Results",
    },
    {
      topicId:"ACTIVITY",
      title:"Journey activity",
      summary:"Review a customer-friendly history of significant profile, scenario, result and integrity events.",
      href:"/activity"+query,
      actionLabel:"View Activity",
    },
    {
      topicId:"ENVIRONMENT",
      title:"Test environment and live-provider status",
      summary:args.environment==="PRODUCTION"
        ?"This application identifies itself as a production environment, but provider actions remain subject to separately certified capabilities."
        :"This is the "+args.environment.toLowerCase()+" environment. It must not be treated as evidence of a live insurance purchase or binding transaction.",
      href:null,
      actionLabel:null,
    },
  ];

  return {
    profileId:args.profileId,
    environment:args.environment,
    topics,
    contactAction:action("BLOCKED","In-app support messaging and case submission are not implemented in BUILD-001H."),
    pageState:pageState("SUCCESS",null,null,null),
  };
}
