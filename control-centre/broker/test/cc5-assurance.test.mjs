import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

async function json(path){return JSON.parse(await readFile(path,"utf8"))}

test("CC5 runtime policy does not self-authorise closure mutation",async()=>{
  const allowlist=await json("control-centre/broker/actions.allowlist.v2.json");
  assert.equal(allowlist.mutatingAllowed.includes("CC5_AUTHORISE"),false);
  assert.equal(allowlist.mutatingBlocked.includes("CC5_AUTHORISE"),true);
});

test("CC5 preserves CC4 observational separation from write modules",async()=>{
  const files=[
    "control-centre/broker/events.mjs",
    "control-centre/broker/event-normalizer.mjs",
    "control-centre/broker/event-store.mjs",
    "control-centre/broker/event-stream.mjs",
  ];
  for(const file of files){
    const source=await readFile(file,"utf8");
    assert.equal(source.includes("github-write.mjs"),false,`${file} must not import github-write`);
    assert.equal(source.includes("mutation-policy.mjs"),false,`${file} must not import mutation-policy`);
    assert.equal(source.includes("actions.mjs"),false,`${file} must not import actions executor`);
  }
});

test("CC5 closure evidence keeps INT1 unresolved and programme below 100",async()=>{
  const roadmap=await json("control-centre/roadmap.v2.json");
  const int1=roadmap.stages.find(stage=>stage.id==="INT1");
  const cc5=roadmap.stages.find(stage=>stage.id==="CC5");
  assert.equal(roadmap.progress.currentPercent,98);
  assert.equal(int1.status,"WAITING_EXTERNAL");
  assert.equal(int1.progress,0);
  assert.equal(cc5.status,"PASS");
  assert.equal(cc5.progress,100);
  assert.notEqual(roadmap.progress.currentPercent,100);
});

test("CC5 evidence ledger records CC5 as certified and no longer pending",async()=>{
  const ledger=await json("control-centre/certification-ledger.v1.json");
  assert.deepEqual(ledger.stages.map(item=>item.stageId),["CC4","EH3","CC5"]);
  assert.ok(ledger.stages.every(item=>item.status==="CLOSED"));
  const cc5=ledger.stages.find(item=>item.stageId==="CC5");
  assert.equal(cc5.certifiedHead,"d01536e76d3ec891be6078ef07955cd2ab8a219f");
  assert.equal("pendingStage" in ledger,false);
});

test("CC5 residual-risk and external-dependency registers agree on INT1",async()=>{
  const risks=await json("control-centre/residual-risks.v1.json");
  const deps=await json("control-centre/external-dependencies.v1.json");
  const rr=risks.items.find(item=>item.id==="RR-01");
  const dep=deps.dependencies.find(item=>item.dependencyId==="INT1");
  assert.equal(rr.relatedStage,"INT1");
  assert.equal(rr.status,"OPEN");
  assert.equal(dep.status,"WAITING_EXTERNAL");
  assert.equal(dep.programmeWeight,2);
});
