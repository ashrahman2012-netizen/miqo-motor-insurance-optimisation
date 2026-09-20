import {cookies} from "next/headers";
import {
  ComparisonStateBadge,
  FingerprintValue,
  GovernanceBadge,
  LineageId,
  MoneyAmount,
  PageHeader,
  PageState,
  StatusBadge,
} from "@miqo/ui";
import type {CustomerDashboardVM, DashboardQuickActionVM, DashboardJourneyStepVM} from "@miqo/application-contracts";
import {resolveApplicationEnvironment} from "../environment";
import {loadCustomerDashboard} from "./load-dashboard";
import styles from "./dashboard.module.css";

function firstParam(value:string|string[]|undefined){
  return Array.isArray(value)?value[0]:value;
}

function formatTimestamp(value:string|null){
  if(!value)return "Not yet recorded";
  return new Intl.DateTimeFormat("en-GB",{
    dateStyle:"medium",timeStyle:"short",timeZone:"UTC",
  }).format(new Date(value))+" UTC";
}

function journeyMarker(step:DashboardJourneyStepVM){
  if(step.state==="COMPLETE")return "✓";
  if(step.state==="NOT_AUTHORISED")return "—";
  if(step.state==="BLOCKED")return "!";
  return "•";
}

function actionClass(action:DashboardQuickActionVM){
  return action.availability.state==="AVAILABLE"?styles.actionLink:styles.actionDisabled;
}

function DashboardEmpty(){
  return <section className={styles.emptyPanel}>
    <PageState state="EMPTY" title="No active case" message="Start or open a synthetic profile to populate the customer dashboard."/>
    <a className={styles.primaryAction} href="/prototype">Start synthetic profile</a>
  </section>;
}

function SummaryCard({label,value,detail,status}:{label:string;value:string;detail:string;status?:Parameters<typeof StatusBadge>[0]["status"]}){
  return <article className={styles.summaryCard}>
    <div className={styles.summaryIcon} aria-hidden="true">{label.slice(0,1)}</div>
    <div className={styles.summaryBody}>
      <span className={styles.summaryLabel}>{label}</span>
      <strong className={styles.summaryValue}>{value}</strong>
      {status?<StatusBadge status={status}/>:null}
      <span className={styles.summaryDetail}>{detail}</span>
    </div>
  </article>;
}

function Journey({steps}:{steps:CustomerDashboardVM["journey"]}){
  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div><span className={styles.panelKicker}>Journey</span><h2>Your journey</h2></div>
      <span className={styles.panelMeta}>Authoritative status only</span>
    </div>
    <ol className={styles.journeyList}>
      {steps.map((step,index)=><li key={step.id} className={styles.journeyStep} data-state={step.state}>
        <div className={styles.journeyMarker} aria-hidden="true">{journeyMarker(step)}</div>
        {index<steps.length-1?<span className={styles.journeyLine} aria-hidden="true"/>:null}
        <strong>{step.label}</strong>
        <span className={styles.journeyState}>{step.state.replaceAll("_"," ")}</span>
      </li>)}
    </ol>
  </section>;
}

function QuoteDistribution({dashboard}:{dashboard:CustomerDashboardVM}){
  const max=Math.max(1,...dashboard.quotes.distribution.map(item=>item.count));
  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div><span className={styles.panelKicker}>Quotes</span><h2>Quote distribution</h2></div>
      <span className={styles.panelMeta}>{dashboard.quotes.quoteCount} quote{dashboard.quotes.quoteCount===1?"":"s"}</span>
    </div>
    {dashboard.quotes.quoteCount===0?<p className={styles.muted}>No normalised quotation evidence is available for the selected exploration.</p>:
      <div className={styles.distributionBody}>
        <div className={styles.chart} role="img" aria-label="Annual premium distribution across returned normalised quotes">
          {dashboard.quotes.distribution.map(bucket=><div className={styles.barGroup} key={bucket.bucketId}>
            <div className={styles.barTrack}><span className={styles.bar} style={{height:`${Math.max(8,Math.round(bucket.count/max*100))}%`}}><span className={styles.srOnly}>{bucket.count} quotes</span></span></div>
            <span>{bucket.label}</span>
          </div>)}
        </div>
        <dl className={styles.quoteStats}>
          <div><dt>Total</dt><dd>{dashboard.quotes.quoteCount}</dd></div>
          <div><dt>Lowest annual premium</dt><dd><MoneyAmount pence={dashboard.quotes.minimumAnnualPremiumPence}/></dd></div>
          <div><dt>Highest annual premium</dt><dd><MoneyAmount pence={dashboard.quotes.maximumAnnualPremiumPence}/></dd></div>
        </dl>
      </div>}
    <p className={styles.methodNote}>Distribution is descriptive only. It does not create a composite score or re-rank quotation evidence.</p>
  </section>;
}

