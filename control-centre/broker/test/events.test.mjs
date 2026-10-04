import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventStore } from "../event-store.mjs";
import { EventHub } from "../events.mjs";
import { normalizedEvent } from "../event-normalizer.mjs";

function stream(){
  const published=[];
  return {published,publish(type,payload){published.push([type,payload])}};
}

function snapshot({connection="CONNECTED",status="queued",conclusion=null}={}){
  return {
    connection:{state:connection},
    workflowRuns:[{id:1,name:"desktop-g3",status,conclusion,headSha:"a".repeat(40),updatedAt:"2026-10-04T01:00:00.000Z"}],
    jobs:{"1":[{id:11,name:"security",status,conclusion,startedAt:"2026-10-04T01:00:00.000Z"}]},
    observedAt:"2026-10-04T01:00:01.000Z",
  };
}

test("CC4 deduplicates repeated observations and emits only genuine transitions",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"miqos-cc4-"));
  const store=new EventStore(join(dir,"events.json"));
  await store.load();
  const s=stream();
  const hub=new EventHub({store,stream:s});
  const first=await hub.ingestSnapshot(snapshot());
  assert.ok(first.accepted.length>=1);
  const count=store.listEvents().length;
  const second=await hub.ingestSnapshot(snapshot());
  assert.equal(second.accepted.length,0);
  assert.equal(store.listEvents().length,count);
  const third=await hub.ingestSnapshot(snapshot({status:"completed",conclusion:"success"}));
  assert.ok(third.accepted.some(event=>event.category==="workflow"&&event.severity==="success"));
});

test("CC4 notification acknowledgement changes local state only",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"miqos-cc4-"));
  const path=join(dir,"events.json");
  const store=new EventStore(path);
  await store.load();
  const event=normalizedEvent({
    dedupeKey:"test:failure",source:{type:"github",component:"actions"},category:"check",
    eventType:"github.check.changed",severity:"failure",entity:{type:"check",id:"1",name:"Check"},
    currentState:{conclusion:"failure"},message:"Check failed.",actionRequired:true,
  });
  const appended=await store.append(event);
  assert.equal(appended.notification.severity,"action_required");
  const ack=await store.acknowledge(event.eventId);
  assert.equal(ack.acknowledged,true);
  const saved=JSON.parse(await readFile(path,"utf8"));
  assert.equal(saved.notifications[0].acknowledged,true);
  assert.equal(saved.events[0].currentState.conclusion,"failure");
});

test("CC4 history is bounded and secrets are redacted",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"miqos-cc4-"));
  const path=join(dir,"events.json");
  const store=new EventStore(path,{maxEvents:3,maxNotifications:2});
  await store.load();
  for(let i=0;i<5;i++){
    await store.append(normalizedEvent({
      dedupeKey:"event:"+i,source:{type:"broker",component:"test"},category:"system",
      eventType:"test.event",severity:"info",entity:{type:"component",id:String(i),name:"test"},
      currentState:{i},message:"event "+i,metadata:{token:"must-not-persist",safe:"ok"},
    }));
  }
  assert.equal(store.listEvents().length,3);
  assert.equal(store.listNotifications().length,2);
  const saved=await readFile(path,"utf8");
  assert.equal(saved.includes("must-not-persist"),false);
  assert.equal(saved.includes('"safe": "ok"'),true);
});

test("CC4 canonical System Map state uses the same normalized revision",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"miqos-cc4-"));
  const store=new EventStore(join(dir,"events.json"));
  await store.load();
  const hub=new EventHub({store,stream:stream()});
  const result=await hub.ingestSnapshot(snapshot({status:"completed",conclusion:"failure"}));
  assert.equal(result.state.components["workflow:1"].status,"failure");
  assert.equal(result.state.workflows["1"].conclusion,"failure");
  assert.ok(result.state.revision>0);
});
