import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBroker } from "../server.mjs";

const head="d0a61b3b464a9af9d1d3408e6a1818b8a1a4ae9b";

async function fixture(){
  const dir=await mkdtemp(join(tmpdir(),"miqos-cc2-"));
  const roadmapPath=join(dir,"roadmap.json");
  const allowlistPath=join(dir,"allowlist.json");
  const actionStorePath=join(dir,"actions.json");

  await writeFile(roadmapPath,JSON.stringify({
    schemaVersion:"2.0",
    repository:"ashrahman2012-netizen/miqo-motor-insurance-optimisation",
    activeBranch:"miqo/desktop-uat-remediation",
    activeHead:head,
    boundary:"SYNTHETIC_ONLY",
    stages:[{id:"G3",title:"Baseline",status:"PASS"}],
  }));

  await writeFile(allowlistPath,JSON.stringify({
    schemaVersion:"1.0",
    mode:"CC2_READ_ONLY",
    readOnly:["VIEW_G3","MODEL_REVIEW"],
    mutatingBlocked:["EH1_AUTHORISE"],
  }));

  const broker=await createBroker({
    port:0,
    roadmapPath,
    allowlistPath,
    actionStorePath,
    githubMode:"offline",
    allowSnapshotHead:true,
    openAiApiKey:"",
  });
  const address=await broker.start();
  return {broker,base:"http://127.0.0.1:"+address.port};
}

function packet(actionId="VIEW_G3"){
  return {
    packetVersion:"1.0",
    repository:"ashrahman2012-netizen/miqo-motor-insurance-optimisation",
    branch:"miqo/desktop-uat-remediation",
    expectedHead:head,
    boundary:"SYNTHETIC_ONLY",
    stageId:"G3",
    actionId,
    verb:actionId==="EH1_AUTHORISE"?"AUTHORISE":"ACCEPT",
    approval:{
      required:true,
      status:"APPROVED",
      approvedAt:new Date().toISOString(),
    },
  };
}

test("CC2 status and roadmap endpoints are loopback-ready",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());

  const response=await fetch(base+"/api/status");
  assert.equal(response.status,200);
  const status=await response.json();
  assert.equal(status.health,"OK");
  assert.equal(status.mode,"CC2_READ_ONLY");
  assert.equal(status.mutationsEnabled,false);
  assert.equal(status.head,head);

  const roadmap=await (await fetch(base+"/api/roadmap")).json();
  assert.equal(roadmap.activeHead,head);
});

test("CC2 requires explicit APPROVED human state",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());

  const body=packet();
  body.approval.status="PENDING_USER";
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(body),
  });
  assert.equal(response.status,400);
  const result=await response.json();
  assert.equal(result.error,"ACTION_PACKET_REJECTED");
  assert.ok(result.details.includes("HUMAN_APPROVAL_REQUIRED"));
});

test("CC2 rejects stale expected HEAD",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());

  const body=packet();
  body.expectedHead="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(body),
  });
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,"STALE_HEAD_REJECTED");
});

test("CC2 completes allow-listed read-only action and exposes receipt",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());

  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(packet()),
  });
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.action.status,"COMPLETED_READ_ONLY");
  assert.deepEqual(result.action.githubRunIds,[]);

  const receipt=await (await fetch(base+"/api/actions/"+result.action.id)).json();
  assert.equal(receipt.action.id,result.action.id);
  assert.equal(receipt.action.packetHash.length,64);
});

test("CC2 records but blocks mutating actions",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());

  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(packet("EH1_AUTHORISE")),
  });
  assert.equal(response.status,409);
  const result=await response.json();
  assert.equal(result.action.status,"BLOCKED_CC2_MUTATIONS_DISABLED");
  assert.equal(result.action.result.code,"CC2_READ_ONLY");
});

test("CC2 MODEL_REVIEW fails closed when OpenAI is not configured",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());

  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(packet("MODEL_REVIEW")),
  });
  assert.equal(response.status,503);
  const result=await response.json();
  assert.equal(result.action.status,"FAILED_ANALYSIS_ONLY");
  assert.equal(result.action.result.code,"OPENAI_NOT_CONFIGURED");
});
