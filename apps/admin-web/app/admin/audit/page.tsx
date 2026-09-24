import {
  ComparisonStateBadge,
  EnvironmentBadge,
  FingerprintValue,
  LineageId,
  MoneyAmount,
  PageHeader,
  PageState,
  StatusBadge,
  VersionBadge,
} from "@miqo/ui";
import type {
  AdminAuditTraceFiltersVM,
  AdminAuditTracePageVM,
  LineageNodeVM,
  StatusVM,
} from "@miqo/application-contracts";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {resolveApplicationEnvironment} from "../../environment";
import {loadAdminAuditTrace} from "./load-audit-trace";
import styles from "./audit.module.css";

function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function clean(value:string|undefined){const result=value?.trim();return result?result:null;}

function timestamp(value:string){
  const date=new Date(value);
  return Number.isFinite(date.getTime())
    ?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"medium",timeZone:"UTC"}).format(date)+" UTC"
    :value;
}

function SemanticBadge({value}:{value:StatusVM}){
  return <span className={styles.semanticBadge} data-tone={value.semanticFamily}>
    <span className={styles.semanticDot} aria-hidden="true"/>
    {value.label}
  </span>;
}

function nodeDetail(node:LineageNodeVM){
  const pairs=Object.entries(node.metadata).filter(([,value])=>value!==null&&value!==undefined);
  if(!pairs.length)return null;
  return <dl className={styles.nodeMeta}>{pairs.slice(0,3).map(([key,value])=>
    <div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{String(value)}</dd></div>
  )}</dl>;
}

function Lineage({vm}:{vm:AdminAuditTracePageVM}){
  if(!vm.lineage)return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Lineage explorer</span><h2>End-to-end decision lineage</h2></div></div>
    <PageState state="EMPTY" title="Selection lineage not loaded" message="Provide a selection reference to resolve profile → objective → scenario → route → quote → recommendation → explanation → integrity lineage."/>
  </section>;

  return <section className={styles.panel} data-testid="admin-lineage">
    <div className={styles.panelHeader}>
      <div><span className={styles.kicker}>Lineage explorer</span><h2>End-to-end decision lineage</h2><p>Raw provider evidence and normalised quote evidence remain separate artefacts.</p></div>
      <LineageId value={vm.lineage.selectionId} label="Selection ID"/>
    </div>
    <ol className={styles.lineageList}>{vm.lineage.nodes.map((node,index)=><li key={node.nodeId} className={styles.lineageNode}>
      <span className={styles.lineMarker} aria-hidden="true">{index<vm.lineage!.nodes.length-1?"↓":"•"}</span>
      <article>
        <div className={styles.nodeHeader}>
          <div><span>{node.kind.replaceAll("_"," ")}</span><strong>{node.label}</strong></div>
          {node.status?<SemanticBadge value={node.status}/>:null}
        </div>
        <LineageId value={node.nodeId} label={node.kind}/>
        {nodeDetail(node)}
      </article>
    </li>)}</ol>
  </section>;
}

function Timeline({vm}:{vm:AdminAuditTracePageVM}){
  if(!vm.timeline)return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Audit event timeline</span><h2>Append-only lifecycle evidence</h2></div></div>
    <PageState state="EMPTY" title="No profile selected" message="Enter a profile or selection reference to load chronological audit evidence."/>
  </section>;
  if(!vm.timeline.events.length)return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Audit event timeline</span><h2>Append-only lifecycle evidence</h2></div></div>
    <PageState state="EMPTY" title={vm.timeline.pageState.title??"No matching events"} message={vm.timeline.pageState.message??"No events match the active filters."}/>
  </section>;

  return <section className={styles.panel} data-testid="admin-audit-timeline">
    <div className={styles.panelHeader}>
      <div><span className={styles.kicker}>Audit event timeline</span><h2>Append-only lifecycle evidence</h2><p>{vm.timeline.events.length} matching event{vm.timeline.events.length===1?"":"s"}.</p></div>
      <StatusBadge status="READY" label="ACTIVE"/>
    </div>
    <ol className={styles.timeline}>{vm.timeline.events.map(event=><li key={event.auditEventId}>
      <time dateTime={event.occurredAt}>{timestamp(event.occurredAt)}</time>
      <span className={styles.timelineDot} aria-hidden="true"/>
      <div><strong>{event.summary}</strong><span>{event.eventType}</span><small>{event.entityType} · {event.entityId}</small></div>
    </li>)}</ol>
  </section>;
}

