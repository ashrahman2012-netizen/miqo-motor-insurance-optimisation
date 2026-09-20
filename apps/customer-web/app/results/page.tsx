import {
  ComparisonStateBadge,
  FingerprintValue,
  IntegrityBadge,
  LineageId,
  MoneyAmount,
  PageHeader,
  PageState,
  StatusBadge,
} from "@miqo/ui";
import type {NormalisedQuoteVM,ResultReasonVM} from "@miqo/application-contracts";
import {resolveApplicationEnvironment} from "../environment";
import {resolveProfileId} from "../profile/profile-context";
import {GenerateResultsButton,FinalIntegrityButton} from "./results-actions";
import {loadResultsPage} from "./load-results";
import styles from "./results.module.css";

function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}

function SurfaceMetric({quote}:{quote:NormalisedQuoteVM}){
  return <dl className={styles.surfaceMetrics}>
    <div><dt>Annual premium</dt><dd><MoneyAmount pence={quote.pricing.annualCashPremiumPence}/></dd></div>
    <div><dt>Finance cost</dt><dd><MoneyAmount pence={quote.pricing.financeCostPence}/></dd></div>
    <div><dt>Compulsory excess</dt><dd><MoneyAmount pence={quote.excess.compulsoryExcessPence}/></dd></div>
    <div><dt>Voluntary excess</dt><dd><MoneyAmount pence={quote.excess.voluntaryExcessPence}/></dd></div>
  </dl>;
}

function ReasonCard({reason}:{reason:ResultReasonVM}){
  return <article className={reason.controlClass==="O"?styles.reasonCard+" "+styles.reasonChoice:styles.reasonCard}>
    <div className={styles.reasonTitle}>
      <span aria-hidden="true">{reason.controlClass==="O"?"O":"•"}</span>
      <strong>{reason.title}</strong>
    </div>
    <p>{reason.detail}</p>
  </article>;
}

