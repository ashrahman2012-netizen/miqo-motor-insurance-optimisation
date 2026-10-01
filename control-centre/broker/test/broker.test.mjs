import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBroker } from "../server.mjs";

const head="d0a61b3b464a9af9d1d3408e6a1818b8a1a4ae9b";
const repo="ashrahman2012-netizen/miqo-motor-insurance-optimisation";

function fakeReader(){
  return {
    async resolveTargetHead(){return {head,source:"test-live-github",live:true}},
    async snapshot(){
      return {
        connection:{state:"CONNECTED",authenticated:true,authSource:"test",mutationsEnabled:false},
        target:{branch:"miqo/desktop-uat-remediation",head,expectedHead:head,headMatchesRoadmap:true},
        local:{repositoryRoot:"/tmp/test",branch:"miqo/control-centre-cc3",head:"b".repeat(40),dirty:false},
        workflowRuns:[],jobs:{},issues:[],observedAt:new Date().toISOString(),
      };
    },
  };
}

function fakeWriter({configured=true,prHead="miqo/cc3/eh1-test",prBase="miqo/desktop-uat-remediation"}={}){
  const calls=[];
  return {
    calls,
    state(){return {
      state:configured?"CONFIGURED":"NOT_CONFIGURED",
      authSource:configured?"test-write":null,
      mutationsEnabled:configured,
    }},
    async createBranch(branch,sha){calls.push(["create_branch",branch,sha]);return {created:true,branch,sha}},
    async upsertFile(input){calls.push(["update_file",input]);return {path:input.path,commitSha:"c".repeat(40)}},
    async dispatchWorkflow(input){calls.push(["dispatch_workflow",input]);return {...input,dispatched:true}},
    async openPullRequest(input){calls.push(["open_validation_pr",input]);return {created:true,number:42,url:"https://example.invalid/pr/42",...input}},
    async commentIssue(input){calls.push(["comment_issue",input]);return {issueNumber:input.issueNumber,commentId:77}},
    async getPullRequest(number){calls.push(["get_pr",number]);return {number,head:{ref:prHead},base:{ref:prBase}}},
    async closePullRequest(number){calls.push(["close_validation_pr",number]);return {number,state:"closed"}},
  };
}

async function fixture({writesEnabled=false,writer=fakeWriter()}={}){
  const dir=await mkdtemp(join(tmpdir(),"miqos-cc3-"));
  const roadmapPath=join(dir,"roadmap.json");
  const allowlistPath=join(dir,"allowlist.json");
  const actionPolicyPath=join(dir,"policy.json");
  const actionStorePath=join(dir,"actions.json");

  await writeFile(roadmapPath,JSON.stringify({
    schemaVersion:"2.3",repository:repo,activeBranch:"miqo/desktop-uat-remediation",
    activeHead:head,boundary:"SYNTHETIC_ONLY",
    stages:[
      {id:"G3",title:"Baseline",status:"PASS"},
      {id:"EH1",title:"Harness harmonisation",status:"NEXT"},
    ],
  }));

  await writeFile(allowlistPath,JSON.stringify({
    schemaVersion:"2.0",mode:"CC3_GUARDED",
    readOnly:["VIEW_G3","MODEL_REVIEW"],
    mutatingAllowed:["EH1_AUTHORISE"],
    mutatingBlocked:["SC1_AUTHORISE"],
  }));

  await writeFile(actionPolicyPath,JSON.stringify({
    schemaVersion:"1.0",mode:"CC3_GUARDED",
    actions:{
      EH1_AUTHORISE:{
        enabled:true,
        branchPrefix:"miqo/cc3/eh1-",
        allowedOperations:[
          "create_branch","update_file","dispatch_workflow",
          "open_validation_pr","comment_issue","close_validation_pr"
        ],
        allowedPaths:[".github/workflows/desktop-g1.yml","scripts/desktop-g2-windows-proof.ps1"],
        allowedWorkflows:["desktop-g1.yml","desktop-g2.yml","desktop-g3.yml"],
        allowedIssueNumbers:[19],
        allowedPrBases:["miqo/desktop-uat-remediation"],
        maxFiles:4,maxFileBytes:8192,
      },
    },
  }));

  const broker=await createBroker({
    port:0,roadmapPath,allowlistPath,actionPolicyPath,actionStorePath,
    cc3WritesEnabled:writesEnabled,
    githubReader:fakeReader(),
    githubWriter:writer,
    openAiApiKey:"",
  });
  const address=await broker.start();
  return {broker,writer,base:"http://127.0.0.1:"+address.port,actionStorePath};
}

