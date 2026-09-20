import test from "node:test";
import assert from "node:assert/strict";
import {analyseSprint4ObjectiveComparison,analyseSprint4Recommendations,buildSprint4RecommendationExplanation,compareNormalisedQuotes} from "../src/index.ts";

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


test("Sprint 4 recommendation analysis is deterministic and objective-specific",()=>{
  const input=[
    {
      normalisedQuoteId:"NOR-B",quoteRequestId:"REQ-B",scenarioId:"SCN-2",marketRouteId:"MR-2",routeKey:"ROUTE-B",
      comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:70000,financeCostPence:1200,
      compulsoryExcessPence:35000,voluntaryExcessPence:50000,paymentStructure:"MONTHLY",
    },
    {
      normalisedQuoteId:"NOR-A",quoteRequestId:"REQ-A",scenarioId:"SCN-1",marketRouteId:"MR-1",routeKey:"ROUTE-A",
      comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:68000,financeCostPence:2400,
      compulsoryExcessPence:35000,voluntaryExcessPence:25000,paymentStructure:"ANNUAL",
    },
  ];
  const args={
    objectiveId:"LOWEST_ANNUAL_PREMIUM" as const,
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"a".repeat(64),
    explorationFingerprint:"b".repeat(64),
  };
  const one=analyseSprint4Recommendations({...args,quotes:input});
  const two=analyseSprint4Recommendations({...args,quotes:[...input].reverse()});
  assert.deepEqual(two,one);
  assert.equal(one.surfacedNormalisedQuoteId,"NOR-A");
  assert.deepEqual(one.eligible.map(item=>item.normalisedQuoteId),["NOR-A","NOR-B"]);
});

test("Sprint 4 monthly commitment excludes annual scenarios and never includes excess",()=>{
  const result=analyseSprint4Recommendations({
    objectiveId:"LOWEST_MONTHLY_COMMITMENT",
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"c".repeat(64),
    explorationFingerprint:"d".repeat(64),
    quotes:[
      {
        normalisedQuoteId:"NOR-ANNUAL",quoteRequestId:"REQ-A",scenarioId:"SCN-A",marketRouteId:"MR-A",routeKey:"DIRECT",
        comparisonState:"DIRECTLY_COMPARABLE",annualCashPremiumPence:60000,financeCostPence:1200,
        compulsoryExcessPence:90000,voluntaryExcessPence:90000,paymentStructure:"ANNUAL",
      },
      {
        normalisedQuoteId:"NOR-MONTHLY",quoteRequestId:"REQ-M",scenarioId:"SCN-M",marketRouteId:"MR-M",routeKey:"PCW",
        comparisonState:"DIRECTLY_COMPARABLE",annualCashPremiumPence:72000,financeCostPence:1200,
        compulsoryExcessPence:500000,voluntaryExcessPence:500000,paymentStructure:"MONTHLY",
      },
    ],
  });
  assert.equal(result.eligible.length,1);
  assert.equal(result.eligible[0].objectiveMetric,"monthly_commitment_pence");
  assert.equal(result.eligible[0].objectiveMetricValuePence,6100);
  assert.equal(result.excluded[0].exclusionReason,"PAYMENT_STRUCTURE_NOT_MONTHLY");
  assert.equal((result.eligible[0] as any).effectiveCostPence,undefined);
});

test("Sprint 4 excess objective uses excess exposure only and ADJUSTED_COMPARABLE is excluded",()=>{
  const result=analyseSprint4Recommendations({
    objectiveId:"LOWER_EXCESS_EXPOSURE",
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"e".repeat(64),
    explorationFingerprint:"f".repeat(64),
    quotes:[
      {
        normalisedQuoteId:"NOR-DIRECT",quoteRequestId:"REQ-D",scenarioId:"SCN-D",marketRouteId:"MR-D",routeKey:"DIRECT",
        comparisonState:"DIRECTLY_COMPARABLE",annualCashPremiumPence:999999,financeCostPence:999999,
        compulsoryExcessPence:20000,voluntaryExcessPence:30000,paymentStructure:"ANNUAL",
      },
      {
        normalisedQuoteId:"NOR-ADJ",quoteRequestId:"REQ-X",scenarioId:"SCN-X",marketRouteId:"MR-X",routeKey:"PCW",
        comparisonState:"ADJUSTED_COMPARABLE",annualCashPremiumPence:1,financeCostPence:0,
        compulsoryExcessPence:1,voluntaryExcessPence:1,paymentStructure:"ANNUAL",
      },
    ],
  });
  assert.equal(result.eligible[0].objectiveMetricValuePence,50000);
  assert.equal(result.excluded[0].normalisedQuoteId,"NOR-ADJ");
  assert.equal(result.excluded[0].exclusionReason,"COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE");
  assert.equal((result as any).effectiveCostPence,undefined);
});

