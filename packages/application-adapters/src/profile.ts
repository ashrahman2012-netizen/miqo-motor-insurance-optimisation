import type {
  ActionAvailabilityVM,
  ControlClass,
  ProfileFieldVM,
  ProfileLifecycleStageVM,
  ProfileLifecycleVM,
  ProfileReviewVM,
  ProfileVersionStatus,
  ValidationIssueVM,
} from "@miqo/application-contracts";

export interface ProfileValueApi {
  readonly fieldId:string;
  readonly controlClass:ControlClass;
  readonly value:unknown;
  readonly sourceType:string|null;
  readonly createdAt?:string|null;
}

export interface ProfileVersionApi {
  readonly versionId:string;
  readonly versionNo:number;
  readonly status:ProfileVersionStatus;
  readonly lockedAt:string|null;
  readonly values:ReadonlyArray<ProfileValueApi>;
}

export interface ProfileAuditApi {
  readonly auditEventId:string;
  readonly eventType:string;
  readonly entityType:string;
  readonly entityId:string;
  readonly traceId?:string|null;
  readonly metadataJson?:unknown;
  readonly occurredAt:string;
}

export interface ProfileSnapshotApi {
  readonly versions:ReadonlyArray<ProfileVersionApi>;
  readonly audit:ReadonlyArray<ProfileAuditApi>;
}

export type CustomerProfileAuditApi = Pick<
  ProfileAuditApi,
  "eventType"|"entityId"|"metadataJson"|"occurredAt"
>;

export interface CustomerProfileSnapshotApi {
  readonly versions:ReadonlyArray<ProfileVersionApi>;
  readonly audit:ReadonlyArray<CustomerProfileAuditApi>;
}

export interface ProfileDiscrepancyApi {
  readonly discrepancyId:string;
  readonly riskProfileVersionId:string;
  readonly fieldId:string;
  readonly declaredValueJson:unknown;
  readonly verifiedValueJson:unknown;
  readonly state:string;
  readonly blocking:boolean;
  readonly createdAt:string;
}

export type CustomerProfileDiscrepancyApi = Pick<
  ProfileDiscrepancyApi,
  "discrepancyId"|"fieldId"|"declaredValueJson"|"verifiedValueJson"|"state"|"blocking"
>;

const FIELD_LABELS:Record<string,string>={
  main_driver_id:"Main driver",
  annual_mileage:"Annual mileage",
  licence_held_since:"Licence held since",
};

const REQUIRED_FIELDS=["main_driver_id","annual_mileage","licence_held_since"] as const;

function displayValue(fieldId:string,value:unknown){
  if(fieldId==="annual_mileage"&&typeof value==="number"){
    return new Intl.NumberFormat("en-GB").format(value)+" miles";
  }
  if(value===null||value===undefined||value==="")return "Not provided";
  return String(value);
}

function latestByTime<T extends {occurredAt:string}>(items:ReadonlyArray<T>):T|null {
  return [...items].sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt))[0]??null;
}

function action(state:ActionAvailabilityVM["state"],reason:string|null):ActionAvailabilityVM {
  return {state,reason};
}

function validationFromAudit(snapshot:CustomerProfileSnapshotApi,current:ProfileVersionApi){
  const event=latestByTime(snapshot.audit.filter(item=>
    item.eventType==="profile_validated"&&item.entityId===current.versionId
  ));
  if(!event){
    return {
      validation:{valid:false,versionId:current.versionId,issues:[] as ReadonlyArray<ValidationIssueVM>},
      checkedAt:null as string|null,
      checked:false,
    };
  }
  const metadata=(typeof event.metadataJson==="object"&&event.metadataJson!==null)
    ?event.metadataJson as {valid?:unknown;issues?:unknown}
    :{};
  const issues=Array.isArray(metadata.issues)
    ?metadata.issues.map((message):ValidationIssueVM=>({code:null,fieldId:null,message:String(message)}))
    :[];
  return {
    validation:{valid:metadata.valid===true,versionId:current.versionId,issues},
    checkedAt:event.occurredAt,
    checked:true,
  };
}

function buildJourney(args:{
  captureComplete:boolean;
  validationChecked:boolean;
  validationValid:boolean;
  blockingDiscrepancies:number;
  status:ProfileVersionStatus;
}):ReadonlyArray<ProfileLifecycleStageVM>{
  const locked=args.status==="LOCKED";
  const capture:ProfileLifecycleStageVM={
    id:"CAPTURE",label:"Profile capture",
    state:args.captureComplete?"COMPLETE":"CURRENT",
    detail:args.captureComplete?"Required factual fields are present.":"Complete the required factual fields.",
  };
  const validation:ProfileLifecycleStageVM={
    id:"VALIDATION",label:"Validation",
    state:args.validationValid?"COMPLETE":args.captureComplete?"CURRENT":"PENDING",
    detail:args.validationChecked
      ?args.validationValid?"Latest validation passed.":"Latest validation requires attention."
      :"Validation has not yet been run for this version.",
  };
  const discrepancies:ProfileLifecycleStageVM={
    id:"DISCREPANCIES",label:"Discrepancies",
    state:args.blockingDiscrepancies>0?"CURRENT":args.validationValid?"COMPLETE":"PENDING",
    detail:args.blockingDiscrepancies>0
      ?`${args.blockingDiscrepancies} blocking discrepancy item(s) require review.`
      :"No blocking discrepancy is recorded for the current version.",
  };
  const confirmationReady=args.validationValid&&args.blockingDiscrepancies===0&&!locked;
  const confirmation:ProfileLifecycleStageVM={
    id:"CONFIRMATION",label:"Confirmation",
    state:locked?"COMPLETE":confirmationReady?"CURRENT":"PENDING",
    detail:locked?"The locked version has already been confirmed.":confirmationReady?"Ready for customer confirmation.":"Complete validation and blocking discrepancy review first.",
  };
  const lock:ProfileLifecycleStageVM={
    id:"LOCK",label:"Lock",
    state:locked?"COMPLETE":confirmationReady?"PENDING":"BLOCKED",
    detail:locked?"Profile version is locked.":confirmationReady?"Awaiting explicit confirmation.":"Lock is not available yet.",
  };
  return [capture,validation,discrepancies,confirmation,lock];
}

