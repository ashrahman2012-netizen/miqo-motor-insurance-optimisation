import type {
  ActionAvailabilityVM,
  CustomerObjectiveId,
  ObjectiveSelectorVM,
  ObjectiveVM,
  OptimisationControlVM,
  OptimisationOptionVM,
  PageStateVM,
  ProfileVersionStatus,
  ScenarioDeltaVM,
  ScenarioExplorationVM,
  ScenarioExplorerVM,
} from "@miqo/application-contracts";

export interface OptimisationPolicyControlApi {
  readonly controlId:string;
  readonly controlClass:"O";
  readonly catalogueVersion:string;
  readonly label:string;
  readonly permittedValues:
    | {readonly kind:"ENUM";readonly values:ReadonlyArray<string|number|boolean>}
    | {readonly kind:"RULE";readonly rule:string}
    | {readonly kind:"DYNAMIC";readonly source:string;readonly rule:string};
  readonly dependencies:ReadonlyArray<string>;
  readonly constraints:ReadonlyArray<string>;
  readonly applicability:"ALWAYS"|"PRE_PURCHASE_ONLY";
  readonly factualBoundary:string;
}

export interface OptimisationPolicyObjectiveApi {
  readonly objectiveId:CustomerObjectiveId;
  readonly objectiveVersion:string;
  readonly executable:boolean;
  readonly label:string;
  readonly primaryDimension:string;
  readonly explanation:string;
}

export interface CurrentOptimisationPolicyApi {
  readonly catalogueVersion:string;
  readonly objectiveModelVersion:string;
  readonly policyFingerprint:string;
  readonly scenarioGeneratorVersion:string;
  readonly catalogue:{readonly catalogueVersion:string;readonly controls:ReadonlyArray<OptimisationPolicyControlApi>};
  readonly objectiveModel:{readonly objectiveModelVersion:string;readonly objectives:ReadonlyArray<OptimisationPolicyObjectiveApi>};
}

export interface ScenarioProfileValueApi {
  readonly fieldId:string;
  readonly controlClass:"F"|"V"|"D"|"O"|"I";
  readonly value:unknown;
  readonly sourceType?:string|null;
}

export interface ScenarioProfileVersionApi {
  readonly versionId:string;
  readonly versionNo:number;
  readonly status:ProfileVersionStatus;
  readonly lockedAt:string|null;
  readonly values:ReadonlyArray<ScenarioProfileValueApi>;
}

export interface PersistedCustomerObjectiveApi {
  readonly customerObjectiveId:string;
  readonly riskProfileVersionId:string;
  readonly objectiveId:CustomerObjectiveId;
  readonly objectiveVersion:string;
  readonly catalogueVersion:string;
  readonly policyFingerprint:string;
  readonly selectedAt:string|null;
}

export interface ScenarioExplorationApi {
  readonly created?:boolean;
  readonly customerObjectiveId:string;
  readonly explorationFingerprint:string;
  readonly generationVersion:string;
  readonly items:ReadonlyArray<{
    readonly scenarioId:string;
    readonly riskProfileVersionId:string;
    readonly customerObjectiveId:string;
    readonly generationVersion:string;
    readonly generationOrdinal:number|null;
    readonly explorationFingerprint:string;
    readonly candidateFingerprint:string;
    readonly catalogueVersion:string;
    readonly policyFingerprint:string;
    readonly deltas:ReadonlyArray<{readonly fieldId:string;readonly controlClass:"O";readonly value:unknown}>;
  }>;
  readonly rejections:ReadonlyArray<{
    readonly rejectionId:string;
    readonly candidateFingerprint:string;
    readonly candidate:Readonly<Record<string,unknown>>;
    readonly ruleId:string;
    readonly category:string;
    readonly reason:string;
    readonly catalogueVersion:string;
    readonly generationVersion:string;
  }>;
}

export interface CandidateVehicleApi {
  readonly candidateVehicleId:string;
  readonly vehicleSnapshotJson:Readonly<Record<string,unknown>>;
}

function action(state:ActionAvailabilityVM["state"],reason:string|null=null):ActionAvailabilityVM{
  return {state,reason};
}

function pageState(state:PageStateVM["state"],code:PageStateVM["code"],title:string|null,message:string|null):PageStateVM{
  return {state,code,title,message,retryable:false,referenceId:null};
}

