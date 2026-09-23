import {createPublicKey, verify as verifySignature} from "node:crypto";

export const ADMIN_PERMISSIONS = {
  caseRead: "miqos.admin.case.read",
  profileRead: "miqos.admin.profile.read",
  auditRead: "miqos.admin.audit.read",
  traceRead: "miqos.admin.trace.read",
  rawEvidenceRead: "miqos.admin.raw-evidence.read",
  discrepancyRead: "miqos.admin.discrepancy.read",
  integrityRead: "miqos.admin.integrity.read",
  systemRead: "miqos.admin.system.read",
} as const;

type Principal = {
  subjectId: string;
  displayName: string;
  issuer: string;
  expiresAt: number;
  groups: string[];
  permissions: string[];
};

function b64url(input:string){
  const pad="=".repeat((4-(input.length%4))%4);
  return Buffer.from((input+pad).replace(/-/g,"+").replace(/_/g,"/"),"base64");
}

function parseJsonPart(value:string){
  return JSON.parse(b64url(value).toString("utf8"));
}

function audienceMatches(actual:unknown, expected:string){
  if(typeof actual==="string")return actual===expected;
  return Array.isArray(actual)&&actual.some(value=>value===expected);
}

export function createAdminSecurity(args:{dataClassification:string}){
  const issuer=process.env.MIQO_ADMIN_AUTH_ISSUER??"";
  const audience=process.env.MIQO_ADMIN_AUTH_AUDIENCE??"";
  const jwksUrl=process.env.MIQO_ADMIN_AUTH_JWKS_URL??"";
  let groupPermissions:Record<string,string[]>={};
  try{
    const parsed=JSON.parse(process.env.MIQO_ADMIN_GROUP_PERMISSION_MAP??"{}");
    if(parsed&&typeof parsed==="object")groupPermissions=parsed;
  }catch{}

  let jwksCache:{expiresAt:number;keys:any[]}|null=null;

  function configurationReady(){
    return Boolean(issuer&&audience&&jwksUrl&&Object.keys(groupPermissions).length);
  }

  async function keys(){
    const now=Date.now();
    if(jwksCache&&jwksCache.expiresAt>now)return jwksCache.keys;
    const response=await fetch(jwksUrl,{redirect:"error"});
    if(!response.ok)throw new Error("ADMIN_AUTH_JWKS_UNAVAILABLE");
    const body=await response.json() as {keys?:any[]};
    if(!Array.isArray(body.keys)||body.keys.length===0)throw new Error("ADMIN_AUTH_JWKS_INVALID");
    jwksCache={expiresAt:now+60_000,keys:body.keys};
    return body.keys;
  }

  async function authenticate(request:any):Promise<Principal>{
    if(!configurationReady())throw new Error("ADMIN_SECURITY_CONFIG_INVALID");
    const header=String(request.headers.authorization??"");
    if(!header.startsWith("Bearer "))throw new Error("ADMIN_AUTH_REQUIRED");
    const token=header.slice(7).trim();
    if(!token||token.length>16_384)throw new Error("ADMIN_ACCESS_TOKEN_INVALID");
    const parts=token.split(".");
    if(parts.length!==3)throw new Error("ADMIN_ACCESS_TOKEN_INVALID");
    const [encodedHeader,encodedPayload,encodedSignature]=parts;
    let jwtHeader:any; let claims:any;
    try{jwtHeader=parseJsonPart(encodedHeader);claims=parseJsonPart(encodedPayload);}catch{throw new Error("ADMIN_ACCESS_TOKEN_INVALID");}
    if(jwtHeader?.alg!=="RS256"||typeof jwtHeader?.kid!=="string")throw new Error("ADMIN_ACCESS_TOKEN_ALGORITHM_INVALID");
    const jwks=await keys();
    const jwk=jwks.find(item=>item?.kid===jwtHeader.kid&&item?.kty==="RSA"&&(!item.alg||item.alg==="RS256"));
    if(!jwk)throw new Error("ADMIN_ACCESS_TOKEN_KEY_UNKNOWN");
    let verified=false;
    try{
      const key=createPublicKey({key:jwk,format:"jwk"});
      verified=verifySignature("RSA-SHA256",Buffer.from(encodedHeader+"."+encodedPayload),key,b64url(encodedSignature));
    }catch{}
    if(!verified)throw new Error("ADMIN_ACCESS_TOKEN_SIGNATURE_INVALID");
    const now=Math.floor(Date.now()/1000);
    if(claims?.iss!==issuer)throw new Error("ADMIN_ACCESS_TOKEN_ISSUER_INVALID");
    if(!audienceMatches(claims?.aud,audience))throw new Error("ADMIN_ACCESS_TOKEN_AUDIENCE_INVALID");
    if(!Number.isInteger(claims?.exp)||claims.exp<=now)throw new Error("ADMIN_ACCESS_TOKEN_EXPIRED");
    if(Number.isInteger(claims?.nbf)&&claims.nbf>now+30)throw new Error("ADMIN_ACCESS_TOKEN_NOT_YET_VALID");
    if(typeof claims?.sub!=="string"||!claims.sub)throw new Error("ADMIN_ACCESS_TOKEN_SUBJECT_INVALID");
    const groups=Array.isArray(claims.groups)?claims.groups.filter((v:any)=>typeof v==="string"):[];
    const permissionSet=new Set<string>();
    for(const group of groups){
      for(const permission of groupPermissions[group]??[])permissionSet.add(permission);
    }
    return {
      subjectId:claims.sub,
      displayName:typeof claims.name==="string"&&claims.name?claims.name:claims.sub,
      issuer,
      expiresAt:claims.exp,
      groups,
      permissions:[...permissionSet].sort(),
    };
  }

  function securityAudit(request:any,args:{principal?:Principal|null;permission?:string;resourceType:string;resourceId?:string;outcome:string;reasonCode:string;sensitiveRead?:boolean}){
    request.log.info({
      eventCode:"SECURITY_ACCESS",
      environment:args.dataClassification??undefined,
      subjectId:args.principal?.subjectId??null,
      operation:String(request.method)+" "+String(request.routeOptions?.url??request.url),
      resourceType:args.resourceType,
      resourceId:args.resourceId??null,
      permission:args.permission??null,
      outcome:args.outcome,
      reasonCode:args.reasonCode,
      sensitiveRead:Boolean(args.sensitiveRead),
      traceId:request.miqoTraceId??null,
    },"MIQO Admin security access");
  }

  async function requireAuthentication(request:any,reply:any,resourceType="session"){
    try{
      const principal=await authenticate(request);
      securityAudit(request,{principal,resourceType,outcome:"ALLOW",reasonCode:"AUTHENTICATED"});
      return principal;
    }catch(error:any){
      const reason=String(error?.message??"ADMIN_AUTH_FAILED");
      securityAudit(request,{resourceType,outcome:"DENY",reasonCode:reason});
      if(reason==="ADMIN_SECURITY_CONFIG_INVALID"||reason==="ADMIN_AUTH_JWKS_UNAVAILABLE"||reason==="ADMIN_AUTH_JWKS_INVALID"){
        reply.code(503).send({error:"ADMIN_SECURITY_UNAVAILABLE"});
      }else{
        reply.header("www-authenticate",'Bearer realm="miqos-admin"');
        reply.code(401).send({error:"ADMIN_AUTHENTICATION_REQUIRED",reasonCode:reason});
      }
      return null;
    }
  }

  async function requirePermissions(request:any,reply:any,permissions:string[],resourceType:string,resourceId?:string,sensitiveRead=false){
    const principal=await requireAuthentication(request,reply,resourceType);
    if(!principal)return null;
    for(const permission of permissions){
      if(!principal.permissions.includes(permission)){
        securityAudit(request,{principal,permission,resourceType,resourceId,outcome:"DENY",reasonCode:"ADMIN_PERMISSION_DENIED",sensitiveRead});
        reply.code(403).send({error:"ADMIN_NOT_AUTHORISED",permission});
        return null;
      }
    }
    for(const permission of permissions){
      securityAudit(request,{principal,permission,resourceType,resourceId,outcome:"ALLOW",reasonCode:"ADMIN_PERMISSION_ALLOWED",sensitiveRead});
    }
    return principal;
  }

  function sessionDescriptor(principal:Principal){
    return {
      subjectId:principal.subjectId,
      displayName:principal.displayName,
      environment:args.dataClassification,
      permissions:principal.permissions,
      sessionExpiresAt:new Date(principal.expiresAt*1000).toISOString(),
      authenticationContext:{
        issuer:principal.issuer,
        protocol:"OIDC_AUTHORIZATION_CODE_PKCE",
        credentialLocation:"NATIVE_PROCESS_MEMORY",
      },
    };
  }

  return {requireAuthentication,requirePermissions,sessionDescriptor};
}
