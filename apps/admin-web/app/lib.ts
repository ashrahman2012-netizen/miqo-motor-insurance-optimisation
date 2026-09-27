export const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://127.0.0.1:4000";
const SYNTHETIC_ADMIN_KEY=process.env.NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_KEY??"";
export const ADMIN_API_OPTIONS:RequestInit=SYNTHETIC_ADMIN_KEY
  ? {headers:{"x-miqo-synthetic-admin":SYNTHETIC_ADMIN_KEY}}
  : {credentials:"include"};