function optionLabel(controlId:string,value:string|number|boolean){
  if(controlId==="voluntary_excess"&&typeof value==="number")return `£${value}`;
  if(controlId==="payment_structure")return value==="ANNUAL"?"Annual":"Monthly";
  if(controlId==="telematics_preference")return value?"Telematics accepted":"No telematics";
  return String(value);
}

function displayDelta(controlId:string,value:unknown){
  if(controlId==="voluntary_excess"&&typeof value==="number")return `£${value}`;
  if(controlId==="payment_structure"&&typeof value==="string")return value==="ANNUAL"?"Annual payment":"Monthly payment";
  if(controlId==="telematics_preference"&&typeof value==="boolean")return value?"Telematics accepted":"No telematics";
  if(controlId==="policy_start_date"&&typeof value==="string")return value;
  if(controlId==="genuine_named_driver_inclusion"&&Array.isArray(value))return value.length?value.join(", "):"No named driver";
  return typeof value==="string"?value:JSON.stringify(value);
}

function dynamicOptions(
  control:OptimisationPolicyControlApi,
  values:ReadonlyArray<ScenarioProfileValueApi>,
  candidates:ReadonlyArray<CandidateVehicleApi>,
):ReadonlyArray<OptimisationOptionVM>|null{
  if(control.permittedValues.kind==="ENUM"){
    return control.permittedValues.values.map(value=>({value,label:optionLabel(control.controlId,value)}));
  }
  if(control.controlId==="genuine_named_driver_inclusion"){
    const ids=values
      .filter(item=>item.fieldId.startsWith("named_driver_id")&&typeof item.value==="string")
      .map(item=>String(item.value))
      .sort();
    return ids.map(value=>({value,label:value}));
  }
  if(control.controlId==="candidate_vehicle"){
    return candidates.map(item=>({value:item.candidateVehicleId,label:item.candidateVehicleId}));
  }
  return null;
}

function controlAction(
  control:OptimisationPolicyControlApi,
  version:ScenarioProfileVersionApi,
  vehicleMode:"CURRENT_VEHICLE"|"PRE_PURCHASE",
  options:ReadonlyArray<OptimisationOptionVM>|null,
):ActionAvailabilityVM{
  if(version.status!=="LOCKED")return action("BLOCKED","Optimisation requires the current profile version to be locked.");
  if(control.applicability==="PRE_PURCHASE_ONLY"&&vehicleMode!=="PRE_PURCHASE"){
    return action("BLOCKED","Available only when the locked factual profile is in PRE_PURCHASE vehicle mode.");
  }
  if(control.controlId==="genuine_named_driver_inclusion"&&(!options||options.length===0)){
    return action("BLOCKED","No genuine named-driver IDs are present in the locked profile.");
  }
  if(control.controlId==="candidate_vehicle"&&(!options||options.length===0)){
    return action("BLOCKED","No persisted candidate vehicles are available for this locked profile.");
  }
  return action("AVAILABLE");
}

function toObjectiveSelector(args:{
  version:ScenarioProfileVersionApi;
  policy:CurrentOptimisationPolicyApi;
  persisted:ReadonlyArray<PersistedCustomerObjectiveApi>;
  selectedCustomerObjectiveId:string|null;
}):ObjectiveSelectorVM{
  const selected=args.persisted.find(item=>item.customerObjectiveId===args.selectedCustomerObjectiveId)??null;
  const objectives:ReadonlyArray<ObjectiveVM>=args.policy.objectiveModel.objectives.map(item=>({
    customerObjectiveId:args.persisted.find(existing=>existing.objectiveId===item.objectiveId)?.customerObjectiveId??null,
    objectiveId:item.objectiveId,
    label:item.label,
    explanation:item.explanation,
    primaryDimension:item.primaryDimension,
    executable:item.executable,
    selected:selected?.objectiveId===item.objectiveId,
    objectiveVersion:item.objectiveVersion,
    catalogueVersion:args.policy.catalogueVersion,
  }));
  return {
    riskProfileVersionId:args.version.versionId,
    objectives,
    selectedObjectiveId:selected?.objectiveId??null,
    pageState:args.version.status==="LOCKED"
      ?pageState("SUCCESS",null,null,null)
      :pageState("BLOCKED","PROFILE_NOT_LOCKED","Profile lock required","Objectives can be selected only against a locked factual profile version."),
  };
}

