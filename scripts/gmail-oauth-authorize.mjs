import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const clientId=process.env.MIQO_GMAIL_CLIENT_ID?.trim();
const clientSecret=process.env.MIQO_GMAIL_CLIENT_SECRET?.trim();
if(!clientId||!clientSecret){
  console.error("Set MIQO_GMAIL_CLIENT_ID and MIQO_GMAIL_CLIENT_SECRET before running this helper.");
  process.exit(1);
}

const port=Number(process.env.MIQO_GMAIL_OAUTH_PORT??"53682");
const redirectUri="http://127.0.0.1:"+port+"/oauth2callback";
const state=randomBytes(24).toString("hex");
const scope="https://www.googleapis.com/auth/gmail.send";
const auth=new URL("https://accounts.google.com/o/oauth2/v2/auth");
auth.search=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:"code",scope,access_type:"offline",prompt:"consent",state}).toString();

function openBrowser(url){
  try{
    if(process.platform==="win32")spawn("cmd",["/c","start","",url],{detached:true,stdio:"ignore",windowsHide:true}).unref();
    else if(process.platform==="darwin")spawn("open",[url],{detached:true,stdio:"ignore"}).unref();
    else spawn("xdg-open",[url],{detached:true,stdio:"ignore"}).unref();
  }catch{}
}

let resolveCode;
let rejectCode;
const codePromise=new Promise((resolve,reject)=>{resolveCode=resolve;rejectCode=reject;});
const server=createServer((req,res)=>{
  const url=new URL(req.url??"/",redirectUri);
  if(url.pathname!=="/oauth2callback"){res.writeHead(404);res.end("Not found");return;}
  if(url.searchParams.get("state")!==state){res.writeHead(400);res.end("OAuth state mismatch");rejectCode(new Error("OAuth state mismatch"));return;}
  const error=url.searchParams.get("error");
  const code=url.searchParams.get("code");
  if(error||!code){res.writeHead(400);res.end("Gmail authorization was not completed.");rejectCode(new Error(error||"Authorization code missing"));return;}
  res.writeHead(200,{"content-type":"text/html; charset=utf-8"});
  res.end("<h1>MIQOS Gmail authorization complete</h1><p>You can close this browser tab and return to the terminal.</p>");
  resolveCode(code);
});

server.listen(port,"127.0.0.1",()=>{
  console.log("Open this Google authorization URL if the browser does not open automatically:\n");
  console.log(auth.toString());
  console.log("\nAuthorize the dedicated MIQOS Gmail account with the Gmail send permission.");
  openBrowser(auth.toString());
});

const timeout=setTimeout(()=>rejectCode(new Error("Authorization timed out")),180_000);
try{
  const code=await codePromise;
  const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,grant_type:"authorization_code",redirect_uri:redirectUri});
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  const json=await response.json().catch(()=>({}));
  if(!response.ok||!json.refresh_token)throw new Error("Token exchange failed ("+response.status+"). Re-run and confirm the Gmail account.");
  console.log("\nAuthorization succeeded. Store the following value as a local environment secret; do not commit or paste it into chat:\n");
  console.log("MIQO_GMAIL_REFRESH_TOKEN="+json.refresh_token);
  console.log("\nThen start the MIQOS API with MIQO_FORM_SUBMISSION_ENABLED=true and MIQO_ALLOW_FILE_ORIGIN=true for synthetic local testing.");
}finally{
  clearTimeout(timeout);
  server.close();
}
