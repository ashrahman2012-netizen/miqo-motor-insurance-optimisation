export const SP5_DATA_GOVERNANCE_VERSION="sp5-data-governance-v1" as const;
export type DataRole="CONTROLLER"|"PROCESSOR"|"JOINT_CONTROLLER"|"TBD";
export type LawfulBasis="CONTRACT"|"LEGAL_OBLIGATION"|"LEGITIMATE_INTERESTS"|"CONSENT"|"TBD";
export type RightsAction="ACCESS"|"CORRECT"|"RESTRICT"|"DELETE";

export type ProcessingControl=Readonly<{
  flowKey:string; purpose:string; lawfulBasis:LawfulBasis; dataRole:DataRole;
  approved:boolean; approvalReference?:string;
}>;
export type DataGovernanceActivation=Readonly<{
  realDataRequested:boolean; productionAuthorised:boolean;
  processingControls:ReadonlyArray<ProcessingControl>;
}>;
export function assertRealDataActivation(a:DataGovernanceActivation){
  if(!a.realDataRequested)return;
  if(!a.productionAuthorised)throw new Error("REAL_DATA_PRODUCTION_AUTHORISATION_REQUIRED");
  if(a.processingControls.length===0)throw new Error("REAL_DATA_PROCESSING_CONTROLS_REQUIRED");
  for(const c of a.processingControls)assertProcessingControlApproved(c);
}
export function assertProcessingControlApproved(c:ProcessingControl){
  if(!c.flowKey.trim()||!c.purpose.trim())throw new Error("PROCESSING_METADATA_INCOMPLETE");
  if(c.lawfulBasis==="TBD"||c.dataRole==="TBD")throw new Error("PROCESSING_CLASSIFICATION_TBD");
  if(!c.approved||!c.approvalReference?.trim())throw new Error("PROCESSING_CONTROL_APPROVAL_REQUIRED");
}

export type RetentionRule=Readonly<{recordClass:string;retainDays:number;approved:boolean;approvalReference?:string}>;
export type LifecycleRecord=Readonly<{id:string;recordClass:string;createdDay:number;legalHold:boolean;deleted:boolean}>;
export function lifecycleDecision(r:LifecycleRecord,rule:RetentionRule,todayDay:number){
  if(!rule.approved||!rule.approvalReference)throw new Error("RETENTION_SCHEDULE_APPROVAL_REQUIRED");
  if(rule.recordClass!==r.recordClass)throw new Error("RETENTION_RULE_CLASS_MISMATCH");
  if(r.legalHold)return "RETAIN_LEGAL_HOLD" as const;
  return todayDay-r.createdDay>=rule.retainDays?"DELETE":"RETAIN";
}

export type LineageVersion=Readonly<{version:number;facts:Readonly<Record<string,unknown>>;supersedes?:number;restricted:boolean}>;
export class RightsLineage{
  #versions:LineageVersion[]=[];
  constructor(initial:Readonly<Record<string,unknown>>){this.#versions.push(Object.freeze({version:1,facts:Object.freeze({...initial}),restricted:false}));}
  correct(patch:Readonly<Record<string,unknown>>){const prev=this.current();const next=Object.freeze({version:prev.version+1,facts:Object.freeze({...prev.facts,...patch}),supersedes:prev.version,restricted:prev.restricted});this.#versions.push(next);return next;}
  restrict(){const prev=this.current();const next=Object.freeze({...prev,version:prev.version+1,supersedes:prev.version,restricted:true});this.#versions.push(next);return next;}
  access(){return Object.freeze([...this.#versions]);}
  current(){return this.#versions[this.#versions.length-1]!;}
}

export type DpiaControl=Readonly<{required:boolean;approved:boolean;approvalReference?:string}>;
export function assertDpiaGate(c:DpiaControl){if(c.required&&(!c.approved||!c.approvalReference?.trim()))throw new Error("DPIA_APPROVAL_REQUIRED");}

export type AdmClassification="NO_SIGNIFICANT_AUTOMATED_DECISION"|"SIGNIFICANT_AUTOMATED_DECISION"|"TBD";
export type AdmControl=Readonly<{classification:AdmClassification;humanChallengeAvailable:boolean;classificationReference?:string}>;
export function assertAdmControl(c:AdmControl){
  if(c.classification==="TBD"||!c.classificationReference?.trim())throw new Error("ADM_CLASSIFICATION_REQUIRED");
  if(c.classification==="SIGNIFICANT_AUTOMATED_DECISION"&&!c.humanChallengeAvailable)throw new Error("ADM_HUMAN_CHALLENGE_REQUIRED");
}

export type JourneyControl=Readonly<{
  nonAdvised:boolean; customerSelectsObjective:boolean; customerMakesFinalDecision:boolean;
  suitabilityRecommendation:boolean; demandsNeedsRulesVersion?:string; eligibilityRulesVersion?:string;
}>;
export function assertNonAdvisedJourney(c:JourneyControl){
  if(!c.nonAdvised||!c.customerSelectsObjective||!c.customerMakesFinalDecision||c.suitabilityRecommendation)throw new Error("NON_ADVISED_BOUNDARY_VIOLATION");
  if(!c.demandsNeedsRulesVersion?.trim()||!c.eligibilityRulesVersion?.trim())throw new Error("DEMANDS_NEEDS_ELIGIBILITY_RULES_REQUIRED");
}
