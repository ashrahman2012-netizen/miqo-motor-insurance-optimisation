import {FingerprintValue,LineageId,PageHeader,PageState,StatusBadge} from "@miqo/ui";
import {resolveProfileId} from "../profile/profile-context";
import {loadScenarioExplorer} from "./load-optimise";
import {ObjectiveCards,ScenarioControls} from "./optimise-actions";
import styles from "./optimise.module.css";

function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}

function ScenarioTable({vm}:{vm:Awaited<ReturnType<typeof loadScenarioExplorer>>}){
  const exploration=vm.exploration;
  return <section className={styles.panel} id="generated-scenarios">
    <div className={styles.panelHeader}>
      <div><span className={styles.kicker}>Generated scenarios</span><h2>Scenario evidence</h2><p>Accepted candidates contain O-class deltas only. Quote outcomes are deliberately outside BUILD-001D.</p></div>
      {exploration?<StatusBadge status={exploration.pageState.state==="PARTIAL"?"PENDING":"READY"}/>:<StatusBadge status="PENDING"/>}
    </div>
    {!exploration?<PageState state="EMPTY" title="No exploration selected" message="Select an executable objective and generate scenarios to create persisted scenario evidence."/>:
      exploration.scenarios.length===0?<PageState state="EMPTY" title="No accepted scenarios" message="All candidate combinations were rejected by deterministic scenario rules."/>:
      <div className={styles.tableWrap}><table className={styles.scenarioTable}>
        <thead><tr><th>#</th><th>Scenario ID</th><th>Key O-class choices</th><th>Generator</th><th>Readiness</th></tr></thead>
        <tbody>{exploration.scenarios.map(scenario=><tr key={scenario.scenarioId}>
          <td>{scenario.generationOrdinal??"—"}</td>
          <td><LineageId value={scenario.scenarioId} label="Scenario ID"/></td>
          <td><ul>{scenario.deltas.map(delta=><li key={delta.fieldId}><strong>{delta.label}:</strong> {delta.displayValue} <span className={styles.oMarker}>[O]</span></li>)}</ul></td>
          <td><code>{scenario.generationVersion}</code></td>
          <td><StatusBadge status="READY"/></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}

function Rejections({vm}:{vm:Awaited<ReturnType<typeof loadScenarioExplorer>>}){
  const rejections=vm.exploration?.rejections??[];
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Rejected combinations</span><h2>Deterministic exclusions</h2><p>Invalid or ineligible combinations remain visible as evidence rather than disappearing silently.</p></div>{rejections.length?<StatusBadge status="EXCLUDED" label={String(rejections.length)}/>:<StatusBadge status="PASS"/>}</div>
    {rejections.length===0?<p className={styles.calm}>No rejected combinations are recorded for the selected exploration.</p>:
      <div className={styles.rejectionList}>{rejections.map(item=><article key={item.rejectionId}>
        <div><strong>{item.ruleId}</strong><span>{item.category}</span></div>
        <p>{item.reason}</p>
        <code>{JSON.stringify(item.candidate)}</code>
      </article>)}</div>}
  </section>;
}

function Provenance({vm}:{vm:Awaited<ReturnType<typeof loadScenarioExplorer>>}){
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Provenance & configuration</span><h2>Versioned policy lineage</h2></div></div>
    <dl className={styles.provenance}>
      <div><dt>Profile version</dt><dd><LineageId value={vm.profileVersion.versionId} label="Profile version"/></dd></div>
      <div><dt>Catalogue version</dt><dd><code>{vm.provenance.catalogueVersion}</code></dd></div>
      <div><dt>Objective model</dt><dd><code>{vm.provenance.objectiveModelVersion}</code></dd></div>
      <div><dt>Policy fingerprint</dt><dd><FingerprintValue value={vm.provenance.policyFingerprint}/></dd></div>
      <div><dt>Generator version</dt><dd><code>{vm.provenance.scenarioGeneratorVersion}</code></dd></div>
      <div><dt>Exploration fingerprint</dt><dd>{vm.provenance.explorationFingerprint?<FingerprintValue value={vm.provenance.explorationFingerprint}/>:"Not generated"}</dd></div>
    </dl>
  </section>;
}

export default async function OptimisePage({searchParams}:{searchParams:Promise<{profileId?:string|string[];customerObjectiveId?:string|string[];explorationFingerprint?:string|string[]}>}){
  const profileId=await resolveProfileId(searchParams);
  if(!profileId)return <main className={styles.page}>
    <header className={styles.hero}><PageHeader eyebrow="Scenarios" title="Objective & Scenario Explorer" description="Explore customer choices and generate governed O-class scenarios."/></header>
    <section className={styles.panel}><PageState state="EMPTY" title="No active profile" message="Create and lock a factual profile before optimisation can begin."/><a className="miqos-button miqos-button--primary" href="/profile/capture">Go to profile capture</a></section>
  </main>;

  const params=await searchParams;
  const vm=await loadScenarioExplorer({
    profileId,
    customerObjectiveId:first(params.customerObjectiveId)??null,
    explorationFingerprint:first(params.explorationFingerprint)??null,
  });

  return <main className={styles.page}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Scenarios" title="Objective & Scenario Explorer" description="Explore customer choices, generate governed scenarios and inspect deterministic scenario evidence."/>
      <div className={styles.heroStatement}>Same information.<br/><strong>Smarter outcomes.</strong></div>
    </header>

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.kicker}>Customer objective</span><h2>Select the primary objective</h2><p>Objectives are versioned policy definitions. Dormant objectives remain visible but cannot execute.</p></div><div className={styles.source}><StatusBadge status={vm.profileVersion.status}/><LineageId value={vm.profileVersion.versionId} label="Locked profile version"/></div></div>
      {vm.profileVersion.status!=="LOCKED"?<PageState state="BLOCKED" title="Profile lock required" message="Scenario exploration must reference an exact locked factual profile version."/>:
        <ObjectiveCards profileId={profileId} versionId={vm.profileVersion.versionId} objectives={vm.objectiveSelector.objectives}/>}
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.kicker}>Optimisation catalogue</span><h2>O-class customer choices</h2><p>Only controls supplied by the current certified catalogue appear here.</p></div><div className={styles.boundaryNotice}><strong>Change choices, not facts.</strong><span> F/V/D/I cannot be edited here.</span></div></div>
      <ScenarioControls profileId={profileId} customerObjectiveId={vm.selectedCustomerObjectiveId} controls={vm.controls}/>
    </section>

    <ScenarioTable vm={vm}/>

    <div className={styles.bottomGrid}>
      <Rejections vm={vm}/>
      <Provenance vm={vm}/>
    </div>
  </main>;
}