export function selectCurrentProfileLifecycleVersion(snapshot:Pick<ProfileSnapshotApi,"versions">):ProfileVersionApi|null {
  return [...snapshot.versions].sort((a,b)=>b.versionNo-a.versionNo||b.versionId.localeCompare(a.versionId))[0]??null;
}

export function composeProfileLifecycleVM(args:{
  profileId:string;
  snapshot:CustomerProfileSnapshotApi;
  discrepancies:ReadonlyArray<CustomerProfileDiscrepancyApi>;
}):ProfileLifecycleVM {
  const current=selectCurrentProfileLifecycleVersion(args.snapshot);
  if(!current)throw new Error("PROFILE_VERSION_NOT_FOUND");

  const fields:ReadonlyArray<ProfileFieldVM>=current.values.map(item=>({
    fieldId:item.fieldId,
    label:FIELD_LABELS[item.fieldId]??item.fieldId.replaceAll("_"," "),
    controlClass:item.controlClass,
    value:item.value,
    displayValue:displayValue(item.fieldId,item.value),
    sourceType:item.sourceType,
    provenanceAvailable:Boolean(item.sourceType),
    editable:current.status==="DRAFT",
  }));

  const validationState=validationFromAudit(args.snapshot,current);
  const discrepancies=args.discrepancies.map(item=>({
    discrepancyId:item.discrepancyId,
    fieldId:item.fieldId,
    label:FIELD_LABELS[item.fieldId]??item.fieldId.replaceAll("_"," "),
    status:item.state,
    factualValue:item.declaredValueJson,
    evidenceValue:item.verifiedValueJson,
    reason:item.blocking?"This discrepancy is marked as blocking by persisted evidence.":null,
    resolutionAction:current.status==="LOCKED"
      ?action("AVAILABLE","Create a corrected profile version if the verified evidence is the factual value.")
      :action("AVAILABLE","Review the draft factual value before lock."),
  }));

  const blockingDiscrepancyCount=args.discrepancies.filter(item=>item.blocking).length;
  const requiredPresent=REQUIRED_FIELDS.every(fieldId=>current.values.some(item=>item.fieldId===fieldId));
  let lockAction:ActionAvailabilityVM;
  if(current.status==="LOCKED"){
    lockAction=action("HIDDEN","Profile version is already locked.");
  }else if(current.status!=="DRAFT"){
    lockAction=action("HIDDEN","Only a draft profile version can be locked.");
  }else if(!requiredPresent){
    lockAction=action("BLOCKED","Complete all required factual fields first.");
  }else if(!validationState.checked){
    lockAction=action("BLOCKED","Run validation for the current draft before lock.");
  }else if(!validationState.validation.valid){
    lockAction=action("BLOCKED","Resolve the latest validation issues before lock.");
  }else if(blockingDiscrepancyCount>0){
    lockAction=action("BLOCKED","Review blocking discrepancies before lock.");
  }else{
    lockAction=action("AVAILABLE",null);
  }

  const review:ProfileReviewVM={
    profileId:args.profileId,
    version:{versionId:current.versionId,versionNo:current.versionNo,status:current.status,lockedAt:current.lockedAt},
    fields,
    validation:validationState.validation,
    discrepancies,
    lockAction,
    pageState:{state:"SUCCESS",code:null,title:null,message:null,retryable:false,referenceId:null},
  };

  return {
    review,
    history:[...args.snapshot.versions]
      .sort((a,b)=>b.versionNo-a.versionNo)
      .map(item=>({versionId:item.versionId,versionNo:item.versionNo,status:item.status,lockedAt:item.lockedAt,current:item.versionId===current.versionId})),
    journey:buildJourney({
      captureComplete:requiredPresent,
      validationChecked:validationState.checked,
      validationValid:validationState.validation.valid,
      blockingDiscrepancies:blockingDiscrepancyCount,
      status:current.status,
    }),
    latestValidationAt:validationState.checkedAt,
    blockingDiscrepancyCount,
  };
}

export function profileFieldInputValue(field:ProfileFieldVM):string {
  if(field.value===null||field.value===undefined)return "";
  return String(field.value);
}