function AlternativeRows({quotes,surfaced}:{quotes:ReadonlyArray<NormalisedQuoteVM>;surfaced:NormalisedQuoteVM}){
  return <div className={styles.tableWrap}><table className={styles.alternativeTable}>
    <thead><tr><th>Rank</th><th>Route</th><th>Annual premium</th><th>Difference</th><th>Total excess</th></tr></thead>
    <tbody>{quotes.map(quote=>{
      const difference=quote.pricing.annualCashPremiumPence-surfaced.pricing.annualCashPremiumPence;
      return <tr key={quote.normalisedQuoteId}>
        <td>#{quote.ordinal??"—"}</td>
        <td><strong>{quote.marketRoute.displayName}</strong><small>{quote.marketRoute.providerKey}</small></td>
        <td><MoneyAmount pence={quote.pricing.annualCashPremiumPence}/></td>
        <td className={difference>=0?styles.positiveDifference:styles.negativeDifference}>{difference>=0?"+":""}<MoneyAmount pence={Math.abs(difference)}/></td>
        <td><MoneyAmount pence={quote.excess.totalExcessExposurePence}/></td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export default async function ResultsPage({searchParams}:{searchParams:Promise<{
  profileId?:string|string[];
  customerObjectiveId?:string|string[];
  explorationFingerprint?:string|string[];
  selectionId?:string|string[];
}>}){
  const environment=resolveApplicationEnvironment();
  if(!environment){
    return <main><PageHeader eyebrow="Your Results" title="Your Results" description="Objective-specific results and explainability."/><PageState state="NOT_AUTHORISED" title="Environment unavailable" message="The application environment could not be resolved, so result evidence is not presented."/></main>;
  }

  const profileId=await resolveProfileId(searchParams);
  if(!profileId){
    return <main className={styles.page}>
      <header className={styles.hero}><PageHeader eyebrow="Your Results" title="Your Results" description="Understand why a result surfaced and what can happen next."/></header>
      <section className={styles.panel}><PageState state="EMPTY" title="No active profile" message="Open a locked profile and generate quotation evidence before Your Results can be created."/></section>
    </main>;
  }

  const params=await searchParams;
  const vm=await loadResultsPage({
    profileId,
    customerObjectiveId:first(params.customerObjectiveId)??null,
    explorationFingerprint:first(params.explorationFingerprint)??null,
    selectionId:first(params.selectionId)??null,
    environment:environment.environment,
  });

  if(!vm.detail){
    const canGenerate=vm.customerObjectiveId&&vm.explorationFingerprint;
    return <main className={styles.page}>
      <header className={styles.hero}>
        <PageHeader eyebrow="Your Results" title="Your Results" description="Persist the objective-specific result set and plain-language explanation from existing comparison evidence."/>
        <div className={styles.heroStatement}>Same information.<br/><strong>Clearer outcomes.</strong></div>
      </header>
      <section className={styles.panel}>
        <PageState
          state={vm.pageState.state==="BLOCKED"?"BLOCKED":vm.pageState.state==="NOT_AUTHORISED"?"NOT_AUTHORISED":vm.pageState.state==="ERROR"?"ERROR":"EMPTY"}
          title={vm.pageState.title??"Your Results are not available yet"}
          message={vm.pageState.message??"Complete quote comparison before generating Your Results."}
        />
        {canGenerate?<div className={styles.emptyAction}><GenerateResultsButton
          profileId={profileId}
          customerObjectiveId={vm.customerObjectiveId!}
          explorationFingerprint={vm.explorationFingerprint!}
          availability={vm.generateAction}
        /></div>:null}
      </section>
    </main>;
  }

  const detail=vm.detail;
  const surfaced=detail.surfacedResult;
  if(!surfaced){
    return <main><PageHeader eyebrow="Your Results" title="Your Results" description="Persisted result evidence"/><PageState state="ERROR" title="Surfaced result unavailable" message="The persisted result set does not resolve to quotation evidence in the selected comparison."/></main>;
  }

  const commercialReason=detail.whyThisSurfaced.find(item=>item.title==="Commercial independence");
  const otherReasons=detail.whyThisSurfaced.filter(item=>item!==commercialReason);

  return <main className={styles.page}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Your Results" title="Why This Surfaced" description="Understand the objective-specific evidence behind the surfaced result and the controlled next step."/>
      <div className={styles.heroStatement}>Same information.<br/><strong>Transparent outcome.</strong></div>
    </header>

    <section className={styles.surfacePanel} data-testid="results-surfaced">
      <div className={styles.surfaceRank}>
        <span className={styles.rankIcon} aria-hidden="true">★</span>
        <div><span>Surfaced result</span><strong>#{surfaced.ordinal??1}</strong><small>For your selected objective</small></div>
      </div>
      <div className={styles.surfaceIdentity}>
        <span>Market route</span>
        <strong>{surfaced.marketRoute.displayName}</strong>
        <small>{surfaced.marketRoute.providerKey} · {surfaced.marketRoute.channelKey.replaceAll("_"," ")}</small>
        <ComparisonStateBadge state={surfaced.comparisonState}/>
      </div>
      <SurfaceMetric quote={surfaced}/>
      <div className={styles.surfaceLineage}>
        <div><span>Scenario</span><LineageId value={surfaced.scenarioId} label="Scenario ID"/></div>
        <div><span>Result set</span><LineageId value={detail.resultSetId} label="Result set ID"/></div>
      </div>
    </section>

    <div className={styles.contentGrid}>
      <div className={styles.leftColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><span className={styles.kicker}>Explainability</span><h2>Why This Surfaced</h2><p>Reasons come from persisted recommendation and explanation evidence, not generated UI copy about insurer behaviour.</p></div>
            <StatusBadge status="READY"/>
          </div>
          <div className={styles.reasonList}>{otherReasons.map(reason=><ReasonCard key={reason.reasonId} reason={reason}/>)}</div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.kicker}>Next step / handoff</span><h2>Controlled handoff state</h2><p>{detail.handoff.disclosure}</p></div></div>
          <div className={styles.handoffActions}>
            <button className={styles.primaryAction} type="button" disabled={detail.handoff.action.state!=="AVAILABLE"}>{detail.handoff.label??"Go to insurer"}</button>
            <FinalIntegrityButton
              profileId={profileId}
              profileVersionId={vm.profileVersion.versionId}
              customerObjectiveId={vm.customerObjectiveId!}
              explorationFingerprint={vm.explorationFingerprint!}
              recommendationSetId={detail.sourceRecommendationSetId}
              normalisedQuoteId={surfaced.normalisedQuoteId}
              availability={vm.finalIntegrityAction}
            />
          </div>
          {detail.handoff.action.reason?<p className={styles.handoffNotice}>{detail.handoff.action.reason}</p>:null}
          <p className={styles.disclosure}>MIQOS does not purchase or bind cover in the current synthetic runtime. No live insurer destination is fabricated.</p>
        </section>
      </div>

      <div className={styles.rightColumn}>
        <section className={styles.panel}>
          <div className={styles.objectiveCard}>
            <span className={styles.objectiveIcon} aria-hidden="true">◎</span>
            <div><span className={styles.kicker}>Objective applied</span><h2>{detail.objective.label}</h2><p>{detail.objective.explanation}</p></div>
            <StatusBadge status="READY" label="APPLIED"/>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.kicker}>Commercial independence</span><h2>Ordering remains independent</h2></div><StatusBadge status="PASS" label="EVIDENCE"/></div>
          <p className={styles.bodyCopy}>{commercialReason?.detail??"No commercial-independence explanation evidence was found."}</p>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.kicker}>Alternative eligible results</span><h2>Other ranked evidence</h2><p>Alternatives remain ordered under the same selected objective.</p></div><a className={styles.link} href={"/quotes?profileId="+encodeURIComponent(profileId)+"&customerObjectiveId="+encodeURIComponent(vm.customerObjectiveId!)+"&explorationFingerprint="+encodeURIComponent(vm.explorationFingerprint!)}>View comparison →</a></div>
          {detail.alternatives.length?<AlternativeRows quotes={detail.alternatives} surfaced={surfaced}/>:<p className={styles.calm}>No alternative eligible results are present.</p>}
        </section>

        <section className={styles.panel}>
          <div className={styles.integrityHeader}>
            <div><span className={styles.kicker}>Integrity</span><h2>{vm.finalIntegrity?"Final integrity":"Integrity evidence"}</h2></div>
            <IntegrityBadge outcome={detail.integrity.outcome}/>
          </div>
          <ul className={styles.integrityList}>{detail.integrity.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
          {vm.finalIntegrity?<dl className={styles.integrityMeta}>
            <div><dt>Selection</dt><dd><LineageId value={vm.finalIntegrity.selectionId} label="Selection ID"/></dd></div>
            <div><dt>Outcome</dt><dd>{vm.finalIntegrity.outcome}</dd></div>
            <div><dt>Data classification</dt><dd>{vm.finalIntegrity.dataClassification??"—"}</dd></div>
            <div><dt>Live provider activity</dt><dd>{vm.finalIntegrity.liveProviderActivity??"—"}</dd></div>
          </dl>:null}
        </section>
      </div>
    </div>

    <section className={styles.provenancePanel}>
      <div><span className={styles.kicker}>Result provenance</span><strong>Persisted, versioned and reproducible</strong></div>
      <dl>
        <div><dt>Recommendation rule</dt><dd><code>{vm.provenance?.recommendationRuleVersion}</code></dd></div>
        <div><dt>Recommendation fingerprint</dt><dd>{vm.provenance?<FingerprintValue value={vm.provenance.recommendationFingerprint}/>:"—"}</dd></div>
        <div><dt>Explanation rule</dt><dd><code>{vm.provenance?.explanationRuleVersion}</code></dd></div>
        <div><dt>Explanation fingerprint</dt><dd>{vm.provenance?<FingerprintValue value={vm.provenance.explanationFingerprint}/>:"—"}</dd></div>
      </dl>
    </section>
  </main>;
}