function CurrentArtefact({vm}:{vm:AdminAuditTracePageVM}){
  const item=vm.currentArtefact;
  if(!item)return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Current artefact</span><h2>Trace identity</h2></div></div>
    <p className={styles.muted}>Load a selection to inspect the exact artefact lineage and rule versions.</p>
  </section>;

  return <section className={styles.panel} data-testid="admin-current-artefact">
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Current artefact</span><h2>Trace identity</h2></div><StatusBadge status={item.profileStatus}/></div>
    <dl className={styles.artefactList}>
      <div><dt>Profile</dt><dd><LineageId value={item.profileId} label="Profile"/></dd></div>
      <div><dt>Profile version</dt><dd><VersionBadge value={"v"+item.profileVersionNo}/><LineageId value={item.profileVersionId} label="Profile version"/></dd></div>
      <div><dt>Scenario</dt><dd>{item.scenarioId?<LineageId value={item.scenarioId} label="Scenario"/>:"—"}</dd></div>
      <div><dt>Exploration</dt><dd>{item.explorationFingerprint?<FingerprintValue value={item.explorationFingerprint}/>:"—"}</dd></div>
      <div><dt>Route fingerprint</dt><dd>{item.routeFingerprint?<FingerprintValue value={item.routeFingerprint}/>:"—"}</dd></div>
      <div><dt>Quote request</dt><dd>{item.quoteRequestId?<LineageId value={item.quoteRequestId} label="Quote request"/>:"—"}</dd></div>
      <div><dt>Normalised quote</dt><dd>{item.normalisedQuoteId?<LineageId value={item.normalisedQuoteId} label="Normalised quote"/>:"—"}</dd></div>
      <div><dt>Recommendation set</dt><dd>{item.recommendationSetId?<LineageId value={item.recommendationSetId} label="Recommendation set"/>:"—"}</dd></div>
      <div><dt>Recommendation fingerprint</dt><dd>{item.recommendationFingerprint?<FingerprintValue value={item.recommendationFingerprint}/>:"—"}</dd></div>
      <div><dt>Explanation fingerprint</dt><dd>{item.explanationFingerprint?<FingerprintValue value={item.explanationFingerprint}/>:"—"}</dd></div>
      <div><dt>Selection</dt><dd>{item.selectionId?<LineageId value={item.selectionId} label="Selection"/>:"—"}</dd></div>
    </dl>
    <div className={styles.ruleGrid}>{Object.entries(item.ruleVersions).map(([key,value])=><div key={key}><span>{key.replaceAll("_"," ")}</span><code>{value}</code></div>)}</div>
  </section>;
}

function Governance({vm}:{vm:AdminAuditTracePageVM}){
  const entries=[
    ["Audit trail",vm.governance.auditTrail,"Lifecycle events are read-only in this console."],
    ["Append-only",vm.governance.appendOnly,"No destructive audit action is exposed."],
    ["Commercial independence",vm.governance.commercialIndependence,"Status is evidence-backed from the persisted explanation."],
    ["Non-advised",vm.governance.nonAdvised,"Customer results remain objective-specific information."],
  ] as const;
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Governance & compliance</span><h2>Control state</h2></div><EnvironmentBadge/></div>
    <div className={styles.governanceGrid}>{entries.map(([label,value,description])=><article key={label}>
      <SemanticBadge value={value}/><strong>{label}</strong><span>{description}</span>
    </article>)}</div>
  </section>;
}

