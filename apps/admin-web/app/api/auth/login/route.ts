import {createHash,randomBytes} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function b64url(value:Buffer){
  return value.toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
function safeReturnTo(value:string|null){
  return value&&value.startsWith("/")&&!value.startsWith("//")?value:"/";
}

export async function GET(request:NextRequest){
  if((process.env.MIQO_DATA_CLASSIFICATION??"").toUpperCase()!=="SYNTHETIC"){
    return NextResponse.json({error:"ADMIN_TEST_IDENTITY_NOT_AUTHORISED"},{status:503});
  }
  const idp=(process.env.MIQO_ADMIN_WEB_IDP_URL??"http://127.0.0.1:4100").replace(/\/$/,"");
  const clientId=process.env.MIQO_ADMIN_AUTH_CLIENT_ID??"miqos-admin-test-public";
  const audience=process.env.MIQO_ADMIN_AUTH_AUDIENCE??"miqos-api-test";
  const state=b64url(randomBytes(24));
  const verifier=b64url(randomBytes(48));
  const challenge=b64url(createHash("sha256").update(verifier).digest());
  const redirectUri=new URL("/api/auth/callback",request.url).toString();
  const authorize=new URL(idp+"/authorize");
  authorize.searchParams.set("response_type","code");
  authorize.searchParams.set("client_id",clientId);
  authorize.searchParams.set("redirect_uri",redirectUri);
  authorize.searchParams.set("scope","openid profile");
  authorize.searchParams.set("state",state);
  authorize.searchParams.set("nonce",b64url(randomBytes(18)));
  authorize.searchParams.set("code_challenge",challenge);
  authorize.searchParams.set("code_challenge_method","S256");
  authorize.searchParams.set("audience",audience);

  const response=NextResponse.redirect(authorize);
  const cookie={httpOnly:true,sameSite:"lax" as const,secure:false,path:"/",maxAge:300};
  response.cookies.set("miqo_admin_oauth_state",state,cookie);
  response.cookies.set("miqo_admin_pkce_verifier",verifier,cookie);
  response.cookies.set("miqo_admin_return_to",safeReturnTo(request.nextUrl.searchParams.get("returnTo")),cookie);
  return response;
}
