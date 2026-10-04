import { createHash, randomUUID } from "node:crypto";

const SEVERITIES=new Set(["info","success","warning","failure","action_required"]);

function stable(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}";
}

function hash(value){
  return createHash("sha256").update(stable(value)).digest("hex").slice(0,24);
}

function severityFor(status,conclusion){
  if(conclusion==="success")return "success";
  if(["failure","cancelled","timed_out","startup_failure","action_required"].includes(conclusion))return "failure";
  if(["queued","in_progress","pending","requested","waiting"].includes(status))return "info";
  return "warning";
}

export function normalizedEvent(input){
  const now=new Date().toISOString();
  const event={
    schemaVersion:1,
    eventId:input.eventId??randomUUID(),
    dedupeKey:input.dedupeKey??hash(input),
    occurredAt:input.occurredAt??now,
    observedAt:input.observedAt??now,
    source:input.source,
    category:input.category,
    eventType:input.eventType,
    severity:SEVERITIES.has(input.severity)?input.severity:"info",
    entity:input.entity,
    previousState:input.previousState??null,
    currentState:input.currentState??{},
    message:String(input.message??""),
    actionRequired:Boolean(input.actionRequired),
    metadata:input.metadata??{},
  };
  return event;
}

export function normalizeSnapshot(snapshot,previous){
  const events=[];
  const observedAt=snapshot?.observedAt??new Date().toISOString();
  const currentConnection=snapshot?.connection?.state??"UNKNOWN";
  const previousConnection=previous?.connection?.state??null;

  if(previousConnection!==currentConnection){
    events.push(normalizedEvent({
      dedupeKey:`github:connectivity:${currentConnection}`,
      occurredAt:observedAt,observedAt,
      source:{type:"github",component:"github-api"},
      category:"connectivity",
      eventType:"github.connectivity.changed",
      severity:currentConnection==="CONNECTED"?"success":currentConnection==="DISCONNECTED"?"warning":"info",
      entity:{type:"component",id:"github",name:"GitHub"},
      previousState:previousConnection?{state:previousConnection}:null,
      currentState:{state:currentConnection},
      message:`GitHub connectivity is ${currentConnection.toLowerCase()}.`,
      actionRequired:currentConnection==="DISCONNECTED",
    }));
  }

  const priorRuns=new Map((previous?.workflowRuns??[]).map(run=>[String(run.id),run]));
  for(const run of snapshot?.workflowRuns??[]){
    const prior=priorRuns.get(String(run.id));
    const changed=!prior||prior.status!==run.status||prior.conclusion!==run.conclusion;
    if(!changed)continue;
    const state={status:run.status??null,conclusion:run.conclusion??null,headSha:run.headSha??null};
    events.push(normalizedEvent({
      dedupeKey:`github:workflow:${run.id}:${run.status??"unknown"}:${run.conclusion??"none"}`,
      occurredAt:run.updatedAt??observedAt,observedAt,
      source:{type:"github",component:"actions"},
      category:"workflow",
      eventType:"github.workflow.changed",
      severity:severityFor(run.status,run.conclusion),
      entity:{type:"run",id:String(run.id),name:run.name??`Workflow ${run.id}`},
      previousState:prior?{status:prior.status??null,conclusion:prior.conclusion??null}:null,
      currentState:state,
      message:`${run.name??"Workflow"} is ${run.conclusion??run.status??"unknown"}.`,
      actionRequired:["failure","timed_out","startup_failure"].includes(run.conclusion),
      metadata:{runNumber:run.runNumber??null,url:run.url??null,branch:run.headBranch??null},
    }));
  }

  const priorJobs=previous?.jobs??{};
  for(const [runId,jobs] of Object.entries(snapshot?.jobs??{})){
    const old=new Map((priorJobs[runId]??[]).map(job=>[String(job.id),job]));
    for(const job of jobs){
      if(!job?.id)continue;
      const prior=old.get(String(job.id));
      if(prior&&prior.status===job.status&&prior.conclusion===job.conclusion)continue;
      events.push(normalizedEvent({
        dedupeKey:`github:check:${job.id}:${job.status??"unknown"}:${job.conclusion??"none"}`,
        occurredAt:job.completedAt??job.startedAt??observedAt,observedAt,
        source:{type:"github",component:"actions-jobs"},
        category:"check",
        eventType:"github.check.changed",
        severity:severityFor(job.status,job.conclusion),
        entity:{type:"check",id:String(job.id),name:job.name??`Check ${job.id}`},
        previousState:prior?{status:prior.status??null,conclusion:prior.conclusion??null}:null,
        currentState:{status:job.status??null,conclusion:job.conclusion??null},
        message:`${job.name??"Check"} is ${job.conclusion??job.status??"unknown"}.`,
        actionRequired:["failure","timed_out","startup_failure"].includes(job.conclusion),
        metadata:{runId,url:job.url??null},
      }));
    }
  }
  return events;
}

export function buildCanonicalState(snapshot,events,notifications,revision){
  const components={
    github:{
      status:snapshot?.connection?.state??"UNKNOWN",
      updatedAt:snapshot?.observedAt??new Date().toISOString(),
      source:"github",
      message:snapshot?.connection?.error??null,
    },
    broker:{
      status:"CONNECTED",
      updatedAt:new Date().toISOString(),
      source:"broker",
      message:"CC4 observation broker is running.",
    },
  };
  for(const run of snapshot?.workflowRuns??[]){
    components[`workflow:${run.id}`]={
      status:run.conclusion??run.status??"UNKNOWN",
      updatedAt:run.updatedAt??snapshot.observedAt,
      source:"github",
      message:run.name??null,
    };
  }
  return {
    revision,
    updatedAt:new Date().toISOString(),
    connectivity:{
      github:components.github,
      broker:components.broker,
      liveTransport:{status:"AVAILABLE",updatedAt:new Date().toISOString(),source:"broker",message:"SSE endpoint available."},
    },
    workflows:Object.fromEntries((snapshot?.workflowRuns??[]).map(run=>[String(run.id),run])),
    checks:Object.fromEntries(Object.entries(snapshot?.jobs??{}).flatMap(([runId,jobs])=>(jobs??[]).filter(j=>j?.id).map(j=>[String(j.id),{...j,runId}]))),
    components,
    notifications:{
      total:notifications.length,
      unread:notifications.filter(n=>!n.acknowledged).length,
      actionRequired:notifications.filter(n=>!n.acknowledged&&n.severity==="action_required").length,
    },
    lastEventId:events.at(-1)?.eventId??null,
  };
}