function toExploration(
  exploration:ScenarioExplorationApi|null,
  controlLabels:ReadonlyMap<string,string>,
):ScenarioExplorationVM|null{
  if(!exploration)return null;
  return {
    customerObjectiveId:exploration.customerObjectiveId,
    explorationFingerprint:exploration.explorationFingerprint,
    generationVersion:exploration.generationVersion,
    scenarios:exploration.items.map(item=>({
      scenarioId:item.scenarioId,
      generationOrdinal:item.generationOrdinal,
      generationVersion:item.generationVersion,
      candidateFingerprint:item.candidateFingerprint,
      deltas:item.deltas.map((delta):ScenarioDeltaVM=>({
        fieldId:delta.fieldId,
        label:controlLabels.get(delta.fieldId)??delta.fieldId.replaceAll("_"," "),
        controlClass:"O",
        value:delta.value,
        displayValue:displayDelta(delta.fieldId,delta.value),
      })),
    })),
    rejections:exploration.rejections.map(item=>({
      rejectionId:item.rejectionId,
      candidateFingerprint:item.candidateFingerprint,
      category:item.category,
      ruleId:item.ruleId,
      reason:item.reason,
      candidate:item.candidate,
    })),
    pageState:exploration.items.length
      ?pageState(exploration.rejections.length?"PARTIAL":"SUCCESS",null,null,null)
      :pageState("EMPTY","ALL_SCENARIOS_REJECTED","No accepted scenarios","Every generated candidate was rejected by deterministic scenario rules."),
  };
}

export function composeScenarioExplorerVM(args:{
  profileId:string;
  version:ScenarioProfileVersionApi;
  policy:CurrentOptimisationPolicyApi;
  persistedObjectives:ReadonlyArray<PersistedCustomerObjectiveApi>;
  selectedCustomerObjectiveId:string|null;
  candidateVehicles:ReadonlyArray<CandidateVehicleApi>;
  exploration:ScenarioExplorationApi|null;
}):ScenarioExplorerVM{
  const vehicleMode=args.version.values.find(item=>item.fieldId==="vehicle_mode")?.value==="PRE_PURCHASE"
    ?"PRE_PURCHASE" as const
    :"CURRENT_VEHICLE" as const;
  const controls=args.policy.catalogue.controls.map((control):OptimisationControlVM=>{
    const options=dynamicOptions(control,args.version.values,args.candidateVehicles);
    return {
      controlId:control.controlId,
      label:control.label,
      controlClass:"O",
      value:null,
      options,
      applicability:control.applicability,
      factualBoundary:control.factualBoundary,
      helpText:control.constraints.join(" "),
      action:controlAction(control,args.version,vehicleMode,options),
    };
  });
  const labels=new Map(args.policy.catalogue.controls.map(item=>[item.controlId,item.label] as const));
  const selected=args.persistedObjectives.find(item=>item.customerObjectiveId===args.selectedCustomerObjectiveId)??null;

  let state:PageStateVM;
  if(args.version.status!=="LOCKED"){
    state=pageState("BLOCKED","PROFILE_NOT_LOCKED","Lock your profile first","Scenario exploration reads an exact locked factual profile version.");
  }else if(!selected){
    state=pageState("PARTIAL","NO_OBJECTIVE","Select an objective","Choose an executable customer objective before generating scenarios.");
  }else{
    state=pageState("SUCCESS",null,null,null);
  }

  return {
    profileId:args.profileId,
    profileVersion:{
      versionId:args.version.versionId,
      versionNo:args.version.versionNo,
      status:args.version.status,
      lockedAt:args.version.lockedAt,
    },
    objectiveSelector:toObjectiveSelector({
      version:args.version,
      policy:args.policy,
      persisted:args.persistedObjectives,
      selectedCustomerObjectiveId:args.selectedCustomerObjectiveId,
    }),
    selectedCustomerObjectiveId:selected?.customerObjectiveId??null,
    controls,
    exploration:toExploration(args.exploration,labels),
    provenance:{
      catalogueVersion:args.policy.catalogueVersion,
      objectiveModelVersion:args.policy.objectiveModelVersion,
      policyFingerprint:args.policy.policyFingerprint,
      scenarioGeneratorVersion:args.policy.scenarioGeneratorVersion,
      explorationFingerprint:args.exploration?.explorationFingerprint??null,
    },
    pageState:state,
  };
}
