import {FingerprintValue,LineageId,PageHeader,PageState} from "@miqo/ui";
import type {StatusVM} from "@miqo/application-contracts";
import {resolveApplicationEnvironment} from "../environment";
import {resolveProfileId} from "../profile/profile-context";
import {loadDocumentsPage} from "./load-documents";
import styles from "../customer-records.module.css";

function Badge({value}:{value:StatusVM}){
  return <span className={styles.semanticBadge} data-tone={value.semanticFamily}>{value.label}</span>;
}

function formatTime(value:string|null){
  if(!value)return "Not separately timestamped";
  const date=new Date(value);
  return Number.isFinite(date.getTime())
    ?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(date)+" UTC"
    :value;
}

export default async function DocumentsPage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const environment=resolveApplicationEnvironment();
  if(!environment){
    return <main><PageHeader eyebrow="Documents" title="Documents & Records" description="Application records associated with your MIQOS journey."/><PageState state="NOT_AUTHORISED" title="Environment unavailable" message="Runtime identity could not be resolved, so customer records are not presented."/></main>;
  }

  const profileId=await resolveProfileId(searchParams);
  const vm=await loadDocumentsPage({profileId,environment:environment.environment});

  return <main className={styles.page}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Documents" title="Documents & Records" description="A clear record of the application evidence MIQOS currently holds for your journey."/>
      <div className={styles.heroStatement}>Your evidence.<br/><strong>Clearly separated.</strong></div>
    </header>

    <section className={styles.noticePanel}>
      <div>
        <span className={styles.kicker}>Record boundary</span>
        <strong>Application records are not insurer policy documents.</strong>
        <p>BUILD-001H shows persisted MIQOS application records and links back to their authoritative application surfaces. It does not invent policy schedules, certificates, insurer PDFs or downloadable quote files.</p>
      </div>
      <button className={styles.disabledButton} type="button" disabled title={vm.uploadAction.reason??undefined}>Upload document</button>
    </section>

    {vm.pageState.state!=="SUCCESS"?<section className={styles.panel}>
      <PageState state="EMPTY" title={vm.pageState.title??"No records"} message={vm.pageState.message??"No application records are available yet."}/>
    </section>:null}

    {vm.records.length?<section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div><span className={styles.kicker}>Your application records</span><h2>Evidence available in MIQOS</h2><p>Each record links to the live application surface that owns the underlying evidence.</p></div>
        <span className={styles.semanticBadge} data-tone="info">{vm.records.length} RECORDS</span>
      </div>
      <div className={styles.recordGrid} data-testid="customer-records">{vm.records.map(record=><article className={styles.recordCard} key={record.recordId}>
        <div className={styles.recordHeader}>
          <div><span>{record.kind.replaceAll("_"," ")}</span><strong>{record.title}</strong></div>
          <Badge value={record.status}/>
        </div>
        <p>{record.description}</p>
        <dl className={styles.recordMeta}>
          <div><dt>Source</dt><dd>{record.sourceId?<LineageId value={record.sourceId} label={record.kind}/>:"Not separately identified"}</dd></div>
          <div><dt>Fingerprint</dt><dd>{record.fingerprint?<FingerprintValue value={record.fingerprint}/>:"Not applicable"}</dd></div>
          <div><dt>Recorded</dt><dd>{formatTime(record.createdAt)}</dd></div>
        </dl>
        <div className={styles.recordActions}>
          {record.openHref?<a className={styles.linkButton} href={record.openHref}>Open record →</a>:null}
          <button className={styles.disabledButton} type="button" disabled title={record.downloadAction.reason??undefined}>Download file</button>
        </div>
      </article>)}</div>
    </section>:null}

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.kicker}>Document capability</span><h2>What is not being represented</h2></div></div>
      <div className={styles.infoGrid}>
        <article className={styles.infoCard}><strong>No insurer policy schedule</strong><span>A policy schedule can only come from an authorised insurer/provider process. MIQOS does not fabricate one.</span></article>
        <article className={styles.infoCard}><strong>No proof of cover</strong><span>Nothing on this page is a certificate of motor insurance or evidence that cover has been bound.</span></article>
        <article className={styles.infoCard}><strong>No upload workflow yet</strong><span>Customer document upload and document-processing behaviour remain outside BUILD-001H.</span></article>
      </div>
    </section>
  </main>;
}
