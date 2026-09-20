import {createHash} from "node:crypto";
import type {ProviderCandidateRecord} from "./sp6-control-baseline.ts";

export const SP6_PROVIDER_CERTIFICATION_MODEL_VERSION="sp6-provider-certification-v1" as const;
export const SP6_SCHEMA_POLICY_VERSION="sp6-schema-policy-v1" as const;

export type ProviderCandidateApproval=Readonly<{
  candidate:ProviderCandidateRecord;
  evidenceClass:"EXTERNAL_PROVIDER";
  externalEvidenceReference:string;
  approvedForCertification:boolean;
}>;

export type FieldProvenance=Readonly<{
  providerField:string;
  semantic:"CUSTOMER_FACT"|"CUSTOMER_OPTION"|"PROTOCOL_CONSTANT";
  sourceClass:"FACT"|"OPTION"|"DERIVED_CONSTANT";
  sourcePath?:string;
  constantValue?:unknown;
}>;

export type ProviderSchema=Readonly<{
  schemaVersion:string;
  fields:ReadonlyArray<string>;
  requiredFields:ReadonlyArray<string>;
  unknownFieldPolicy:"REJECT"|"IGNORE_WITH_EVIDENCE";
}>;

export type ProviderCertificationContract=Readonly<{
  modelVersion:typeof SP6_PROVIDER_CERTIFICATION_MODEL_VERSION;
  providerKey:string;
  routeKey:string;
  adapterVersion:string;
  mappingVersion:string;
  requestSchema:ProviderSchema;
  responseSchema:ProviderSchema;
  fieldProvenance:ReadonlyArray<FieldProvenance>;
  mappingFingerprint:string;
  schemaFingerprint:string;
}>;

function stable(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
  const r=value as Record<string,unknown>;
  return "{"+Object.keys(r).sort().map(k=>JSON.stringify(k)+":"+stable(r[k])).join(",")+"}";
}
function hash(value:unknown){return createHash("sha256").update(stable(value)).digest("hex");}

export function assertProviderCandidateApprovedForCertification(approval:ProviderCandidateApproval){
  if(approval.evidenceClass!=="EXTERNAL_PROVIDER")throw new Error("PROVIDER_CANDIDATE_EXTERNAL_EVIDENCE_REQUIRED");
  if(!approval.externalEvidenceReference.trim())throw new Error("PROVIDER_CANDIDATE_EVIDENCE_REFERENCE_REQUIRED");
  if(!approval.approvedForCertification)throw new Error("PROVIDER_CANDIDATE_CERTIFICATION_APPROVAL_REQUIRED");
  if(approval.candidate.targetEnvironment!=="CERTIFICATION")throw new Error("PROVIDER_CANDIDATE_CERTIFICATION_ENVIRONMENT_REQUIRED");
  return approval;
}

export function assertMappingProvenance(entries:ReadonlyArray<FieldProvenance>){
  if(entries.length===0)throw new Error("PROVIDER_MAPPING_PROVENANCE_REQUIRED");
  const fields=new Set<string>();
  for(const entry of entries){
    if(!entry.providerField.trim())throw new Error("PROVIDER_MAPPING_FIELD_REQUIRED");
    if(fields.has(entry.providerField))throw new Error("PROVIDER_MAPPING_DUPLICATE_FIELD:"+entry.providerField);
    fields.add(entry.providerField);
    if(entry.semantic==="CUSTOMER_FACT"){
      if(entry.sourceClass!=="FACT"||!entry.sourcePath?.trim()||entry.constantValue!==undefined){
        throw new Error("PROVIDER_MAPPING_FACT_MUST_HAVE_FACT_SOURCE:"+entry.providerField);
      }
    }else if(entry.semantic==="CUSTOMER_OPTION"){
      if(entry.sourceClass!=="OPTION"||!entry.sourcePath?.trim()||entry.constantValue!==undefined){
        throw new Error("PROVIDER_MAPPING_OPTION_MUST_HAVE_OPTION_SOURCE:"+entry.providerField);
      }
    }else{
      if(entry.sourceClass!=="DERIVED_CONSTANT"||entry.sourcePath!==undefined||entry.constantValue===undefined){
        throw new Error("PROVIDER_MAPPING_PROTOCOL_CONSTANT_INVALID:"+entry.providerField);
      }
    }
  }
  return true;
}

