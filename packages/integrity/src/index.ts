export const FINAL_INTEGRITY_RULE_VERSION="sp3-final-integrity-v1";

export type FinalIntegrityRuleId =
  | "FINAL_SELECTED_QUOTE_UNAVAILABLE"
  | "FINAL_SELECTION_NOT_IN_SHORTLIST"
  | "FINAL_QUOTE_NOT_DIRECTLY_COMPARABLE"
  | "FINAL_RAW_PROVIDER_RESPONSE_UNAVAILABLE"
  | "FINAL_QUOTE_REQUEST_SCENARIO_MISMATCH"
  | "FINAL_SCENARIO_PROFILE_MISMATCH"
  | "FINAL_PROFILE_VERSION_NOT_CURRENT_LOCKED"
  | "FINAL_SCENARIO_CONTAINS_NON_O_DELTA"
  | "FINAL_BLOCKING_INTEGRITY_SIGNAL_PRESENT";

export type FinalIntegrityInput=Readonly<{
  selectedQuoteExists:boolean;
  selectionInShortlist:boolean;
  directlyComparable:boolean;
  rawProviderResponsePreserved:boolean;
  quoteRequestScenarioMatch:boolean;
  scenarioProfileMatch:boolean;
  profileStatus:string|null;
  scenarioDeltasOOnly:boolean;
  blockingIntegritySignalPresent:boolean;
}>;

export function evaluateFinalIntegrity(input:FinalIntegrityInput){
  const signals:Array<{ruleId:FinalIntegrityRuleId;evidence:Record<string,unknown>}>=[];

  if(!input.selectedQuoteExists) signals.push({ruleId:"FINAL_SELECTED_QUOTE_UNAVAILABLE",evidence:{}});
  if(!input.selectionInShortlist) signals.push({ruleId:"FINAL_SELECTION_NOT_IN_SHORTLIST",evidence:{}});
  if(!input.directlyComparable) signals.push({ruleId:"FINAL_QUOTE_NOT_DIRECTLY_COMPARABLE",evidence:{}});
  if(!input.rawProviderResponsePreserved) signals.push({ruleId:"FINAL_RAW_PROVIDER_RESPONSE_UNAVAILABLE",evidence:{}});
  if(!input.quoteRequestScenarioMatch) signals.push({ruleId:"FINAL_QUOTE_REQUEST_SCENARIO_MISMATCH",evidence:{}});
  if(!input.scenarioProfileMatch) signals.push({ruleId:"FINAL_SCENARIO_PROFILE_MISMATCH",evidence:{}});
  if(input.profileStatus!=="LOCKED") signals.push({
    ruleId:"FINAL_PROFILE_VERSION_NOT_CURRENT_LOCKED",
    evidence:{profileStatus:input.profileStatus},
  });
  if(!input.scenarioDeltasOOnly) signals.push({ruleId:"FINAL_SCENARIO_CONTAINS_NON_O_DELTA",evidence:{}});
  if(input.blockingIntegritySignalPresent) signals.push({ruleId:"FINAL_BLOCKING_INTEGRITY_SIGNAL_PRESENT",evidence:{}});

  return Object.freeze({
    integrityRuleVersion:FINAL_INTEGRITY_RULE_VERSION,
    outcome:signals.length?"BLOCKED" as const:"PASS" as const,
    signals:Object.freeze(signals.map(signal=>Object.freeze(signal))),
  });
}
