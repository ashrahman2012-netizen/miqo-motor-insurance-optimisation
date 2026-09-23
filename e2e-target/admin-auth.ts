import {createHash} from "node:crypto";

const IDP="http://127.0.0.1:4100";

export async function obtainAdminToken(){
  const verifier="miqos-e2e-pkce-verifier-".padEnd(64,"x");
  const redirectUri="http://127.0.0.1:59997/oauth/callback";
  const authorize=new URL(IDP+"/authorize");
  authorize.searchParams.set("response_type","code");
  authorize.searchParams.set("client_id","miqos-admin-test-public");
  authorize.searchParams.set("redirect_uri",redirectUri);
  authorize.searchParams.set("scope","openid profile");
  authorize.searchParams.set("state","e2e-state");
  authorize.searchParams.set("nonce","e2e-nonce");
  authorize.searchParams.set("code_challenge",createHash("sha256").update(verifier).digest("base64url"));
  authorize.searchParams.set("code_challenge_method","S256");
  authorize.searchParams.set("audience","miqos-api-test");
  const auth=await fetch(authorize,{redirect:"manual"});
  if(auth.status!==302)throw new Error("E2E_ADMIN_AUTHORIZE_FAILED");
  const location=auth.headers.get("location");
  const code=location?new URL(location).searchParams.get("code"):null;
  if(!code)throw new Error("E2E_ADMIN_CODE_MISSING");
  const response=await fetch(IDP+"/token",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      grant_type:"authorization_code",code,redirect_uri:redirectUri,
      client_id:"miqos-admin-test-public",code_verifier:verifier,
    }),
  });
  if(!response.ok)throw new Error("E2E_ADMIN_TOKEN_FAILED");
  const body=await response.json() as {access_token?:string};
  if(!body.access_token)throw new Error("E2E_ADMIN_TOKEN_MISSING");
  return body.access_token;
}
