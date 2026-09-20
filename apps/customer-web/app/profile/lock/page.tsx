import {PageHeader,PageState} from "@miqo/ui";
import {loadProfileLifecycle} from "../load-profile";
import {resolveProfileId} from "../profile-context";
import {LockSection,ProfileProgress,ProfileSummary,ValidationResults} from "../profile-components";
import styles from "../profile.module.css";

export default async function ProfileLockPage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const profileId=await resolveProfileId(searchParams);
  if(!profileId)return <main className={styles.page}><PageHeader eyebrow="Your profile" title="Confirm & lock" description="Confirm the current factual version."/><PageState state="EMPTY" title="No active profile" message="Capture and validate a profile first."/></main>;
  const vm=await loadProfileLifecycle(profileId);
  return <main className={styles.page}>
    <header className={styles.hero}><PageHeader eyebrow="Your profile" title="Confirm & lock" description="Confirm that the current factual profile version is ready to be locked."/></header>
    <ProfileProgress journey={vm.journey}/>
    <div className={styles.reviewGrid}><div className={styles.leftStack}><ProfileSummary vm={vm}/></div><div className={styles.rightStack}><ValidationResults vm={vm}/></div></div>
    <LockSection vm={vm}/>
  </main>;
}