function QuickActions({actions}:{actions:CustomerDashboardVM["quickActions"]}){
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.panelKicker}>Continue</span><h2>Quick actions</h2></div></div>
    <div className={styles.actionList}>
      {actions.map(action=>action.href&&action.availability.state==="AVAILABLE"
        ?<a key={action.actionId} href={action.href} className={actionClass(action)}><span>{action.label}</span><span aria-hidden="true">→</span></a>
        :<button key={action.actionId} type="button" className={actionClass(action)} disabled title={action.availability.reason??undefined}><span>{action.label}</span><span className={styles.actionReason}>{action.availability.reason}</span></button>
      )}
    </div>
  </section>;
}

function Governance(){
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.panelKicker}>Controls</span><h2>Governance & integrity</h2></div></div>
    <div className={styles.governanceGrid}>
      <article><GovernanceBadge state="VERIFIED"/><strong>Change choices, not facts</strong><span>Locked facts remain outside optimisation controls.</span></article>
      <article><GovernanceBadge state="NON_ADVISED"/><strong>Information, not advice</strong><span>Results remain objective-specific and non-advised.</span></article>
      <article><GovernanceBadge state="APPEND_ONLY"/><strong>Audit lineage preserved</strong><span>Important lifecycle events remain traceable.</span></article>
      <article><GovernanceBadge state="VERIFIED"/><strong>Commercial independence</strong><span>Quotation optimisation remains separate from remuneration.</span></article>
    </div>
  </section>;
}

function CurrentCase({dashboard}:{dashboard:CustomerDashboardVM}){
  const version=dashboard.profileVersion!;
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.panelKicker}>Current case</span><h2>Profile context</h2></div></div>
    <dl className={styles.caseList}>
      <div><dt>Profile reference</dt><dd><LineageId value={dashboard.profileId!} label="Profile reference"/></dd></div>
      <div><dt>Profile version</dt><dd>v{version.versionNo} <StatusBadge status={version.status}/></dd></div>
      <div><dt>Scenario fingerprint</dt><dd>{dashboard.scenarios.explorationFingerprint?<FingerprintValue value={dashboard.scenarios.explorationFingerprint}/>:"Not selected"}</dd></div>
      <div><dt>Latest update</dt><dd><time dateTime={dashboard.latestUpdatedAt??undefined}>{formatTimestamp(dashboard.latestUpdatedAt)}</time></dd></div>
    </dl>
  </section>;
}

