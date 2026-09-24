import {createHash} from "node:crypto";

const idpUrl=(process.env.MIQO_TEST_IDP_URL??"http://127.0.0.1:4100").replace(/\/$/,"");

function challenge(verifier:string){
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function obtainSyntheticAdminToken(loginHint?:string){
  const verifier=("miqo-api-pkce-"+(loginHint??"full")+"-").padEnd(64,"x");
  const redirectUri="http://127.0.0.1:59998/oauth/callback";
  const authorize=new URL(idpUrl+"/authorize");
  authorize.searchParams.set("response_type","code");
  authorize.searchParams.set("client_id","miqos-admin-test-public");
  authorize.searchParams.set("redirect_uri",redirectUri);
  authorize.searchParams.set("scope","openid profile");
  authorize.searchParams.set("state","api-test-state");
  authorize.searchParams.set("nonce","api-test-nonce");
  authorize.searchParams.set("code_challenge",challenge(verifier));
  authorize.searchParams.set("code_challenge_method","S256");
  authorize.searchParams.set("audience","miqos-api-test");
  if(loginHint)authorize.searchParams.set("login_hint",loginHint);
  const auth=await fetch(authorize,{redirect:"manual"});
  if(auth.status!==302)throw new Error("TEST_IDP_AUTHORIZE_FAILED");
  const location=auth.headers.get("location");
  const code=location?new URL(location).searchParams.get("code"):null;
  if(!code)throw new Error("TEST_IDP_CODE_MISSING");
  const tokenResponse=await fetch(idpUrl+"/token",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      grant_type:"authorization_code",
      code,
      redirect_uri:redirectUri,
      client_id:"miqos-admin-test-public",
      code_verifier:verifier,
    }),
  });
  if(!tokenResponse.ok)throw new Error("TEST_IDP_TOKEN_FAILED");
  const token=await tokenResponse.json() as {access_token?:string};
  if(!token.access_token)throw new Error("TEST_IDP_ACCESS_TOKEN_MISSING");
  return token.access_token;
}

export async function adminHeaders(loginHint?:string){
  return {authorization:"Bearer "+await obtainSyntheticAdminToken(loginHint)};
}
