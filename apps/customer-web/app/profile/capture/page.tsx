import {PageHeader,PageState} from "@miqo/ui";
import {loadProfileLifecycle} from "../load-profile";
import {resolveProfileId} from "../profile-context";
import {ProfileCaptureForm,StartProfileButton} from "../profile-actions";
import {ProfileProgress} from "../profile-components";
import styles from "../profile.module.css";

export default async function ProfileCapturePage({searchParams}:{searchParams:Promise<{profileId?:string|string[]}>}){
  const profileId=await resolveProfileId(searchParams);
  if(!profileId)return <main className={styles.page}><header className={styles.hero}><PageHeader eyebrow="Your profile" title="Profile capture" description="Build the factual profile that later optimisation is allowed to read — not rewrite."/></header><section className={styles.panel+" "+styles.empty}><PageState state="EMPTY" title="No active profile" message="Start a synthetic profile to enter the required factual fields."/><StartProfileButton/></section></main>;
  const vm=await loadProfileLifecycle(profileId);
  return <main className={styles.page}>
    <header className={styles.hero}><PageHeader eyebrow="Your profile" title="Profile capture" description="Enter factual information for the current profile version."/></header>
    <ProfileProgress journey={vm.journey}/>
    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className={styles.kicker}>Factual fields</span><h2>Required profile information</h2><p>F-class values remain factual. Once locked, corrections create a new version.</p></div><span><code>v{vm.review.version.versionNo}</code></span></div>
      <ProfileCaptureForm profileId={profileId} versionId={vm.review.version.versionId} status={vm.review.version.status} fields={vm.review.fields}/>
    </section>
  </main>;
}
