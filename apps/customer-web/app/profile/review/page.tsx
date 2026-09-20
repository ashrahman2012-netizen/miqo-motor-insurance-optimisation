import {PageHeader,PageState} from "@miqo/ui";
import {loadProfileLifecycle} from "../load-profile";
import {resolveProfileId} from "../profile-context";
import {DiscrepancyResolution,IntegrityRules,LockSection,ProfileProgress,ProfileSummary,ProfileVersionPanel,ValidationResults} from "../profile-components";
import {ValidateProfileButton} from "../profile-actions";
import styles from "../profile.module.css";

export default async function ProfileReviewPage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const profileId=await resolveProfileId(searchParams);
  if(!profileId)return <main className={styles.page}><header className={styles.hero}><PageHeader eyebrow="Your profile" title="Profile Review & Lock" description="Check your details, review discrepancies and lock the current factual version."/></header><section className={styles.panel+" "+styles.empty}><PageState state="EMPTY" title="No active profile" message="Start with profile capture before review."/><a className="miqos-button miqos-button--primary" href="/profile/capture">Go to profile capture</a></section></main>;
  const vm=await loadProfileLifecycle(profileId);
  return <main className={styles.page}>
    <header className={styles.hero}><PageHeader eyebrow="Your profile" title="Profile Review & Lock" description="Check your details, resolve factual evidence differences and lock the current profile version."/></header>
    <ProfileProgress journey={vm.journey}/>
    <div className={styles.reviewGrid}>
      <div className={styles.leftStack}>
        <ProfileSummary vm={vm}/>
        <DiscrepancyResolution vm={vm}/>
      </div>
      <div className={styles.rightStack}>
        <ValidationResults vm={vm}/>
        {!vm.review.validation.valid?<section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.kicker}>Validation action</span><h2>Check current draft</h2></div></div><ValidateProfileButton profileId={profileId} valid={vm.review.validation.valid}/></section>:null}
        <ProfileVersionPanel vm={vm}/>
        <IntegrityRules/>
      </div>
    </div>
    <LockSection vm={vm}/>
  </main>;
}
