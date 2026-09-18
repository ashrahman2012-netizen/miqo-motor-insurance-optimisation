import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { normaliseMockProviderPayload } from "../src/index.ts";

function input(payload:any){
  const payloadText=JSON.stringify(payload);
  return {payloadText,payloadSha256:createHash("sha256").update(payloadText).digest("hex")};
}

test("standard mock-provider payload normalises as DIRECTLY_COMPARABLE with premium and excess kept separate",()=>{
  const result=normaliseMockProviderPayload(input({
    provider:"MOCK-PROVIDER-001",
    quote:{
      annualPremiumPence:70140,
      baseExcessPence:35000,
      voluntaryExcessPence:50000,
      totalExcessPence:85000,
      paymentBasis:"ANNUAL",
      coverageMarkers:["COMPREHENSIVE"],
    },
  }));
  assert.equal(result.comparisonState,"DIRECTLY_COMPARABLE");
  assert.equal(result.annualCashPremiumPence,70140);
  assert.equal(result.compulsoryExcessPence,35000);
  assert.equal(result.voluntaryExcessPence,50000);
  assert.equal((result as any).effectiveCostPence,undefined);
});

test("incomplete provider payload is NOT_COMPARABLE without fabricated monetary dimensions",()=>{
  const result=normaliseMockProviderPayload(input({
    provider:"MOCK-PROVIDER-001",
    offer:{premium:{amountPence:68800},paymentBasis:"ANNUAL"},
    coverage:null,
  }));
  assert.equal(result.comparisonState,"NOT_COMPARABLE");
  assert.equal(result.annualCashPremiumPence,null);
  assert.equal(result.compulsoryExcessPence,null);
  assert.equal(result.voluntaryExcessPence,null);
});

test("normalisation is deterministic and never produces ADJUSTED_COMPARABLE",()=>{
  const args=input({provider:"MOCK-PROVIDER-001",quote:{annualPremiumPence:1}});
  const one=normaliseMockProviderPayload(args);
  const two=normaliseMockProviderPayload(args);
  assert.deepEqual(two,one);
  assert.notEqual(one.comparisonState,"ADJUSTED_COMPARABLE");
});
