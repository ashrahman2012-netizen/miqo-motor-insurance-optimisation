"use client";

export async function adminApiFetch(path:string,init:RequestInit={}):Promise<Response>{
  const target="/api/admin"+(path.startsWith("/")?path:"/"+path);
  const response=await fetch(target,{...init,cache:"no-store"});
  if(response.status===401&&typeof window!=="undefined"){
    const returnTo=window.location.pathname+window.location.search;
    window.location.assign("/api/auth/login?returnTo="+encodeURIComponent(returnTo));
    return new Promise<Response>(()=>{});
  }
  return response;
}
