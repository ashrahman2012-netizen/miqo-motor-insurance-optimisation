export const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://127.0.0.1:4000";
export const SYNTHETIC_ADMIN_KEY=process.env.NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_KEY??"";
export const ADMIN_API_HEADERS={"x-miqo-synthetic-admin":SYNTHETIC_ADMIN_KEY};
