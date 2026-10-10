// Customer-copy prototype, not routed or approved for real customers.
import {fingerprint} from "./engine.mjs";
export const EXPLANATION_VERSION="BV4-EXPLAIN-001-v1.0";
const pounds=p=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(p/100);
const exposure=q=>q.excess.compulsory_pence+q.excess.voluntary_pence;
export function buildCandidateExplanation(request,decision){
  const opts=request.preferences,byId=new Map(request.quotes.map(q=>[q.quote_id,q]));
  const selected=byId.get(decision.selected_quote_id)??null;
  const cheapest=byId.get(decision.absolute_cheapest_eligible_quote_id)??null;
  if(decision.selected_quote_id!==null&&!selected)throw new Error("BV4_SELECTED_QUOTE_NOT_IN_SOURCE");
  if(decision.absolute_cheapest_eligible_quote_id!==null&&!cheapest)throw new Error("BV4_BENCHMARK_NOT_IN_SOURCE");
  const summary={
    label:"Synthetic comparison demonstration — not an insurance offer",
    status:decision.status,intentRevision:opts.intent_revision,
    constraints:{
      requiredCover:"Comprehensive",
      maxTotalExcess:opts.max_total_excess_pence===undefined?"Not specified":pounds(opts.max_total_excess_pence),
      maxTotalPayable:opts.max_total_payable_pence===undefined?"Not specified":pounds(opts.max_total_payable_pence),
      acceptedPaymentModes:opts.allowed_payment_modes,
      telematicsAccepted:opts.telematics_accepted
    },
    selected:null,cheapestBenchmark:null,tradeOff:null,
    excludedQuoteCount:decision.excluded.length,
    nondominatedAlternatives:decision.pareto_frontier_quote_ids,
    warnings:[
      "These quotations and policy benefits are entirely fictional test data.",
      "Quoted product features, prices, availability and insurer permissions are not independently verified.",
      "A lower contingent claim excess is not an annual premium saving.",
      "No accident or claim probability has been estimated.",
      "No external provider quotation, binding, payment or purchase handoff is available."
    ],
    nextStep:decision.status==="NO_QUOTES_MEET_PREFERENCES"?
      "No valid offer meets all your preferences. Only change a constraint if it genuinely reflects your needs.":
      decision.status==="NO_ELIGIBLE_QUOTES"?
      "No eligible comparable quote exists. No product can be selected.":
      "Inspect the synthetic trade-offs; this is not a purchase recommendation.",
    plainLanguage:true,explanationRuleVersion:EXPLANATION_VERSION
  };
  if(selected)summary.selected={
    quoteId:selected.quote_id,
    statement:"Meets all explicitly confirmed customer preferences.",
    totalPayable:pounds(selected.price.total_payable_pence),
    annualCashPremium:pounds(selected.price.annual_cash_premium_pence),
    financeCost:pounds(selected.price.finance_cost_pence),
    paymentMode:selected.price.payment_mode,
    totalExcess:pounds(exposure(selected)),
    compulsoryExcess:pounds(selected.excess.compulsory_pence),
    voluntaryExcess:pounds(selected.excess.voluntary_pence),
    requiresTelematics:selected.telematics_required,
    namedDriverCount:selected.named_driver_ids.length
  };
  if(cheapest)summary.cheapestBenchmark={
    quoteId:cheapest.quote_id,totalPayable:pounds(cheapest.price.total_payable_pence),
    totalExcess:pounds(exposure(cheapest)),
    statement:"Cheapest valid synthetic option before applying your maximum excess and budget constraints."
  };
  if(selected&&cheapest){
    const extra=selected.price.total_payable_pence-cheapest.price.total_payable_pence;
    const excessChange=exposure(selected)-exposure(cheapest);
    summary.tradeOff={
      additionalTotalPayablePence:extra,excessDifferencePence:excessChange,
      text:extra===0?"This has the lowest total payable among all valid mock quotes.":
        "You pay "+pounds(extra)+" more in total than the cheapest valid mock quote to meet your stated preferences. "+
        "The total excess is "+pounds(Math.abs(excessChange))+" "+(excessChange<0?"lower":excessChange>0?"higher":"different (no change)")+"."
    };
  }
  return Object.freeze({...summary,explanationFingerprint:fingerprint(summary)});
}
