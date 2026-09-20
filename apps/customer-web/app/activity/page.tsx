import {PageHeader,PageState} from "@miqo/ui";
import type {StatusVM} from "@miqo/application-contracts";
import {resolveProfileId} from "../profile/profile-context";
import {loadActivityPage} from "./load-activity";
import styles from "../customer-records.module.css";

function Badge({value}:{value:StatusVM}){
  return <span className={styles.semanticBadge} data-tone={value.semanticFamily}>{value.label}</span>;
}

function formatTime(value:string){
  const date=new Date(value);
  return Number.isFinite(date.getTime())
    ?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"medium",timeZone:"UTC"}).format(date)+" UTC"
    :value;
}

export default async function ActivityPage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const profileId=await resolveProfileId(searchParams);
  const vm=await loadActivityPage(profileId);

  return <main className={styles.page}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Activity" title="Your Activity" description="A customer-friendly view of important events across your MIQOS journey."/>
      <div className={styles.heroStatement}>Important changes.<br/><strong>Easy to follow.</strong></div>
    </header>

    <section className={styles.noticePanel}>
      <div>
        <span className={styles.kicker}>Customer activity boundary</span>
        <strong>This is a simplified activity view, not the technical audit console.</strong>
        <p>Low-level provider payload capture, hashes and operational trace details stay in the governed administrative Audit & Trace Console.</p>
      </div>
    </section>

    {vm.pageState.state!=="SUCCESS"?<section className={styles.panel}>
      <PageState state="EMPTY" title={vm.pageState.title??"No activity"} message={vm.pageState.message??"No customer journey activity is available yet."}/>
    </section>:<section className={styles.panel} data-testid="customer-activity">
      <div className={styles.panelHeader}>
        <div><span className={styles.kicker}>Journey history</span><h2>Significant events</h2><p>Events are read from the append-only lifecycle record and translated into customer-facing language.</p></div>
        <span className={styles.semanticBadge} data-tone="info">{vm.events.length} EVENTS</span>
      </div>
      <ol className={styles.activityList}>{vm.events.map(event=><li className={styles.activityItem} key={event.activityId}>
        <time dateTime={event.occurredAt}>{formatTime(event.occurredAt)}</time>
        <span className={styles.activityMarker} aria-hidden="true"/>
        <div className={styles.activityBody}>
          <span>{event.category}</span>
          <strong>{event.title}</strong>
          <p>{event.detail}</p>
        </div>
        <Badge value={event.status}/>
      </li>)}</ol>
    </section>}

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.kicker}>Transparency</span><h2>Technical evidence remains protected</h2><p>{vm.fullAuditAction.reason}</p></div></div>
      <div className={styles.infoGrid}>
        <article className={styles.infoCard}><strong>Customer view</strong><span>Shows meaningful milestones without exposing raw provider payloads or internal operational metadata.</span></article>
        <article className={styles.infoCard}><strong>Administrative view</strong><span>Retains end-to-end lineage, fingerprints, raw/normalised separation and authoritative integrity evidence.</span></article>
        <article className={styles.infoCard}><strong>Read-only projection</strong><span>This activity screen does not edit, delete or replace persisted lifecycle evidence.</span></article>
      </div>
    </section>
  </main>;
}