function IntegrityQueue({vm}:{vm:AdminAuditTracePageVM}){
  return <section className={styles.panel} data-testid="admin-integrity-queue">
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Integrity & discrepancy queue</span><h2>Evidence checks</h2><p>Integrity outcomes and factual discrepancies remain separate persisted evidence classes.</p></div></div>
    {vm.integrityQueue.length?<div className={styles.integrityRows}>{vm.integrityQueue.map(item=><article key={item.itemId}>
      <div><strong>{item.label}</strong><span>{item.category.replaceAll("_"," ")}</span></div>
      <SemanticBadge value={item.status}/>
      <p>{item.detail}</p>
    </article>)}</div>:<p className={styles.muted}>Load a selection to inspect recommendation, explanation and final-integrity evidence.</p>}
    <div className={styles.discrepancySection}>
      <div className={styles.subheading}><strong>Current profile discrepancies</strong><span>{vm.discrepancies.length}</span></div>
      {vm.discrepancies.length?<div className={styles.discrepancyRows}>{vm.discrepancies.map(item=><article key={item.discrepancyId}>
        <div><strong>{item.fieldId.replaceAll("_"," ")}</strong><span>{item.state}</span></div>
        <StatusBadge status={item.blocking?"BLOCKED":"INFORMATIONAL"} label={item.blocking?"BLOCKING":"INFORMATIONAL"}/>
        <dl>
          <div><dt>Declared</dt><dd>{JSON.stringify(item.declaredValue)}</dd></div>
          <div><dt>Verified</dt><dd>{JSON.stringify(item.verifiedValue)}</dd></div>
        </dl>
      </article>)}</div>:<p className={styles.muted}>No current-profile discrepancy records are present.</p>}
    </div>
  </section>;
}

function EvidenceData({vm}:{vm:AdminAuditTracePageVM}){
  if(!vm.rawProviderResponse&&!vm.normalisedEvidence)return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Provider response data</span><h2>Raw & normalised evidence</h2></div></div>
    <p className={styles.muted}>Selection lineage is required to load provider response evidence.</p>
  </section>;

  return <section className={styles.panel} data-testid="admin-provider-evidence">
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Provider response data</span><h2>Raw & normalised evidence</h2><p>Raw provider payload is displayed separately from MIQOS normalisation.</p></div></div>
    {vm.rawProviderResponse?<div className={styles.rawMeta}>
      <div><span>Raw response</span><LineageId value={vm.rawProviderResponse.rawProviderResponseId} label="Raw provider response"/></div>
      <div><span>SHA-256</span><FingerprintValue value={vm.rawProviderResponse.payloadSha256}/></div>
      <div><span>Provider reference</span><code>{vm.rawProviderResponse.providerReference??"—"}</code></div>
    </div>:null}
    {vm.rawProviderResponse?<pre className={styles.rawPayload} tabIndex={0} role="region" aria-label="Raw provider response payload">{JSON.stringify(vm.rawProviderResponse.payload,null,2)}</pre>:null}
    {vm.normalisedEvidence?<div className={styles.normalisedCard}>
      <div className={styles.normalisedHeader}><div><span>Normalised quote</span><LineageId value={vm.normalisedEvidence.normalisedQuoteId} label="Normalised quote"/></div><ComparisonStateBadge state={vm.normalisedEvidence.comparisonState}/></div>
      <dl>
        <div><dt>Annual premium</dt><dd><MoneyAmount pence={vm.normalisedEvidence.annualCashPremiumPence}/></dd></div>
        <div><dt>Finance cost</dt><dd><MoneyAmount pence={vm.normalisedEvidence.financeCostPence}/></dd></div>
        <div><dt>Compulsory excess</dt><dd><MoneyAmount pence={vm.normalisedEvidence.compulsoryExcessPence}/></dd></div>
        <div><dt>Voluntary excess</dt><dd><MoneyAmount pence={vm.normalisedEvidence.voluntaryExcessPence}/></dd></div>
      </dl>
      <div className={styles.normalisedFingerprint}><span>Normalisation</span><VersionBadge value={vm.normalisedEvidence.normalisationVersion}/><FingerprintValue value={vm.normalisedEvidence.normalisationFingerprint}/></div>
    </div>:null}
  </section>;
}

const EVENT_TYPES=[
  "profile_created","profile_validated","profile_locked","customer_objective_selected",
  "sp4_scenario_exploration_generated","quote_request_prepared","raw_provider_response_captured",
  "provider_response_normalised","comparison_generated","shortlist_created",
  "sp4_recommendation_set_created","sp4_recommendation_explanation_created",
  "quote_selected","final_integrity_passed","final_integrity_blocked","prototype_completed",
];

