import {PageHeader,PageState} from "@miqo/ui";
import {loadProfileLifecycle} from "../load-profile";
import {resolveProfileId} from "../profile-context";
import {ValidateProfileButton} from "../profile-actions";
import {ProfileProgress,ProfileSummary,ValidationResults} from "../profile-components";
import styles from "../profile.module.css";

export default async function ProfileValidationPage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const profileId=await resolveProfileId(searchParams);
  if(!profileId)return <main className={styles.page}><PageHeader eyebrow="Your profile" title="Validation" description="Run profile validation before review and lock."/><PageState state="EMPTY" title="No active profile" message="Capture a profile first."/></main>;
  const vm=await loadProfileLifecycle(profileId);
  return <main className={styles.page}>
    <header className={styles.hero}><PageHeader eyebrow="Your profile" title="Profile validation" description="Check the current factual profile against the existing validation service."/></header>
    <ProfileProgress journey={vm.journey}/>
    <div className={styles.reviewGrid}><div className={styles.leftStack}><ProfileSummary vm={vm}/></div><div className={styles.rightStack}><ValidationResults vm={vm}/><section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.kicker}>Action</span><h2>Run controlled validation</h2></div></div><ValidateProfileButton profileId={profileId} valid={vm.review.validation.valid}/></section></div></div>
  </main>;
}