function basePacket(actionId="VIEW_G3"){
  return {
    packetVersion:"1.0",repository:repo,branch:"miqo/desktop-uat-remediation",
    expectedHead:head,boundary:"SYNTHETIC_ONLY",
    stageId:actionId==="EH1_AUTHORISE"?"EH1":"G3",actionId,
    verb:actionId==="EH1_AUTHORISE"?"AUTHORISE":"ACCEPT",
    approval:{required:true,status:"APPROVED",approvedAt:"2026-10-01T17:00:00.000Z"},
  };
}

function writePacket(){
  return {
    ...basePacket("EH1_AUTHORISE"),
    idempotencyKey:"EH1-TEST-0001",
    writePlan:{operations:[
      {type:"create_branch",branch:"miqo/cc3/eh1-test",baseSha:head},
      {type:"comment_issue",issueNumber:19,body:"EH-1 authorised for controlled execution."},
    ]},
  };
}

test("CC3 starts locked by default while preserving read-only broker operation",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());

  const status=await (await fetch(base+"/api/status")).json();
  assert.equal(status.health,"OK");
  assert.equal(status.mode,"CC3_LOCKED");
  assert.equal(status.mutationsEnabled,false);

  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(basePacket()),
  });
  assert.equal(response.status,200);
  assert.equal((await response.json()).action.status,"COMPLETED_READ_ONLY");
});

test("CC3 still requires explicit APPROVED human state",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());
  const body=basePacket();
  body.approval.status="PENDING_USER";
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(response.status,400);
  assert.ok((await response.json()).details.includes("HUMAN_APPROVAL_REQUIRED"));
});

test("CC3 rejects stale product HEAD before any mutation",async t=>{
  const {broker,base,writer}=await fixture({writesEnabled:true});
  t.after(()=>broker.close());
  const body=writePacket();
  body.expectedHead="a".repeat(40);
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,"STALE_HEAD_REJECTED");
  assert.equal(writer.calls.length,0);
});

test("CC3 records a blocked receipt while writes are disabled",async t=>{
  const {broker,base}=await fixture({writesEnabled:false});
  t.after(()=>broker.close());
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(writePacket()),
  });
  assert.equal(response.status,409);
  const action=(await response.json()).action;
  assert.equal(action.status,"BLOCKED_CC3_WRITES_DISABLED");
  assert.equal(action.result.code,"CC3_WRITES_DISABLED");
});

test("CC3 requires a dedicated write identity even when write mode is requested",async t=>{
  const writer=fakeWriter({configured:false});
  const {broker,base}=await fixture({writesEnabled:true,writer});
  t.after(()=>broker.close());
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(writePacket()),
  });
  assert.equal(response.status,503);
  assert.equal((await response.json()).action.status,"BLOCKED_CC3_WRITE_IDENTITY_REQUIRED");
  assert.equal(writer.calls.length,0);
});

test("CC3 requires a valid idempotency key for mutating actions",async t=>{
  const {broker,base,writer}=await fixture({writesEnabled:true});
  t.after(()=>broker.close());
  const body=writePacket();
  delete body.idempotencyKey;
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,"CC3_IDEMPOTENCY_KEY_REQUIRED");
  assert.equal(writer.calls.length,0);
});

