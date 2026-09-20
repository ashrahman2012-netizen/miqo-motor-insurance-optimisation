import {PageHeader,PageState} from "@miqo/ui";
import {loadProfileLifecycle} from "../load-profile";
import {resolveProfileId} from "../profile-context";
import {DiscrepancyResolution,ProfileProgress,ProfileVersionPanel} from "../profile-components";
import styles from "../profile.module.css";

export default async function ProfileDiscrepanciesPage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const profileId=await resolveProfileId(searchParams);
  if(!profileId)return <main className={styles.page}><PageHeader eyebrow="Your profile" title="Discrepancies" description="Review factual evidence differences."/><PageState state="EMPTY" title="No active profile" message="Capture a profile first."/></main>;
  const vm=await loadProfileLifecycle(profileId);
  return <main className={styles.page}>
    <header className={styles.hero}><PageHeader eyebrow="Your profile" title="Discrepancy review" description="Review recorded evidence differences without mutating locked factual history."/></header>
    <ProfileProgress journey={vm.journey}/>
    <div className={styles.reviewGrid}><div className={styles.leftStack}><DiscrepancyResolution vm={vm}/></div><div className={styles.rightStack}><ProfileVersionPanel vm={vm}/></div></div>
    <div className={styles.emptyActions}><a className="miqos-button miqos-button--secondary" href={"/profile/review?profileId="+encodeURIComponent(profileId)}>Return to Profile Review & Lock</a></div>
  </main>;
}
