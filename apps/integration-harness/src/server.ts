import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";
import { migrate, openDatabase } from "./db.ts";
import {
  ConflictError, ValidationError, auditEvents, createCorrectionDraft, createPersistedScenario,
  createProfile, currentVersion, listDiscrepancies, listValues, lockProfile, profileSnapshot, putFact, resolveDiscrepancy, validateProfile
} from "./service.ts";

const classification = process.env.MIQO_DATA_CLASSIFICATION ?? "SYNTHETIC";
const live = (process.env.MIQO_LIVE_PROVIDERS_ENABLED ?? "false").toLowerCase() === "true";
if (classification !== "SYNTHETIC" || live) throw new Error("Prototype boundary violation");

const dbPath = process.env.MIQO_HARNESS_DB ?? resolve(process.cwd(), "data/integration-harness.sqlite");
const db = openDatabase(dbPath);
migrate(db);

function html(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#151515}.banner{border:2px solid;padding:10px;font-weight:800}.card{border:1px solid #bbb;padding:18px;margin:16px 0}label{display:block;margin:12px 0}input{padding:8px;width:min(420px,100%)}button,a.button{display:inline-block;padding:9px 13px;border:1px solid #222;background:#fff;color:#111;text-decoration:none;cursor:pointer}code{background:#eee;padding:2px 5px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}.fact{font-weight:700}.locked{background:#eee}</style><script>window.__miqoRequest=window.__miqoRequest||((...a)=>fetch(...a));window.__miqoNavigate=window.__miqoNavigate||((p)=>{location.href=p});</script></head><body><div class="banner">MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY</div>${body}</body></html>`;
}

async function bodyJson(req: IncomingMessage): Promise<any> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(res:ServerResponse,status:number,data:unknown){res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(data));}
function sendHtml(res:ServerResponse,status:number,data:string){res.writeHead(status,{"content-type":"text/html; charset=utf-8"});res.end(data);}

