import type {ProfileLifecycleVM, ProfileLifecycleStageVM, ProfileFieldVM} from "@miqo/application-contracts";
import {LineageId, StatusBadge} from "@miqo/ui";
import {CreateCorrectionFromEvidence, LockProfileControl} from "./profile-actions";
import styles from "./profile.module.css";

export function ProfileProgress({journey}:{journey:ProfileLifecycleVM["journey"]}){
  return <ol className={styles.progress} aria-label="Profile lifecycle">
    {journey.map((step,index)=><li key={step.id} data-state={step.state} className={styles.progressStep}>
      <span className={styles.progressMarker} aria-hidden="true">{step.state==="COMPLETE"?"✓":index+1}</span>
      {index<journey.length-1?<span className={styles.progressLine} aria-hidden="true"/>:null}
      <strong>{step.label}</strong>
      <span>{step.state.replaceAll("_"," ")}</span>
    </li>)}
  </ol>;
}

function FieldCard({field}:{field:ProfileFieldVM}){
  return <article className={styles.fieldCard}>
    <div className={styles.fieldIcon} aria-hidden="true">{field.label.slice(0,1)}</div>
    <div><span>{field.label}</span><strong>{field.displayValue}</strong><small>{field.sourceType??"Source not recorded"} · class {field.controlClass}</small></div>
  </article>;
}

export function ProfileSummary({vm}:{vm:ProfileLifecycleVM}){
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Profile summary</span><h2>Factual profile</h2><p>Current canonical fields from profile version v{vm.review.version.versionNo}.</p></div><a href={"/profile/capture?profileId="+encodeURIComponent(vm.review.profileId)}>Review details →</a></div>
    <div className={styles.fieldGrid}>{vm.review.fields.map(field=><FieldCard key={field.fieldId} field={field}/>)}</div>
  </section>;
}

export function ValidationResults({vm}:{vm:ProfileLifecycleVM}){
  const checked=vm.latestValidationAt!==null;
  return <section className={styles.panel} id="validation">
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Validation results</span><h2>{checked?(vm.review.validation.valid?"Validation passed":"Validation requires attention"):"Validation not yet run"}</h2><p>Results are read from persisted validation evidence for the current version.</p></div>{vm.review.validation.valid?<StatusBadge status="PASS"/>:<StatusBadge status="PENDING"/>}</div>
    <div className={styles.validationList}>
      {vm.review.validation.issues.length
        ?vm.review.validation.issues.map((issue,index)=><div key={index} className={styles.validationIssue}><StatusBadge status="BLOCKED"/><span>{issue.message}</span></div>)
        :<div className={styles.validationIssue}><StatusBadge status={vm.review.validation.valid?"PASS":"PENDING"}/><span>{vm.review.validation.valid?"Required profile checks passed.":"Run validation before profile lock."}</span></div>}
    </div>
    {vm.latestValidationAt?<p className={styles.metaLine}>Latest validation: <time dateTime={vm.latestValidationAt}>{new Date(vm.latestValidationAt).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</time></p>:null}
  </section>;
}

function displayEvidence(value:unknown,fieldId:string){
  if(value===null||value===undefined)return "Not supplied";
  if(fieldId==="annual_mileage"&&typeof value==="number")return new Intl.NumberFormat("en-GB").format(value)+" miles";
  return String(value);
}

export function DiscrepancyResolution({vm}:{vm:ProfileLifecycleVM}){
  return <section className={styles.panel} id="discrepancies">
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Discrepancy review</span><h2>{vm.review.discrepancies.length?"Review recorded evidence":"No recorded discrepancies"}</h2><p>Discrepancies are evidence records; locked facts are never overwritten in place.</p></div>{vm.blockingDiscrepancyCount?<StatusBadge status="BLOCKED" label={vm.blockingDiscrepancyCount+" BLOCKING"}/>:<StatusBadge status="READY"/>}</div>
    {vm.review.discrepancies.length===0
      ?<div className={styles.calmState}><span aria-hidden="true">✓</span><div><strong>No discrepancy is recorded for this current profile version.</strong><p>Continue when validation and confirmation requirements are satisfied.</p></div></div>
      :<div className={styles.discrepancyList}>{vm.review.discrepancies.map(item=><article key={item.discrepancyId} className={styles.discrepancyCard}>
        <div className={styles.discrepancyTitle}><div><strong>{item.label}</strong><span>{item.status}</span></div><StatusBadge status={item.reason?"BLOCKED":"PENDING"} label={item.reason?"ACTION REQUIRED":"REVIEW"}/></div>
        <div className={styles.valueCompare}>
          <div><span>Declared value</span><strong>{displayEvidence(item.factualValue,item.fieldId)}</strong></div>
          <span className={styles.compareArrow} aria-hidden="true">→</span>
          <div><span>Verified evidence</span><strong>{displayEvidence(item.evidenceValue,item.fieldId)}</strong></div>
        </div>
        {item.reason?<p className={styles.warningText}>{item.reason}</p>:null}
        <CreateCorrectionFromEvidence profileId={vm.review.profileId} fieldId={item.fieldId} evidenceValue={item.evidenceValue} status={vm.review.version.status}/>
      </article>)}</div>}
  </section>;
}

export function ProfileVersionPanel({vm}:{vm:ProfileLifecycleVM}){
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Profile version</span><h2>Version lineage</h2></div></div>
    <dl className={styles.versionList}>
      <div><dt>Profile ID</dt><dd><LineageId value={vm.review.profileId} label="Profile ID"/></dd></div>
      <div><dt>Current version</dt><dd>v{vm.review.version.versionNo} <StatusBadge status={vm.review.version.status}/></dd></div>
      <div><dt>Version ID</dt><dd><LineageId value={vm.review.version.versionId} label="Profile version ID"/></dd></div>
    </dl>
    {vm.history.length>1?<div className={styles.historyList}>{vm.history.map(version=><div key={version.versionId}><span>v{version.versionNo}</span><StatusBadge status={version.status}/><code>{version.versionId}</code></div>)}</div>:null}
  </section>;
}

export function IntegrityRules(){
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.kicker}>Integrity rules</span><h2>Profile controls</h2><p>These presentation rules reflect the certified profile architecture.</p></div></div>
    <div className={styles.integrityList}>
      <article><span aria-hidden="true">≠</span><div><strong>Change choices, not facts</strong><p>Optimisation cannot change locked factual fields.</p></div></article>
      <article><span aria-hidden="true">🔒</span><div><strong>Locked profile immutable</strong><p>A locked version cannot be edited in place.</p></div></article>
      <article><span aria-hidden="true">↻</span><div><strong>Corrections create new versions</strong><p>Factual correction preserves the previous locked version.</p></div></article>
      <article><span aria-hidden="true">✓</span><div><strong>Audit trail recorded</strong><p>Profile lifecycle events remain traceable.</p></div></article>
    </div>
  </section>;
}

export function LockSection({vm}:{vm:ProfileLifecycleVM}){
  return <section className={styles.lockSection} id="lock">
    <div><span className={styles.kicker}>Confirmation & lock</span><h2>Confirm your factual profile</h2><p>Locking confirms the current version for later objective and scenario work.</p></div>
    <LockProfileControl profileId={vm.review.profileId} availability={vm.review.lockAction}/>
  </section>;
}
