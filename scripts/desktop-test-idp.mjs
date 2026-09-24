import http from "node:http";
import {createHash, generateKeyPairSync, randomBytes, sign} from "node:crypto";

const host="127.0.0.1";
const port=Number(process.env.MIQO_TEST_IDP_PORT??4100);
const issuer=`http://${host}:${port}`;
const audience=process.env.MIQO_TEST_IDP_AUDIENCE??"miqos-api-test";
const clientId=process.env.MIQO_TEST_IDP_CLIENT_ID??"miqos-admin-test-public";
const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const jwk=publicKey.export({format:"jwk"});
Object.assign(jwk,{kid:"miqos-test-rs256-1",use:"sig",alg:"RS256"});
const codes=new Map();

function b64url(value){
  const input=Buffer.isBuffer(value)?value:Buffer.from(value);
  return input.toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
function sha256(value){return b64url(createHash("sha256").update(value).digest());}
function json(res,status,body){const data=JSON.stringify(body);res.writeHead(status,{"content-type":"application/json","content-length":Buffer.byteLength(data)});res.end(data);}
function jwt(claims){
  const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT",kid:jwk.kid}));
  const payload=b64url(JSON.stringify(claims));
  const signature=sign("RSA-SHA256",Buffer.from(header+"."+payload),privateKey);
  return header+"."+payload+"."+b64url(signature);
}
function readBody(req){return new Promise((resolve,reject)=>{let body="";req.on("data",c=>{body+=c;if(body.length>16384)reject(new Error("too_large"));});req.on("end",()=>resolve(body));req.on("error",reject);});}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url??"/",issuer);
  if(req.method==="GET"&&url.pathname==="/.well-known/openid-configuration"){
    return json(res,200,{issuer,authorization_endpoint:issuer+"/authorize",token_endpoint:issuer+"/token",jwks_uri:issuer+"/jwks",response_types_supported:["code"],code_challenge_methods_supported:["S256"],token_endpoint_auth_methods_supported:["none"]});
  }
  if(req.method==="GET"&&url.pathname==="/jwks")return json(res,200,{keys:[jwk]});
  if(req.method==="GET"&&url.pathname==="/authorize"){
    const responseType=url.searchParams.get("response_type");
    const requestClient=url.searchParams.get("client_id");
    const redirectUri=url.searchParams.get("redirect_uri");
    const state=url.searchParams.get("state");
    const challenge=url.searchParams.get("code_challenge");
    const challengeMethod=url.searchParams.get("code_challenge_method");
    const requestedAudience=url.searchParams.get("audience");
    if(responseType!=="code"||requestClient!==clientId||!redirectUri?.startsWith("http://127.0.0.1:")||!state||!challenge||challengeMethod!=="S256"||requestedAudience!==audience){
      return json(res,400,{error:"invalid_request"});
    }
    const code=b64url(randomBytes(24));
    const limited=url.searchParams.get("login_hint")==="limited";
    codes.set(code,{redirectUri,challenge,clientId:requestClient,groups:limited?["miqos-admin-profile"]:["miqos-admin-read","miqos-admin-raw"],nonce:url.searchParams.get("nonce")});
    const target=new URL(redirectUri);target.searchParams.set("code",code);target.searchParams.set("state",state);
    res.writeHead(302,{location:target.toString(),"cache-control":"no-store"});return res.end();
  }
  if(req.method==="POST"&&url.pathname==="/token"){
    try{
      const body=new URLSearchParams(await readBody(req));
      const code=body.get("code");const record=code?codes.get(code):null;
      if(body.get("grant_type")!=="authorization_code"||!record||body.get("client_id")!==record.clientId||body.get("redirect_uri")!==record.redirectUri||sha256(body.get("code_verifier")??"")!==record.challenge){
        return json(res,400,{error:"invalid_grant"});
      }
      codes.delete(code);
      const now=Math.floor(Date.now()/1000);
      const accessToken=jwt({iss:issuer,aud:audience,sub:"USR-SYN-ADMIN-001",name:"Synthetic Admin",groups:record.groups,iat:now,nbf:now-1,exp:now+300,jti:b64url(randomBytes(12))});
      return json(res,200,{access_token:accessToken,token_type:"Bearer",expires_in:300,scope:"openid profile"});
    }catch{return json(res,400,{error:"invalid_request"});}
  }
  if(req.method==="GET"&&url.pathname==="/health")return json(res,200,{status:"ok",issuer});
  return json(res,404,{error:"not_found"});
});
server.listen(port,host,()=>console.log(`MIQO_TEST_IDP_READY ${issuer}`));
process.on("SIGTERM",()=>server.close(()=>process.exit(0)));
