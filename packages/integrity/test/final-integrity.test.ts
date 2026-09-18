import test from "node:test";
import assert from "node:assert/strict";
import {evaluateFinalIntegrity} from "../src/index.ts";

const valid={
  selectedQuoteExists:true,
  selectionInShortlist:true,
  directlyComparable:true,
  rawProviderResponsePreserved:true,
  quoteRequestScenarioMatch:true,
  scenarioProfileMatch:true,
  profileStatus:"LOCKED",
  scenarioDeltasOOnly:true,
  blockingIntegritySignalPresent:false,
} as const;

test("final integrity passes only a fully reconciled selected quote lineage",()=>{
  const result=evaluateFinalIntegrity(valid);
  assert.equal(result.outcome,"PASS");
  assert.deepEqual(result.signals,[]);
});

test("SYN-007 stale source profile blocks final selection without repairing evidence",()=>{
  const result=evaluateFinalIntegrity({...valid,profileStatus:"SUPERSEDED"});
  assert.equal(result.outcome,"BLOCKED");
  assert.deepEqual(result.signals.map(signal=>signal.ruleId),["FINAL_PROFILE_VERSION_NOT_CURRENT_LOCKED"]);
});
