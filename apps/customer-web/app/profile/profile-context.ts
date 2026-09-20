import {cookies} from "next/headers";

export async function resolveProfileId(searchParams:Promise<{profileId?:string|string[]}>){
  const params=await searchParams;
  const raw=Array.isArray(params.profileId)?params.profileId[0]:params.profileId;
  if(raw?.trim())return raw.trim();
  const cookieStore=await cookies();
  return cookieStore.get("miqos_active_profile")?.value??null;
}