function TopResult({dashboard}:{dashboard:CustomerDashboardVM}){
  const result=dashboard.result;
  if(!result)return <section className={styles.resultPanel}>
    <div className={styles.panelHeader}><div><span className={styles.panelKicker}>Your Results</span><h2>Top surfaced result</h2></div><StatusBadge status="PENDING"/></div>
    <PageState state="EMPTY" title="No surfaced result yet" message="A result appears here only after persisted recommendation evidence exists."/>
  </section>;

  const quote=result.surfacedResult;
  const open=dashboard.quickActions.find(action=>action.actionId==="OPEN_RESULTS");
  return <section className={styles.resultPanel} data-testid="dashboard-top-result">
    <div className={styles.panelHeader}><div><span className={styles.panelKicker}>Your Results</span><h2>Top surfaced result</h2></div><StatusBadge status="READY"/></div>
    <p className={styles.muted}>Based on your selected objective and persisted eligible quotation evidence.</p>
    <article className={styles.resultCard}>
      <div className={styles.resultHeading}>
        <div className={styles.providerMark} aria-hidden="true">M</div>
        <div><strong>{quote.marketRoute.displayName}</strong><span>{quote.marketRoute.providerKey} · {quote.marketRoute.channelKey.replaceAll("_"," ")}</span></div>
        <ComparisonStateBadge state={quote.comparisonState}/>
      </div>
      <dl className={styles.resultMetrics}>
        <div><dt>Annual premium</dt><dd><MoneyAmount pence={quote.pricing.annualCashPremiumPence}/></dd></div>
        <div><dt>Compulsory excess</dt><dd><MoneyAmount pence={quote.excess.compulsoryExcessPence}/></dd></div>
        <div><dt>Voluntary excess</dt><dd><MoneyAmount pence={quote.excess.voluntaryExcessPence}/></dd></div>
      </dl>
      {open?.href?<a className={styles.resultAction} href={open.href}>View Why This Surfaced <span aria-hidden="true">→</span></a>:null}
    </article>
    <div className={styles.resultFooter}>
      <span><StatusBadge status="SYNTHETIC"/> Test environment</span>
      <span data-testid="dashboard-recommendation-id">Result set {result.recommendationSetId}</span>
    </div>
  </section>;
}

export default async function CustomerDashboard({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const environment=resolveApplicationEnvironment();
  if(!environment){
    return <main><PageHeader eyebrow="Customer" title="Customer dashboard" description="Your motor insurance journey, optimised."/><PageState state="NOT_AUTHORISED" title="Environment unavailable" message="The application environment could not be resolved, so dashboard data is not presented."/></main>;
  }

  const params=await searchParams;
  const cookieStore=await cookies();
  const profileId=firstParam(params.profileId)??cookieStore.get("miqos_active_profile")?.value??null;
  const dashboard=await loadCustomerDashboard({profileId:profileId?.trim()||null,environment:environment.environment});

  return <main className={styles.dashboard}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Welcome to MIQOS" title="Customer dashboard" description="Your motor insurance journey, optimised."/>
      <div className={styles.heroStatement}>Same information.<br/><strong>Smarter outcomes.</strong></div>
    </header>

    {dashboard.pageState.state==="EMPTY"?<DashboardEmpty/>:<>
      <section className={styles.summaryGrid} aria-label="Dashboard summary">
        <SummaryCard label="Profile status" value={dashboard.profileVersion?.status==="LOCKED"?"Locked":dashboard.profileVersion?.status??"Not started"} detail={dashboard.profileVersion?.status==="LOCKED"?"Your applicable profile version is locked.":"Profile lifecycle is still in progress."} status={dashboard.profileVersion?.status??"PENDING"}/>
        <SummaryCard label="Objective" value={dashboard.objective?.label??"Not selected"} detail={dashboard.objective?"Objective recorded against this profile version.":"Select an objective after profile lock."}/>
        <SummaryCard label="Generated scenarios" value={String(dashboard.scenarios.generatedScenarioCount)} detail={dashboard.scenarios.generatedScenarioCount?"Scenario evidence is available to explore.":"No generated scenarios yet."} status={dashboard.scenarios.generatedScenarioCount?"READY":"PENDING"}/>
        <SummaryCard label="Results status" value={dashboard.result?"Ready":"Pending"} detail={dashboard.result?"A surfaced result is available.":"No persisted surfaced result yet."} status={dashboard.result?"READY":"PENDING"}/>
      </section>

      <Journey steps={dashboard.journey}/>

      <section className={styles.lowerGrid}>
        <div className={styles.stack}><CurrentCase dashboard={dashboard}/><QuoteDistribution dashboard={dashboard}/></div>
        <div className={styles.stack}><QuickActions actions={dashboard.quickActions}/><Governance/></div>
        <TopResult dashboard={dashboard}/>
      </section>
    </>}
  </main>;
}
