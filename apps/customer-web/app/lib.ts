export const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://127.0.0.1:4000";
export const ADMIN_URL=process.env.NEXT_PUBLIC_ADMIN_WEB_URL??"http://127.0.0.1:3001";
export const SYNTHETIC_ADMIN_GATE=process.env.NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_GATE??"";
export function adminUrl(path:string){
  const url=new URL(path,ADMIN_URL);
  if(SYNTHETIC_ADMIN_GATE)url.searchParams.set("syntheticAdmin",SYNTHETIC_ADMIN_GATE);
  return url.toString();
}