export default async function AdminAuditTrace({searchParams}:{searchParams:Promise<{
  profileId?:string|string[];
  profileVersionId?:string|string[];
  recommendationSetId?:string|string[];
  selectionId?:string|string[];
  scenarioId?:string|string[];
  eventType?:string|string[];
  dateFrom?:string|string[];
  dateTo?:string|string[];
}>}){
  const environment=resolveApplicationEnvironment();
  if(!environment){
    return <main><PageHeader eyebrow="Administration" title="Audit & Trace Console" description="Complete provenance and append-only evidence."/><PageState state="NOT_AUTHORISED" title="Environment unavailable" message="Runtime identity could not be resolved, so administrative evidence is not presented."/></main>;
  }
  const params=await searchParams;
  const accessToken=(await cookies()).get("miqo_admin_access")?.value;
  if(!accessToken){
    const returnParams=new URLSearchParams();
    for(const [key,raw] of Object.entries(params)){
      const value=first(raw);
      if(value)returnParams.set(key,value);
    }
    const suffix=returnParams.size?"?"+returnParams.toString():"";
    redirect("/api/auth/login?returnTo="+encodeURIComponent("/admin/audit"+suffix));
  }
  const filters:AdminAuditTraceFiltersVM={
    profileId:clean(first(params.profileId)),
    profileVersionId:clean(first(params.profileVersionId)),
    recommendationSetId:clean(first(params.recommendationSetId)),
    selectionId:clean(first(params.selectionId)),
    scenarioId:clean(first(params.scenarioId)),
    eventType:clean(first(params.eventType)),
    dateFrom:clean(first(params.dateFrom)),
    dateTo:clean(first(params.dateTo)),
  };
  const vm=await loadAdminAuditTrace({filters,environment:environment.environment});

  return <main className={styles.page}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Administration" title="Audit & Trace Console" description="Complete provenance. Append-only evidence. Trusted, reproducible outcomes."/>
      <div className={styles.heroStatement}>Trace every decision.<br/><strong>Assure fair outcomes.</strong></div>
    </header>

    <form className={styles.filterPanel} method="get" action="/admin/audit" aria-label="Audit and trace filters">
      <label><span>Profile / Case reference</span><input name="profileId" defaultValue={filters.profileId??""} placeholder="e.g. PRO-…"/></label>
      <label><span>Profile version</span><input name="profileVersionId" defaultValue={filters.profileVersionId??""} placeholder="e.g. RPV-…"/></label>
      <label><span>Recommendation set</span><input name="recommendationSetId" defaultValue={filters.recommendationSetId??""} placeholder="e.g. REC-…"/></label>
      <label><span>Selection reference</span><input name="selectionId" defaultValue={filters.selectionId??""} placeholder="e.g. SEL-…"/></label>
      <label><span>Scenario ID</span><input name="scenarioId" defaultValue={filters.scenarioId??""} placeholder="All scenarios"/></label>
      <label><span>Event type</span><select name="eventType" defaultValue={filters.eventType??""}><option value="">All events</option>{EVENT_TYPES.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label>
      <label><span>From</span><input type="date" name="dateFrom" defaultValue={filters.dateFrom??""}/></label>
      <label><span>To</span><input type="date" name="dateTo" defaultValue={filters.dateTo??""}/></label>
      <div className={styles.filterActions}><button className="miqos-button miqos-button--primary" type="submit">Search</button><a className="miqos-button miqos-button--secondary" href="/admin/audit">Clear</a></div>
    </form>

    {vm.pageState.state!=="SUCCESS"?<section className={styles.stateBar}>
      <PageState
        state={vm.pageState.state==="ERROR"?"ERROR":vm.pageState.state==="BLOCKED"?"BLOCKED":vm.pageState.state==="NOT_AUTHORISED"?"NOT_AUTHORISED":"EMPTY"}
        title={vm.pageState.title??"Audit console"}
        message={vm.pageState.message??"Use the search controls to load evidence."}
      />
    </section>:null}

    <div className={styles.consoleGrid}>
      <div className={styles.leftColumn}><Lineage vm={vm}/></div>
      <div className={styles.middleColumn}><Timeline vm={vm}/><IntegrityQueue vm={vm}/></div>
      <div className={styles.rightColumn}><CurrentArtefact vm={vm}/><Governance vm={vm}/><EvidenceData vm={vm}/></div>
    </div>
  </main>;
}
