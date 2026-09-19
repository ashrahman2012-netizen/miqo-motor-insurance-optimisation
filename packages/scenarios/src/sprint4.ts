import {createHash} from "node:crypto";
import {
  assertPermittedOptimisationControl,
  isOptimisationControl,
  optimisationCatalogue,
  type OptimisationControlId,
  type VehicleMode,
} from "../../optimisation/src/index.ts";

export const SP4_SCENARIO_GENERATOR_VERSION="sp4-gen-v1";
export const SP4_MAX_CANDIDATE_COMBINATIONS=64;

export type ScenarioChoiceSets=Readonly<Record<string,ReadonlyArray<unknown>>>;

export type ScenarioGenerationContext=Readonly<{
  vehicleMode:VehicleMode;
  mainDriverId?:string|null;
  genuineNamedDriverIds?:ReadonlyArray<string>;
  candidateVehicleIds?:ReadonlyArray<string>;
  currentVehicleId?:string|null;
}>;

export type ScenarioRejectionCategory=
  | "POLICY_INELIGIBLE"
  | "IMPOSSIBLE"
  | "CONTRADICTORY"
  | "NOT_ENABLED";

export type ScenarioCandidateRejection=Readonly<{
  ruleId:string;
  category:ScenarioRejectionCategory;
  reason:string;
}>;

export type ScenarioCandidate=Readonly<{
  ordinal:number;
  values:Readonly<Record<string,unknown>>;
  candidateFingerprint:string;
  rejections:ReadonlyArray<ScenarioCandidateRejection>;
}>;

const PERSISTABLE_CONTROLS=new Set<string>([
  "voluntary_excess",
  "payment_structure",
  "policy_start_date",
  "telematics_preference",
  "genuine_named_driver_inclusion",
  "candidate_vehicle",
]);

function canonicalise(value:unknown):unknown{
  if(Array.isArray(value)){
    const items=value.map(canonicalise);
    if(items.every(item=>["string","number","boolean"].includes(typeof item))){
      return [...items].sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return items;
  }
  if(value && typeof value==="object"){
    return Object.fromEntries(
      Object.entries(value as Record<string,unknown>)
        .sort(([a],[b])=>a.localeCompare(b))
        .map(([key,item])=>[key,canonicalise(item)]),
    );
  }
  return value;
}

function fingerprint(value:unknown){
  return createHash("sha256").update(JSON.stringify(canonicalise(value))).digest("hex");
}

function equalValue(a:unknown,b:unknown){
  return JSON.stringify(canonicalise(a))===JSON.stringify(canonicalise(b));
}

function validateControlValue(controlId:string,value:unknown,context:ScenarioGenerationContext):ScenarioCandidateRejection[]{
  const rejections:ScenarioCandidateRejection[]=[];
  if(!isOptimisationControl(controlId)){
    return [{
      ruleId:"CONTROL_NOT_IN_OPTIMISATION_CATALOGUE",
      category:"POLICY_INELIGIBLE",
      reason:`${controlId} is not an approved O-class optimisation control.`,
    }];
  }

  try{
    assertPermittedOptimisationControl(controlId,{vehicleMode:context.vehicleMode});
  }catch(error:any){
    return [{
      ruleId:"CONTROL_NOT_APPLICABLE",
      category:"POLICY_INELIGIBLE",
      reason:String(error?.message??error),
    }];
  }

  if(!PERSISTABLE_CONTROLS.has(controlId)){
    return [{
      ruleId:"CONTROL_NOT_ENABLED_FOR_SPRINT4_G3_G4",
      category:"NOT_ENABLED",
      reason:`${controlId} is catalogued but its persisted ScenarioDelta execution is reserved for a later Sprint 4 gate.`,
    }];
  }

  const control=optimisationCatalogue().controls.find(item=>item.controlId===controlId)!;
  const permitted=control.permittedValues;

  if(permitted.kind==="ENUM" && !permitted.values.some(item=>equalValue(item,value))){
    rejections.push({
      ruleId:"VALUE_OUTSIDE_CATALOGUE",
      category:"IMPOSSIBLE",
      reason:`${controlId} value is outside the permitted catalogue values.`,
    });
  }

  if(controlId==="policy_start_date"){
    if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))){
      rejections.push({
        ruleId:"INVALID_POLICY_START_DATE",
        category:"IMPOSSIBLE",
        reason:"policy_start_date must be a real ISO calendar date.",
      });
    }
  }

  if(controlId==="genuine_named_driver_inclusion"){
    if(!Array.isArray(value) || value.some(item=>typeof item!=="string" || !item.trim())){
      rejections.push({
        ruleId:"INVALID_NAMED_DRIVER_SET",
        category:"IMPOSSIBLE",
        reason:"genuine_named_driver_inclusion must be an array of genuine driver IDs.",
      });
    } else {
      const ids=value as string[];
      if(new Set(ids).size!==ids.length){
        rejections.push({
          ruleId:"DUPLICATE_NAMED_DRIVER",
          category:"CONTRADICTORY",
          reason:"A named-driver inclusion set cannot contain the same driver more than once.",
        });
      }
      if(context.mainDriverId && ids.includes(context.mainDriverId)){
        rejections.push({
          ruleId:"MAIN_DRIVER_CANNOT_BE_NAMED_DRIVER_DELTA",
          category:"CONTRADICTORY",
          reason:"The factual main driver cannot be reintroduced as a named-driver optimisation choice.",
        });
      }
      const allowed=new Set(context.genuineNamedDriverIds??[]);
      const unknown=ids.filter(id=>!allowed.has(id));
      if(unknown.length){
        rejections.push({
          ruleId:"UNKNOWN_GENUINE_NAMED_DRIVER",
          category:"POLICY_INELIGIBLE",
          reason:`Named-driver IDs are not present in the locked profile: ${unknown.sort().join(",")}`,
        });
      }
    }
  }

  if(controlId==="candidate_vehicle"){
    if(typeof value!=="string" || !value.trim()){
      rejections.push({
        ruleId:"INVALID_CANDIDATE_VEHICLE",
        category:"IMPOSSIBLE",
        reason:"candidate_vehicle must reference a persisted pre-purchase candidate vehicle ID.",
      });
    } else {
      if(context.currentVehicleId && value===context.currentVehicleId){
        rejections.push({
          ruleId:"CURRENT_VEHICLE_CANNOT_BE_CANDIDATE",
          category:"CONTRADICTORY",
          reason:"The factual/current vehicle cannot be reintroduced as a pre-purchase candidate choice.",
        });
      }
      const allowed=new Set(context.candidateVehicleIds??[]);
      if(!allowed.has(value)){
        rejections.push({
          ruleId:"UNKNOWN_CANDIDATE_VEHICLE",
          category:"POLICY_INELIGIBLE",
          reason:`Candidate vehicle is not present in the persisted pre-purchase candidate set: ${value}`,
        });
      }
    }
  }

  return rejections;
}

