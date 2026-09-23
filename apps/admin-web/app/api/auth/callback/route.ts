import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function safeReturnTo(value:string|undefined){
  return value&&value.startsWith("/")&&!value.startsWith("//")?value:"/";
}

export async function GET(request:NextRequest){
  if((process.env.MIQO_DATA_CLASSIFICATION??"").toUpperCase()!=="SYNTHETIC"){
    return NextResponse.json({error:"ADMIN_TEST_IDENTITY_NOT_AUTHORISED"},{status:503});
  }
  const code=request.nextUrl.searchParams.get("code");
  const state=request.nextUrl.searchParams.get("state");
  const expectedState=request.cookies.get("miqo_admin_oauth_state")?.value;
  const verifier=request.cookies.get("miqo_admin_pkce_verifier")?.value;
  if(!code||!state||!expectedState||state!==expectedState||!verifier){
    return NextResponse.json({error:"ADMIN_AUTH_CALLBACK_INVALID"},{status:400});
  }

  const idp=(process.env.MIQO_ADMIN_WEB_IDP_URL??"http://127.0.0.1:4100").replace(/\/$/,"");
  const clientId=process.env.MIQO_ADMIN_AUTH_CLIENT_ID??"miqos-admin-test-public";
  const redirectUri=new URL("/api/auth/callback",request.url).toString();
  const tokenResponse=await fetch(idp+"/token",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      grant_type:"authorization_code",
      code,
      redirect_uri:redirectUri,
      client_id:clientId,
      code_verifier:verifier,
    }),
    cache:"no-store",
  });
  if(!tokenResponse.ok)return NextResponse.json({error:"ADMIN_AUTH_TOKEN_EXCHANGE_FAILED"},{status:401});
  const token=await tokenResponse.json() as {access_token?:string;token_type?:string;expires_in?:number};
  if(!token.access_token||token.token_type!=="Bearer"){
    return NextResponse.json({error:"ADMIN_AUTH_TOKEN_RESPONSE_INVALID"},{status:401});
  }

  const response=NextResponse.redirect(new URL(safeReturnTo(request.cookies.get("miqo_admin_return_to")?.value),request.url));
  response.cookies.set("miqo_admin_access",token.access_token,{
    httpOnly:true,sameSite:"lax",secure:false,path:"/",maxAge:Math.min(token.expires_in??300,300),
  });
  response.cookies.delete("miqo_admin_oauth_state");
  response.cookies.delete("miqo_admin_pkce_verifier");
  response.cookies.delete("miqo_admin_return_to");
  return response;
}
