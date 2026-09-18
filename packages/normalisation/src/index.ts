import { createHash } from "node:crypto";

export const NORMALISATION_VERSION="sp2-normaliser-v1";

export type ComparisonState="DIRECTLY_COMPARABLE"|"NOT_COMPARABLE";

export type NormalisedQuoteResult=Readonly<{
  normalisationVersion:typeof NORMALISATION_VERSION;
  comparisonState:ComparisonState;
  comparisonReason:string;
  annualCashPremiumPence:number|null;
  financeCostPence:number|null;
  compulsoryExcessPence:number|null;
  voluntaryExcessPence:number|null;
  normalisationFingerprint:string;
}>;

function integerOrNull(value:unknown){
  return Number.isInteger(value) && Number(value)>=0 ? Number(value) : null;
}

export function normaliseMockProviderPayload(args:{payloadText:string;payloadSha256:string}):NormalisedQuoteResult {
  let payload:any;
  try { payload=JSON.parse(args.payloadText); }
  catch {
    return notComparable(args,"INVALID_PROVIDER_JSON");
  }

  const quote=payload?.quote;
  const annual=integerOrNull(quote?.annualPremiumPence);
  const base=integerOrNull(quote?.baseExcessPence);
  const voluntary=integerOrNull(quote?.voluntaryExcessPence);
  const paymentBasis=quote?.paymentBasis;
  const coverage=Array.isArray(quote?.coverageMarkers)?quote.coverageMarkers:[];

  const directlyComparable=
    payload?.provider==="MOCK-PROVIDER-001"
    && annual!==null
    && base!==null
    && voluntary!==null
    && (paymentBasis==="ANNUAL" || paymentBasis==="MONTHLY")
    && coverage.includes("COMPREHENSIVE");

  const output=directlyComparable
    ? {
        comparisonState:"DIRECTLY_COMPARABLE" as const,
        comparisonReason:"REQUIRED_FIELDS_PRESENT",
        annualCashPremiumPence:annual,
        financeCostPence:0,
        compulsoryExcessPence:base,
        voluntaryExcessPence:voluntary,
      }
    : {
        comparisonState:"NOT_COMPARABLE" as const,
        comparisonReason:"MISSING_OR_UNSUPPORTED_REQUIRED_PROVIDER_FIELDS",
        annualCashPremiumPence:null,
        financeCostPence:null,
        compulsoryExcessPence:null,
        voluntaryExcessPence:null,
      };

  const normalisationFingerprint=createHash("sha256").update(JSON.stringify({
    rawPayloadSha256:args.payloadSha256,
    normalisationVersion:NORMALISATION_VERSION,
    ...output,
  })).digest("hex");

  return Object.freeze({normalisationVersion:NORMALISATION_VERSION,...output,normalisationFingerprint});
}

function notComparable(args:{payloadText:string;payloadSha256:string},comparisonReason:string):NormalisedQuoteResult {
  const output={
    normalisationVersion:NORMALISATION_VERSION,
    comparisonState:"NOT_COMPARABLE" as const,
    comparisonReason,
    annualCashPremiumPence:null,
    financeCostPence:null,
    compulsoryExcessPence:null,
    voluntaryExcessPence:null,
  } as const;
  const normalisationFingerprint=createHash("sha256").update(JSON.stringify({
    rawPayloadSha256:args.payloadSha256,
    ...output,
  })).digest("hex");
  return Object.freeze({...output,normalisationFingerprint});
}