test("Sprint 4 balanced objective remains dormant",()=>{
  assert.throws(()=>analyseSprint4Recommendations({
    objectiveId:"BALANCED_COST_AND_EXPOSURE",
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"1".repeat(64),
    explorationFingerprint:"2".repeat(64),
    quotes:[],
  }),/CUSTOMER_OBJECTIVE_DORMANT/);
});


test("S4-G11 explanation fingerprint is deterministic and preserves objective, controls, route applicability and evidence",()=>{
  const args={
    recommendationSetId:"REC-1",
    objectiveId:"LOWEST_ANNUAL_PREMIUM" as const,
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"a".repeat(64),
    recommendationRuleVersion:"sp4-recommendation-v1",
    recommendationFingerprint:"b".repeat(64),
    surfacedNormalisedQuoteId:"NOR-1",
    surfacedScenarioId:"SCN-1",
    surfacedMarketRouteId:"MR-1",
    controls:[{
      fieldOrControl:"voluntary_excess",
      classification:"CONTROLLABLE" as const,
      source:"scenario_delta",
      customerCanChange:true,
      baselineValue:250,
      scenarioValue:500,
      quotedEffectIfObservable:{
        objectiveMetric:"annual_cash_premium_pence",
        baselineValuePence:71000,
        scenarioValuePence:68000,
        differencePence:-3000,
      },
      legitimacyReason:"Customer-selectable voluntary excess within the approved catalogue.",
      providerChannelApplicability:{
        marketRouteId:"MR-1",routeKey:"MOCK-001-DIRECT",providerKey:"MOCK-PROVIDER-001",
        channelKey:"DIRECT_SYNTHETIC",adapterVersion:"mock-adapter-v1",mappingVersion:"mock-mapping-v1",
      },
    }],
    eligibleEvidence:[{
      normalisedQuoteId:"NOR-1",scenarioId:"SCN-1",marketRouteId:"MR-1",ordinal:1,
      objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:68000,evidenceFingerprint:"c".repeat(64),
    }],
    excludedEvidence:[{
      normalisedQuoteId:"NOR-X",scenarioId:"SCN-X",marketRouteId:"MR-2",
      exclusionReason:"COMPARISON_STATE_NOT_COMPARABLE",evidenceFingerprint:"d".repeat(64),
    }],
  };
  const one=buildSprint4RecommendationExplanation(args);
  const two=buildSprint4RecommendationExplanation({...args,controls:[...args.controls].reverse()});
  assert.deepEqual(two,one);
  assert.match(one.explanationFingerprint,/^[0-9a-f]{64}$/);
  assert.equal(one.controls[0].baselineValue,250);
  assert.equal(one.controls[0].scenarioValue,500);
  assert.equal((one.controls[0].providerChannelApplicability as any).routeKey,"MOCK-001-DIRECT");
  assert.equal(one.materialReasons.at(-1)?.code,"COMMERCIAL_INPUTS_EXCLUDED");
});