const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    const path = url.pathname;

    if (req.method === "GET" && path === "/health") return sendJson(res,200,{status:"ok",classification,dbPath});
    if (req.method === "GET" && (path === "/" || path === "/prototype")) {
      return sendHtml(res,200,html("MIQO C-01",`<main><p>Customer · C-01</p><h1>Build one truthful profile. Change choices, not facts.</h1><p>No real customer data. No live insurer/provider connections.</p><button id="start">Start synthetic profile</button><script>document.querySelector('#start').onclick=async()=>{const r=await window.__miqoRequest('/api/profiles',{method:'POST'});const x=await r.json();window.__miqoNavigate('/profile/'+x.profileId+'/section/identity');}</script></main>`));
    }

    const sectionMatch = path.match(/^\/profile\/([^/]+)\/section\/identity$/);
    if (req.method === "GET" && sectionMatch) {
      const profileId = sectionMatch[1];
      const version = currentVersion(db, profileId);
      if (!version) return sendJson(res,404,{error:"profile_not_found"});
      const values = listValues(db,String(version.risk_profile_version_id));
      const value = (fieldId:string, fallback:unknown) => values.find(v=>v.fieldId===fieldId)?.value ?? fallback;
      const readOnly = version.status !== "DRAFT";
      const ro = readOnly ? "readonly aria-readonly=\"true\"" : "";
      const action = readOnly
        ? `<p id="locked-note"><strong>LOCKED</strong> — factual values are read-only. A correction creates a new profile version.</p><button id="correct" type="button">Correct factual information</button>`
        : `<button>Save & continue</button>`;
      const script = readOnly ? "" : `<script>document.querySelector('#facts').onsubmit=async(e)=>{e.preventDefault();const f=new FormData(e.target);const payload={main_driver_id:f.get('main_driver_id'),annual_mileage:Number(f.get('annual_mileage')),licence_held_since:f.get('licence_held_since')};const r=await window.__miqoRequest('/api/profiles/${profileId}/facts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!r.ok){alert(await r.text());return;}window.__miqoNavigate('/profile/${profileId}/review');}</script>`;
      return sendHtml(res,200,html("MIQO C-03",`<main><p>Customer · C-03</p><h1>Minimum factual profile</h1><p><strong>FACT</strong> — synthetic test circumstances.</p><form id="facts"><label>Main driver ID<input name="main_driver_id" ${ro} value="${value('main_driver_id','DRV-SYN-001')}"></label><label>Annual mileage<input name="annual_mileage" ${ro} type="number" value="${value('annual_mileage',8000)}"></label><label>Licence held since<input name="licence_held_since" ${ro} type="date" value="${value('licence_held_since','2018-04-16')}"></label>${action}</form>${script}</main>`));
    }

    const reviewMatch = path.match(/^\/profile\/([^/]+)\/review$/);
    if (req.method === "GET" && reviewMatch) {
      const profileId = reviewMatch[1];
      const result = validateProfile(db, profileId);
      const issueHtml = result.issues.length ? `<ul>${result.issues.map(x=>`<li>${x}</li>`).join('')}</ul>` : "<p id=validation-pass><strong>Completeness: PASS · Validation: PASS · Verification: SIMULATED</strong></p>";
      return sendHtml(res,200,html("MIQO C-05",`<main><p>Customer · C-05</p><h1>Review your factual profile</h1>${issueHtml}${result.valid?`<button id="continue" onclick="window.__miqoNavigate('/profile/${profileId}/lock')">Continue to confirmation</button>`:""}</main>`));
    }

    const lockPageMatch = path.match(/^\/profile\/([^/]+)\/lock$/);
    if (req.method === "GET" && lockPageMatch) {
      const profileId=lockPageMatch[1];
      return sendHtml(res,200,html("MIQO C-07",`<main><p>Customer · C-07</p><h1>Confirm and lock profile</h1><p>After locking, optimisation can change choices only — not these facts.</p><label><input id="confirm" type="checkbox"> I confirm this synthetic factual profile.</label><button id="lock" disabled>Confirm & lock profile</button><script>const c=document.querySelector('#confirm'),b=document.querySelector('#lock');c.onchange=()=>b.disabled=!c.checked;b.onclick=async()=>{const r=await window.__miqoRequest('/api/profiles/${profileId}/lock',{method:'POST'});const x=await r.json();if(!r.ok){alert(JSON.stringify(x));return;}window.__miqoNavigate('/admin/profiles/${profileId}');}</script></main>`));
    }

    const adminMatch = path.match(/^\/admin\/profiles\/([^/]+)$/);
    if (req.method === "GET" && adminMatch) {
      const profileId=adminMatch[1];
      const snapshot=profileSnapshot(db,profileId);
      const rows=snapshot.map(v=>`<section class="card"><h2>RiskProfileVersion v${v.versionNo} — <span id="status-v${v.versionNo}">${v.status}</span></h2><p><code>${v.versionId}</code></p><table><thead><tr><th>Field</th><th>Class</th><th>Value</th><th>Mutability</th></tr></thead><tbody>${v.values.map(x=>`<tr><td>${x.fieldId}</td><td>${x.controlClass}</td><td id="${x.fieldId}-v${v.versionNo}">${String(x.value)}</td><td>${v.status==='DRAFT'?'EDITABLE':'IMMUTABLE'}</td></tr>`).join('')}</tbody></table></section>`).join('');
      return sendHtml(res,200,html("MIQO A-02",`<main><p>Admin · A-02</p><h1>Profile inspector</h1><p id="profile-id">${profileId}</p>${rows}</main>`));
    }

    if (req.method === "POST" && path === "/api/profiles") return sendJson(res,201,createProfile(db));

    const factBulk = path.match(/^\/api\/profiles\/([^/]+)\/facts$/);
    if (req.method === "POST" && factBulk) {
      const profileId=factBulk[1], payload=await bodyJson(req);
      for (const [fieldId,value] of Object.entries(payload)) putFact(db,{profileId,fieldId,value,controlClass:"F"});
      return sendJson(res,200,{ok:true});
    }

    const validateMatch=path.match(/^\/api\/profiles\/([^/]+)\/validate$/);
    if(req.method==="POST"&&validateMatch)return sendJson(res,200,validateProfile(db,validateMatch[1]));

    const lockMatch=path.match(/^\/api\/profiles\/([^/]+)\/lock$/);
    if(req.method==="POST"&&lockMatch)return sendJson(res,200,lockProfile(db,lockMatch[1]));

    const directMutation=path.match(/^\/api\/profile-versions\/([^/]+)\/facts\/([^/]+)$/);
    if(req.method==="PUT"&&directMutation){
      const [,versionId,fieldId]=directMutation; const payload=await bodyJson(req);
      const row=db.prepare("SELECT profile_id,status FROM risk_profile_version WHERE risk_profile_version_id=?").get(versionId) as any;
      if(!row)return sendJson(res,404,{error:"not_found"});
      if(row.status!=="DRAFT")throw new ConflictError("LOCKED_PROFILE_IMMUTABLE");
      putFact(db,{profileId:String(row.profile_id),fieldId,value:payload.value,controlClass:"F"});
      return sendJson(res,200,{ok:true});
    }

    const scenarioMatch=path.match(/^\/api\/profile-versions\/([^/]+)\/scenarios$/);
    if(req.method==="POST"&&scenarioMatch){const payload=await bodyJson(req);return sendJson(res,201,createPersistedScenario(db,{versionId:scenarioMatch[1],deltas:payload.deltas??[]}));}

    const correctionMatch=path.match(/^\/api\/profiles\/([^/]+)\/corrections$/);
    if(req.method==="POST"&&correctionMatch){const payload=await bodyJson(req);return sendJson(res,201,createCorrectionDraft(db,{profileId:correctionMatch[1],fieldId:payload.fieldId,value:payload.value}));}

    const discrepanciesMatch=path.match(/^\/api\/profiles\/([^/]+)\/discrepancies$/);
    if(req.method==="GET"&&discrepanciesMatch)return sendJson(res,200,{items:listDiscrepancies(db,discrepanciesMatch[1])});

    const resolveDiscMatch=path.match(/^\/api\/profiles\/([^/]+)\/discrepancies\/([^/]+)\/resolve$/);
    if(req.method==="POST"&&resolveDiscMatch){const payload=await bodyJson(req);return sendJson(res,200,resolveDiscrepancy(db,{profileId:resolveDiscMatch[1],discrepancyId:resolveDiscMatch[2],state:payload.state}));}

    const snapshotMatch=path.match(/^\/api\/profiles\/([^/]+)\/snapshot$/);
    if(req.method==="GET"&&snapshotMatch)return sendJson(res,200,{versions:profileSnapshot(db,snapshotMatch[1]),audit:auditEvents(db,snapshotMatch[1])});

    sendJson(res,404,{error:"not_found"});
  } catch(error:any) {
    if(error instanceof ConflictError)return sendJson(res,409,{error:error.message});
    if(error instanceof ValidationError)return sendJson(res,422,{error:error.message,issues:error.issues});
    if(String(error?.message??error).includes("only O is permitted"))return sendJson(res,422,{error:String(error.message)});
    console.error(error);sendJson(res,500,{error:"internal_error",message:String(error?.message??error)});
  }
});

const port=Number(process.env.PORT??4100);
server.listen(port,"127.0.0.1",()=>console.log(`MIQO integration harness listening on http://127.0.0.1:${port} using ${dbPath}`));

for(const signal of ["SIGTERM","SIGINT"] as const){process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));}
