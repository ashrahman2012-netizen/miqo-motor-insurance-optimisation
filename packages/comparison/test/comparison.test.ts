import test from "node:test";
import assert from "node:assert/strict";
import {compareNormalisedQuotes} from "../src/index.ts";

const quotes=[
  {normalisedQuoteId:"Q-003",comparisonState:"NOT_COMPARABLE" as const,annualCashPremiumPence:64200,compulsoryExcessPence:null,voluntaryExcessPence:null},
  {normalisedQuoteId:"Q-002",comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:68100,compulsoryExcessPence:25000,voluntaryExcessPence:40000},
  {normalisedQuoteId:"Q-001",comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:66500,compulsoryExcessPence:30000,voluntaryExcessPence:50000},
];

test("comparison is deterministic regardless of persisted input order",()=>{
  const one=compareNormalisedQuotes(quotes);
  const two=compareNormalisedQuotes([...quotes].reverse());
  assert.deepEqual(two,one);
  assert.equal(one.lowestDirectlyComparablePremiumId,"Q-001");
  assert.deepEqual(one.directlyComparable.map(item=>item.normalisedQuoteId),["Q-001","Q-002"]);
  assert.deepEqual(one.notComparable.map(item=>item.normalisedQuoteId),["Q-003"]);
});

test("comparison never creates a premium-plus-excess universal score",()=>{
  const result=compareNormalisedQuotes(quotes);
  assert.equal((result as any).effectiveCostPence,undefined);
  assert.equal((result.directlyComparable[0] as any).effectiveCostPence,undefined);
});
