import {EnvironmentBadge,PageHeader,PageState} from "@miqo/ui";
import {resolveApplicationEnvironment} from "../environment";
import {resolveProfileId} from "../profile/profile-context";
import {loadSupportPage} from "./load-support";
import styles from "../customer-records.module.css";

export default async function SupportPage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const environment=resolveApplicationEnvironment();
  if(!environment){
    return <main><PageHeader eyebrow="Help & Support" title="Help & Support" description="Guidance for using MIQOS."/><PageState state="NOT_AUTHORISED" title="Environment unavailable" message="Runtime identity could not be resolved, so environment-specific support guidance is not presented."/></main>;
  }
  const profileId=await resolveProfileId(searchParams);
  const vm=await loadSupportPage({profileId,environment:environment.environment});

  return <main className={styles.page}>
    <header className={styles.hero}>
      <PageHeader eyebrow="Help & Support" title="Help & Support" description="Find the right part of MIQOS and understand what each application stage means."/>
      <div className={styles.heroStatement}>Clear guidance.<br/><strong>No hidden assumptions.</strong></div>
    </header>

    <section className={styles.noticePanel}>
      <div>
        <span className={styles.kicker}>Environment awareness</span>
        <strong>Support guidance follows the current application environment.</strong>
        <p>Environment identity, provider connectivity and customer handoff constraints remain explicit rather than being hidden behind support messaging.</p>
      </div>
      <EnvironmentBadge/>
    </section>

    <section className={styles.panel} data-testid="support-topics">
      <div className={styles.panelHeader}>
        <div><span className={styles.kicker}>Help topics</span><h2>What do you need help with?</h2><p>These routes take you back to the authoritative MIQOS surface for each part of the journey.</p></div>
      </div>
      <div className={styles.topicGrid}>{vm.topics.map(topic=><article className={styles.topicCard} key={topic.topicId}>
        <span className={styles.kicker}>{topic.topicId.replaceAll("_"," ")}</span>
        <h2>{topic.title}</h2>
        <p>{topic.summary}</p>
        {topic.href&&topic.actionLabel?<a href={topic.href}>{topic.actionLabel} →</a>:null}
      </article>)}</div>
    </section>

    <section className={styles.panel}>
      <div className={styles.contactPanel}>
        <div>
          <span className={styles.kicker}>Contact support</span>
          <h2>In-app support case submission is not active yet</h2>
          <p>{vm.contactAction.reason} BUILD-001H therefore provides guidance and navigation only; it does not create messages, tickets or external support records.</p>
        </div>
        <button type="button" disabled>Contact support</button>
      </div>
    </section>

    <section className={styles.panel}>
      <div className={styles.infoGrid}>
        <article className={styles.infoCard}><strong>Need to correct a fact?</strong><span>Use Your Profile. Factual corrections follow the versioned profile lifecycle and cannot be changed by optimisation.</span></article>
        <article className={styles.infoCard}><strong>Need to understand a result?</strong><span>Use Your Results and Why This Surfaced. The explanation is backed by persisted recommendation evidence.</span></article>
        <article className={styles.infoCard}><strong>Need technical trace evidence?</strong><span>The full Audit & Trace Console is an administrative governance surface, not a customer support feature.</span></article>
      </div>
    </section>
  </main>;
}
