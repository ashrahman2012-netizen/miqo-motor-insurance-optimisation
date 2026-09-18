import {createHash} from "node:crypto";

export const COMPARISON_RULE_VERSION="sp3-comparison-v1";

export type ComparableQuote=Readonly<{
  normalisedQuoteId:string;
  comparisonState:"DIRECTLY_COMPARABLE"|"ADJUSTED_COMPARABLE"|"NOT_COMPARABLE";
  annualCashPremiumPence:number|null;
  compulsoryExcessPence:number|null;
  voluntaryExcessPence:number|null;
}>;

function canonicalQuote(quote:ComparableQuote){
  return {
    normalisedQuoteId:quote.normalisedQuoteId,
    comparisonState:quote.comparisonState,
    annualCashPremiumPence:quote.annualCashPremiumPence,
    compulsoryExcessPence:quote.compulsoryExcessPence,
    voluntaryExcessPence:quote.voluntaryExcessPence,
  };
}

export function compareNormalisedQuotes(input:ReadonlyArray<ComparableQuote>){
  const directlyComparable=input
    .filter(quote=>quote.comparisonState==="DIRECTLY_COMPARABLE" && quote.annualCashPremiumPence!==null)
    .map(canonicalQuote)
    .sort((a,b)=>
      Number(a.annualCashPremiumPence)-Number(b.annualCashPremiumPence)
      || a.normalisedQuoteId.localeCompare(b.normalisedQuoteId)
    );

  const notComparable=input
    .filter(quote=>quote.comparisonState!=="DIRECTLY_COMPARABLE")
    .map(canonicalQuote)
    .sort((a,b)=>a.normalisedQuoteId.localeCompare(b.normalisedQuoteId));

  const fingerprint=createHash("sha256").update(JSON.stringify({
    comparisonRuleVersion:COMPARISON_RULE_VERSION,
    directlyComparable,
    notComparable,
  })).digest("hex");

  return Object.freeze({
    comparisonRuleVersion:COMPARISON_RULE_VERSION,
    comparisonFingerprint:fingerprint,
    lowestDirectlyComparablePremiumId:directlyComparable[0]?.normalisedQuoteId??null,
    directlyComparable:Object.freeze(directlyComparable.map((quote,index)=>Object.freeze({...quote,ordinal:index+1}))),
    notComparable:Object.freeze(notComparable),
  });
}
