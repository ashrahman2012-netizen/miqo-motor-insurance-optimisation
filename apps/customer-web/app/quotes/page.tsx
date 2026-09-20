import {
  ComparisonStateBadge,
  FingerprintValue,
  LineageId,
  MoneyAmount,
  PageHeader,
  PageState,
  StatusBadge,
} from "@miqo/ui";
import type {NormalisedQuoteVM,ObjectiveExcludedQuoteVM,QuoteComparisonPageVM} from "@miqo/application-contracts";
import {resolveApplicationEnvironment} from "../environment";
import {resolveProfileId} from "../profile/profile-context";
import {loadQuoteComparison} from "./load-quotes";
import {QuoteComparisonControls} from "./quote-actions";
import styles from "./quotes.module.css";

function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}

function Metric({quote}:{quote:NormalisedQuoteVM}){
  if(quote.objectiveMetricValuePence===null)return <span>Not ranked</span>;
  return <div className={styles.metricValue}><MoneyAmount pence={quote.objectiveMetricValuePence}/><small>{quote.objectiveMetric?.replaceAll("_"," ")}</small></div>;
}

function RankedTable({quotes}:{quotes:ReadonlyArray<NormalisedQuoteVM>}){
  return <div className={styles.tableWrap}><table className={styles.quoteTable}>
    <thead><tr>
      <th>Rank</th><th>Market route</th><th>Scenario</th><th>Annual premium</th><th>Finance cost</th><th>Total excess</th><th>Comparison</th><th>Objective metric</th>
    </tr></thead>
    <tbody>{quotes.map(quote=><tr key={quote.normalisedQuoteId} className={quote.ordinal===1?styles.firstRank:""}>
      <td><strong>#{quote.ordinal}</strong></td>
      <td><div className={styles.routeCell}><strong>{quote.marketRoute.displayName}</strong><span>{quote.marketRoute.providerKey}</span></div></td>
      <td><LineageId value={quote.scenarioId} label="Scenario ID"/></td>
      <td><MoneyAmount pence={quote.pricing.annualCashPremiumPence}/></td>
      <td><MoneyAmount pence={quote.pricing.financeCostPence}/></td>
      <td><MoneyAmount pence={quote.excess.totalExcessExposurePence}/></td>
      <td><ComparisonStateBadge state={quote.comparisonState}/></td>
      <td><Metric quote={quote}/></td>
    </tr>)}</tbody>
  </table></div>;
}

function ExcludedRow({quote,reason}:{quote:NormalisedQuoteVM;reason:string}){
  return <article className={styles.excludedCard}>
    <div className={styles.excludedHead}>
      <div><strong>{quote.marketRoute.displayName}</strong><span>{quote.normalisedQuoteId}</span></div>
      <ComparisonStateBadge state={quote.comparisonState}/>
    </div>
    <dl>
      <div><dt>Annual premium</dt><dd><MoneyAmount pence={quote.pricing.annualCashPremiumPence}/></dd></div>
      <div><dt>Scenario</dt><dd><LineageId value={quote.scenarioId} label="Scenario"/></dd></div>
      <div><dt>Reason not ranked</dt><dd><code>{reason}</code></dd></div>
    </dl>
  </article>;
}

function ExcludedEvidence({vm}:{vm:QuoteComparisonPageVM}){
  const structural=(vm.comparison?.notComparable??[]).map(quote=>({quote,reason:quote.exclusionReason??quote.comparisonReason??"NOT_COMPARABLE"}));
  const objective=vm.objectiveExcluded.map((item:ObjectiveExcludedQuoteVM)=>({quote:item.quote,reason:item.exclusionReason}));
  const all=[...structural,...objective];
  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div><span className={styles.kicker}>Excluded / not ranked</span><h2>Comparison evidence retained</h2><p>Evidence outside the selected objective&apos;s ranked eligible set remains visible with its reason.</p></div>
      <StatusBadge status={all.length?"EXCLUDED":"PASS"} label={all.length?String(all.length):"NONE"}/>
    </div>
    {all.length?<div className={styles.excludedGrid}>{all.map(item=><ExcludedRow key={item.quote.normalisedQuoteId} quote={item.quote} reason={item.reason}/>)}</div>
      :<p className={styles.calm}>No quotation evidence is excluded from the current ranked set.</p>}
  </section>;
}

function Methodology(){
  return <section className={styles.methodPanel}>
    <div><span className={styles.kicker}>Comparison methodology</span><h2>Objective-specific, evidence-preserving ordering</h2></div>
    <div className={styles.methodGrid}>
      <article><strong>Direct comparison only</strong><span>Only eligible DIRECTLY_COMPARABLE evidence receives an ordinal rank.</span></article>
      <article><strong>Adjusted state dormant</strong><span>ADJUSTED_COMPARABLE never enters the ranked set under the current approved model.</span></article>
      <article><strong>No composite score</strong><span>Premium, finance cost and excess remain separate dimensions. They are not added into a fabricated universal cost.</span></article>
      <article><strong>Objective controls ordering</strong><span>The selected executable customer objective determines the comparison metric; commercial remuneration is not an input.</span></article>
    </div>
  </section>;
}