test("S4-G12 synthetic remuneration metadata cannot influence eligibility, metrics, fingerprint, ordering or surfaced quote",()=>{
  const base={
    objectiveId:"LOWEST_ANNUAL_PREMIUM" as const,
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"e".repeat(64),
    explorationFingerprint:"f".repeat(64),
    quotes:[
      {
        normalisedQuoteId:"NOR-1",quoteRequestId:"REQ-1",scenarioId:"SCN-1",marketRouteId:"MR-1",routeKey:"DIRECT",
        comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:65000,financeCostPence:2000,
        compulsoryExcessPence:25000,voluntaryExcessPence:50000,paymentStructure:"ANNUAL",
      },
      {
        normalisedQuoteId:"NOR-2",quoteRequestId:"REQ-2",scenarioId:"SCN-2",marketRouteId:"MR-2",routeKey:"PCW",
        comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:67000,financeCostPence:0,
        compulsoryExcessPence:20000,voluntaryExcessPence:25000,paymentStructure:"ANNUAL",
      },
    ],
  };
  const noCommercial=analyseSprint4Recommendations(base);
  const highCommission=analyseSprint4Recommendations({
    ...base,
    commercialMetadata:{
      "MR-1":{providerRemunerationPence:999999,introducerRemunerationPence:500000,referralRevenuePence:250000},
      "MR-2":{providerRemunerationPence:0,introducerRemunerationPence:0,referralRevenuePence:0},
    },
  } as any);
  const reversedCommission=analyseSprint4Recommendations({
    ...base,
    commercialMetadata:{
      "MR-1":{providerRemunerationPence:0,introducerRemunerationPence:0,referralRevenuePence:0},
      "MR-2":{providerRemunerationPence:999999,introducerRemunerationPence:500000,referralRevenuePence:250000},
    },
  } as any);

  for(const result of [highCommission,reversedCommission]){
    assert.equal(result.recommendationFingerprint,noCommercial.recommendationFingerprint);
    assert.equal(result.surfacedNormalisedQuoteId,noCommercial.surfacedNormalisedQuoteId);
    assert.deepEqual(
      result.eligible.map(item=>[item.normalisedQuoteId,item.ordinal,item.objectiveMetric,item.objectiveMetricValuePence]),
      noCommercial.eligible.map(item=>[item.normalisedQuoteId,item.ordinal,item.objectiveMetric,item.objectiveMetricValuePence]),
    );
    assert.deepEqual(
      result.excluded.map(item=>[item.normalisedQuoteId,item.exclusionReason]),
      noCommercial.excluded.map(item=>[item.normalisedQuoteId,item.exclusionReason]),
    );
  }
});


test("BUILD-001E neutral comparison ranks only eligible objective evidence without creating a surfaced decision",()=>{
  const result=analyseSprint4ObjectiveComparison({
    objectiveId:"LOWEST_ANNUAL_PREMIUM",
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"9".repeat(64),
    explorationFingerprint:"8".repeat(64),
    quotes:[
      {normalisedQuoteId:"NOR-B",quoteRequestId:"REQ-B",scenarioId:"SCN-B",marketRouteId:"MR-B",routeKey:"PCW",comparisonState:"DIRECTLY_COMPARABLE",annualCashPremiumPence:70000,financeCostPence:0,compulsoryExcessPence:25000,voluntaryExcessPence:25000,paymentStructure:"ANNUAL"},
      {normalisedQuoteId:"NOR-A",quoteRequestId:"REQ-A",scenarioId:"SCN-A",marketRouteId:"MR-A",routeKey:"DIRECT",comparisonState:"DIRECTLY_COMPARABLE",annualCashPremiumPence:65000,financeCostPence:0,compulsoryExcessPence:30000,voluntaryExcessPence:50000,paymentStructure:"ANNUAL"},
      {normalisedQuoteId:"NOR-X",quoteRequestId:"REQ-X",scenarioId:"SCN-X",marketRouteId:"MR-X",routeKey:"OTHER",comparisonState:"ADJUSTED_COMPARABLE",annualCashPremiumPence:1,financeCostPence:0,compulsoryExcessPence:1,voluntaryExcessPence:1,paymentStructure:"ANNUAL"},
    ],
  });
  assert.equal(result.comparisonRuleVersion,"sp4-objective-comparison-v1");
  assert.deepEqual(result.eligible.map(item=>[item.normalisedQuoteId,item.ordinal]),[["NOR-A",1],["NOR-B",2]]);
  assert.equal(result.excluded[0].normalisedQuoteId,"NOR-X");
  assert.equal(result.excluded[0].exclusionReason,"COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE");
  assert.equal((result as any).surfacedNormalisedQuoteId,undefined);
  assert.equal((result as any).effectiveCostPence,undefined);
});
