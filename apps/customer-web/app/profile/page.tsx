import {cookies} from "next/headers";
import {redirect} from "next/navigation";

export default async function ProfileEntry(){
  const cookieStore=await cookies();
  const profileId=cookieStore.get("miqos_active_profile")?.value;
  if(profileId)redirect("/profile/review?profileId="+encodeURIComponent(profileId));
  redirect("/profile/capture");
}