test("CC3 rejects file mutation outside the EH1 path scope",async t=>{
  const {broker,base,writer}=await fixture({writesEnabled:true});
  t.after(()=>broker.close());
  const body=writePacket();
  body.writePlan.operations.push({
    type:"update_file",branch:"miqo/cc3/eh1-test",
    path:"apps/api/src/server.ts",content:"not authorised",
  });
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,"CC3_FILE_PATH_OUTSIDE_SCOPE");
  assert.equal(writer.calls.length,0);
});

test("CC3 rejects unsupported mutation types such as merge or delete",async t=>{
  const {broker,base,writer}=await fixture({writesEnabled:true});
  t.after(()=>broker.close());
  const body=writePacket();
  body.writePlan.operations=[{type:"merge_pr",prNumber:1}];
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,"CC3_OPERATION_NOT_ALLOWED");
  assert.equal(writer.calls.length,0);
});

test("CC3 executes an allow-listed write plan and persists an immutable receipt",async t=>{
  const {broker,base,writer,actionStorePath}=await fixture({writesEnabled:true});
  t.after(()=>broker.close());
  const body=writePacket();
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(response.status,200);
  const action=(await response.json()).action;
  assert.equal(action.status,"COMPLETED_CC3_WRITE");
  assert.equal(action.idempotencyKey,"EH1-TEST-0001");
  assert.equal(writer.calls.length,2);
  assert.deepEqual(writer.calls.map(call=>call[0]),["create_branch","comment_issue"]);

  const saved=JSON.parse(await readFile(actionStorePath,"utf8"));
  assert.equal(saved.items[0].status,"COMPLETED_CC3_WRITE");
  assert.equal(saved.items[0].result.operations.length,2);
});

test("CC3 replays an identical idempotent action without issuing a second mutation",async t=>{
  const {broker,base,writer}=await fixture({writesEnabled:true});
  t.after(()=>broker.close());
  const body=writePacket();
  const first=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(first.status,200);
  assert.equal(writer.calls.length,2);

  const second=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(second.status,200);
  const replay=(await second.json()).action;
  assert.equal(replay.replayed,true);
  assert.equal(writer.calls.length,2);
});

test("CC3 rejects reuse of an idempotency key with a different packet",async t=>{
  const {broker,base,writer}=await fixture({writesEnabled:true});
  t.after(()=>broker.close());
  const body=writePacket();
  assert.equal((await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  })).status,200);

  const changed=structuredClone(body);
  changed.writePlan.operations[1].body="different approved instruction";
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(changed),
  });
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,"CC3_IDEMPOTENCY_CONFLICT");
  assert.equal(writer.calls.length,2);
});

test("CC3 refuses to close a validation PR whose head is outside the controlled namespace",async t=>{
  const writer=fakeWriter({prHead:"untrusted/branch"});
  const {broker,base}=await fixture({writesEnabled:true,writer});
  t.after(()=>broker.close());
  const body=writePacket();
  body.idempotencyKey="EH1-TEST-CLOSE-1";
  body.writePlan.operations=[{type:"close_validation_pr",prNumber:42}];
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
  });
  assert.equal(response.status,400);
  const action=(await response.json()).action;
  assert.equal(action.status,"FAILED_CC3_WRITE");
  assert.equal(action.result.failure.code,"CC3_CLOSE_PR_HEAD_OUTSIDE_NAMESPACE");
});

test("CC3 keeps MODEL_REVIEW fail-closed when OpenAI is not configured",async t=>{
  const {broker,base}=await fixture();
  t.after(()=>broker.close());
  const response=await fetch(base+"/api/actions/execute",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(basePacket("MODEL_REVIEW")),
  });
  assert.equal(response.status,503);
  assert.equal((await response.json()).action.status,"FAILED_ANALYSIS_ONLY");
});