function canonicalCandidate(values:Record<string,unknown>){
  return Object.fromEntries(
    Object.entries(values)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([key,value])=>[key,canonicalise(value)]),
  );
}

export function scenarioExplorationFingerprint(args:{
  riskProfileVersionId:string;
  customerObjectiveId:string;
  catalogueVersion:string;
  policyFingerprint:string;
  choiceSets:ScenarioChoiceSets;
  context:ScenarioGenerationContext;
}){
  return fingerprint({
    generationVersion:SP4_SCENARIO_GENERATOR_VERSION,
    riskProfileVersionId:args.riskProfileVersionId,
    customerObjectiveId:args.customerObjectiveId,
    catalogueVersion:args.catalogueVersion,
    policyFingerprint:args.policyFingerprint,
    choiceSets:args.choiceSets,
    context:args.context,
  });
}

export function buildSprint4ScenarioCandidates(args:{
  choiceSets:ScenarioChoiceSets;
  context:ScenarioGenerationContext;
}):ReadonlyArray<ScenarioCandidate>{
  const entries=Object.entries(args.choiceSets)
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([key,rawValues])=>{
      if(!Array.isArray(rawValues) || rawValues.length===0)throw new Error(`EMPTY_CHOICE_SET:${key}`);
      const byFingerprint=new Map<string,unknown>();
      for(const value of rawValues)byFingerprint.set(fingerprint(value),canonicalise(value));
      const values=[...byFingerprint.values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
      return [key,values] as const;
    });

  if(!entries.length)throw new Error("EMPTY_SCENARIO_EXPLORATION");

  const count=entries.reduce((product,[,values])=>product*values.length,1);
  if(count>SP4_MAX_CANDIDATE_COMBINATIONS)throw new Error(`SCENARIO_EXPLORATION_LIMIT_EXCEEDED:${count}`);

  let matrix:Array<Record<string,unknown>>=[{}];
  for(const [key,values] of entries){
    const next:Array<Record<string,unknown>>=[];
    for(const row of matrix){
      for(const value of values)next.push({...row,[key]:value});
    }
    matrix=next;
  }

  const candidates=matrix
    .map(values=>canonicalCandidate(values))
    .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return Object.freeze(candidates.map((values,index)=>{
    const rejections=Object.entries(values)
      .flatMap(([controlId,value])=>validateControlValue(controlId,value,args.context))
      .sort((a,b)=>a.ruleId.localeCompare(b.ruleId)||a.reason.localeCompare(b.reason));

    return Object.freeze({
      ordinal:index+1,
      values:Object.freeze(values),
      candidateFingerprint:fingerprint(values),
      rejections:Object.freeze(rejections.map(item=>Object.freeze(item))),
    });
  }));
}

export function deterministicSprint4ScenarioId(explorationFingerprint:string,candidateFingerprint:string){
  return `SCN-SP4-${fingerprint({explorationFingerprint,candidateFingerprint}).slice(0,24)}`;
}

export function deterministicSprint4RejectionId(explorationFingerprint:string,candidateFingerprint:string,ruleId:string){
  return `REJ-SP4-${fingerprint({explorationFingerprint,candidateFingerprint,ruleId}).slice(0,24)}`;
}

export function isPersistableSprint4Control(value:string):value is OptimisationControlId{
  return PERSISTABLE_CONTROLS.has(value) && isOptimisationControl(value);
}