export function assertSchemaDefinition(schema:ProviderSchema){
  if(!schema.schemaVersion.trim())throw new Error("PROVIDER_SCHEMA_VERSION_REQUIRED");
  if(schema.fields.length===0)throw new Error("PROVIDER_SCHEMA_FIELDS_REQUIRED");
  const fields=new Set(schema.fields);
  if(fields.size!==schema.fields.length)throw new Error("PROVIDER_SCHEMA_DUPLICATE_FIELD");
  for(const field of schema.requiredFields)if(!fields.has(field))throw new Error("PROVIDER_SCHEMA_REQUIRED_FIELD_UNDECLARED:"+field);
  return true;
}

export function validatePayloadAgainstSchema(schema:ProviderSchema,payload:Readonly<Record<string,unknown>>){
  assertSchemaDefinition(schema);
  const keys=Object.keys(payload);
  const unknown=keys.filter(k=>!schema.fields.includes(k)).sort();
  const missing=schema.requiredFields.filter(k=>!Object.prototype.hasOwnProperty.call(payload,k)).sort();
  if(missing.length)throw new Error("PROVIDER_SCHEMA_REQUIRED_FIELD_MISSING:"+missing.join(","));
  if(unknown.length&&schema.unknownFieldPolicy==="REJECT")throw new Error("PROVIDER_SCHEMA_UNKNOWN_FIELD:"+unknown.join(","));
  return Object.freeze({unknownFields:Object.freeze(unknown),policy:schema.unknownFieldPolicy});
}

export function buildProviderNeutralCertificationContract(args:Readonly<{
  providerKey:string;
  routeKey:string;
  adapterVersion:string;
  mappingVersion:string;
  requestSchema:ProviderSchema;
  responseSchema:ProviderSchema;
  fieldProvenance:ReadonlyArray<FieldProvenance>;
}>):ProviderCertificationContract{
  for(const value of [args.providerKey,args.routeKey,args.adapterVersion,args.mappingVersion]){
    if(!value.trim())throw new Error("PROVIDER_CERTIFICATION_METADATA_INCOMPLETE");
  }
  assertMappingProvenance(args.fieldProvenance);
  assertSchemaDefinition(args.requestSchema);
  assertSchemaDefinition(args.responseSchema);
  const mapped=new Set(args.fieldProvenance.map(x=>x.providerField));
  for(const field of args.requestSchema.fields)if(!mapped.has(field))throw new Error("PROVIDER_REQUEST_FIELD_PROVENANCE_MISSING:"+field);
  const mappingFingerprint=hash(args.fieldProvenance);
  const schemaFingerprint=hash({policyVersion:SP6_SCHEMA_POLICY_VERSION,requestSchema:args.requestSchema,responseSchema:args.responseSchema});
  return Object.freeze({
    modelVersion:SP6_PROVIDER_CERTIFICATION_MODEL_VERSION,
    ...args,
    fieldProvenance:Object.freeze(args.fieldProvenance.map(x=>Object.freeze({...x}))),
    mappingFingerprint,
    schemaFingerprint,
  });
}

export function bindContractToApprovedCandidate(contract:ProviderCertificationContract,approval:ProviderCandidateApproval){
  assertProviderCandidateApprovedForCertification(approval);
  if(contract.providerKey!==approval.candidate.providerKey)throw new Error("PROVIDER_CERTIFICATION_PROVIDER_MISMATCH");
  if(contract.routeKey!==approval.candidate.proposedRouteKey)throw new Error("PROVIDER_CERTIFICATION_ROUTE_MISMATCH");
  return Object.freeze({
    ...contract,
    candidateEvidenceReference:approval.externalEvidenceReference,
    certificationState:"READY_FOR_PROVIDER_CERTIFICATION" as const,
  });
}

export type CertificationEvidence=Readonly<{
  contractFingerprint:string;
  certificationRequestId:string;
  rawResponseHash:string;
  normalisationFingerprint:string;
  recommendationFingerprint:string;
}>;

export function certificationContractFingerprint(contract:ProviderCertificationContract){
  return hash(contract);
}

export function buildCertificationEvidence(args:CertificationEvidence){
  for(const value of Object.values(args))if(!value.trim())throw new Error("PROVIDER_CERTIFICATION_EVIDENCE_INCOMPLETE");
  for(const [key,value] of Object.entries(args)){
    if(key!=="certificationRequestId"&&!/^[0-9a-f]{64}$/.test(value))throw new Error("PROVIDER_CERTIFICATION_FINGERPRINT_INVALID:"+key);
  }
  return Object.freeze({...args,evidenceFingerprint:hash(args)});
}