export default async function QuotesPage({searchParams}:{searchParams:Promise<{profileId?:string|string[];customerObjectiveId?:string|string[];explorationFingerprint?:string|string[]}>}){
  const environment=resolveApplicationEnvironment();
  if(!environment){
    return <main><PageHeader eyebrow="Quotes" title="Quote Comparison" description="Compare normalised quotation evidence."/><PageState state="NOT_AUTHORISED" title="Environment unavailable" message="The application environment could not be resolved, so quotation evidence is not presented."/></main>;
  }

  const profileId=await resolveProfileId(searchParams);
  if(!profileId){
    return <main className={styles.page}>
      <header className={styles.hero}><PageHeader eyebrow="Quotes" title="Quote Comparison" description="Compare eligible normalised quotations using the selected customer objective."/></header>
      <section className={styles.panel}><PageState state="EMPTY" title="No active profile" message="Create and lock a factual profile before quotation comparison can begin."/><a className="miqos-button miqos-button--primary" href="/profile/capture">Go to profile capture</a></section>
    </main>;
  }

  const params=await searchParams;
  const vm=await loadQuoteComparison({
    profileId,
    customerObjectiveId:first(params.customerObjectiveId)??null,
    explorationFingerprint:first(params.explorationFingerprint)??null,
    environment:environment.environment,
  });
  const ranked=vm.comparison?.directlyComparable??[];
  const objective=vm.comparison?.objective??null;

  return <main className={styles.page}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Quotes" title="Quote Comparison" description="Compare normalised quotation evidence without hiding comparability or objective eligibility."/>
      <div className={styles.heroStatement}>Same information.<br/><strong>Fairer comparison.</strong></div>
    </header>

    <section className={styles.contextPanel}>
      <div className={styles.contextItem}><span>Profile version</span><strong>v{vm.profileVersion.versionNo}</strong><StatusBadge status={vm.profileVersion.status}/></div>
      <div className={styles.contextItem}><span>Objective</span><strong>{objective?.label??"Not selected"}</strong></div>
      <div className={styles.contextItem}><span>Scenario set</span><strong>{vm.explorationFingerprint?vm.explorationFingerprint.slice(0,12)+"…":"Not selected"}</strong></div>
      <div className={styles.contextItem}><span>Quotation evidence</span><strong>{vm.normalisedQuoteCount}</strong><small>normalised quotes</small></div>
      <div className={styles.contextItem}><span>Sort</span><strong>{objective?"Selected objective · low to high":"Not available"}</strong></div>
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div><span className={styles.kicker}>Comparison scope</span><h2>Select scenario evidence and run authorised routes</h2><p>Quote execution is separate from scenario generation and remains environment controlled.</p></div>
        <a className={styles.link} href={"/optimise?profileId="+encodeURIComponent(profileId)}>Review scenarios →</a>
      </div>
      <QuoteComparisonControls
        profileId={profileId}
        customerObjectiveId={vm.customerObjectiveId}
        explorationFingerprint={vm.explorationFingerprint}
        explorations={vm.explorations}
        runAction={vm.runAction}
        hasQuotes={vm.quoteCount>0}
      />
    </section>

    <section className={styles.panel} id="ranked-quotes">
      <div className={styles.panelHeader}>
        <div><span className={styles.kicker}>Ranked eligible quotes</span><h2>{objective?.label??"Quote ordering"}</h2><p>{objective?.explanation??"Select an objective to establish comparison ordering."}</p></div>
        <div className={styles.counts}><span><strong>{ranked.length}</strong> ranked</span><span><strong>{vm.quoteCount}</strong> total evidence</span></div>
      </div>

      {ranked.length?<RankedTable quotes={ranked}/>:<PageState
        state={vm.pageState.state==="BLOCKED"?"BLOCKED":vm.pageState.state==="NOT_AUTHORISED"?"NOT_AUTHORISED":"EMPTY"}
        title={vm.pageState.title??"No ranked quotes"}
        message={vm.pageState.message??"No eligible quotation evidence is available for the current comparison."}
      />}

      {ranked.length&&ranked[0]?<div className={styles.rankOne}>
        <div><span className={styles.kicker}>Rank 1 for selected objective</span><strong>{ranked[0].marketRoute.displayName}</strong><small>This is an ordering result, not a customer recommendation.</small></div>
        <div><span>Objective metric</span><Metric quote={ranked[0]}/></div>
        {vm.customerObjectiveId&&vm.explorationFingerprint?<a className="miqos-button miqos-button--primary" href={"/results?profileId="+encodeURIComponent(profileId)+"&customerObjectiveId="+encodeURIComponent(vm.customerObjectiveId)+"&explorationFingerprint="+encodeURIComponent(vm.explorationFingerprint)}>Open Your Results</a>:null}
      </div>:null}
    </section>

    <ExcludedEvidence vm={vm}/>

    <div className={styles.bottomGrid}>
      <Methodology/>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className={styles.kicker}>Comparison provenance</span><h2>Reproducible evidence</h2></div></div>
        <dl className={styles.provenance}>
          <div><dt>Profile version</dt><dd><LineageId value={vm.profileVersion.versionId} label="Profile version"/></dd></div>
          <div><dt>Objective ID</dt><dd>{vm.customerObjectiveId?<LineageId value={vm.customerObjectiveId} label="Customer objective"/>:"Not selected"}</dd></div>
          <div><dt>Exploration fingerprint</dt><dd>{vm.explorationFingerprint?<FingerprintValue value={vm.explorationFingerprint}/>:"Not selected"}</dd></div>
          <div><dt>Comparison rule</dt><dd><code>{vm.comparisonRuleVersion??"Not executed"}</code></dd></div>
          <div><dt>Comparison fingerprint</dt><dd>{vm.comparisonFingerprint?<FingerprintValue value={vm.comparisonFingerprint}/>:"Not executed"}</dd></div>
        </dl>
      </section>
    </div>
  </main>;
}
