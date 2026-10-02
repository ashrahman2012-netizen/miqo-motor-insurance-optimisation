import { createHash, randomUUID } from "node:crypto";
import { modelReview } from "./model.mjs";
import { validateWritePlan, validateClosePr } from "./mutation-policy.mjs";

const now=()=>new Date().toISOString();
const hash=value=>createHash("sha256").update(value).digest("hex");
const text=value=>typeof value==="string"?value.trim():"";

export function validatePacket(packet,roadmap){
  const errors=[];
  for(const key of ["repository","branch","expectedHead","boundary","stageId","actionId","verb","approval"]){
    if(packet?.[key]===undefined||packet?.[key]===null||packet?.[key]===""){
      errors.push("MISSING_"+key.toUpperCase());
    }
  }
  if(text(packet?.repository)!==roadmap.repository)errors.push("REPOSITORY_MISMATCH");
  if(text(packet?.branch)!==roadmap.activeBranch)errors.push("BRANCH_MISMATCH");
  if(text(packet?.boundary)!=="SYNTHETIC_ONLY")errors.push("BOUNDARY_MISMATCH");
  if(!/^[0-9a-f]{40}$/i.test(text(packet?.expectedHead)))errors.push("INVALID_EXPECTED_HEAD");
  if(packet?.approval?.status!=="APPROVED")errors.push("HUMAN_APPROVAL_REQUIRED");
  return errors;
}

async function executeWriteOperation(writer,packet,rule,op){
  if(op.type==="create_branch"){
    return writer.createBranch(op.branch,op.baseSha);
  }
  if(op.type==="update_file"){
    return writer.upsertFile({
      branch:op.branch,
      path:op.path,
      content:op.content,
      message:"[CC3:"+packet.actionId+"] "+(op.message||"controlled update"),
    });
  }
  if(op.type==="dispatch_workflow"){
    return writer.dispatchWorkflow({workflow:op.workflow,ref:op.ref,inputs:op.inputs??{}});
  }
  if(op.type==="open_validation_pr"){
    return writer.openPullRequest({
      head:op.head,base:op.base,title:op.title,
      body:op.body??"MIQOS CC-3 controlled validation PR.",
      draft:true,
    });
  }
  if(op.type==="comment_issue"){
    return writer.commentIssue({issueNumber:Number(op.issueNumber),body:op.body});
  }
  if(op.type==="close_validation_pr"){
    await validateClosePr(writer,op,rule);
    return writer.closePullRequest(Number(op.prNumber));
  }
  throw new Error("CC3_OPERATION_NOT_IMPLEMENTED");
}

export function createActionExecutor({
  config,roadmap,allowlist,actionPolicy,store,github,writer,
}){
  return async function execute(packet){
    const errors=validatePacket(packet,roadmap);
    if(errors.length){
      const error=new Error("ACTION_PACKET_REJECTED");
      error.statusCode=400;
      error.details=errors;
      throw error;
    }

    const packetHash=hash(JSON.stringify(packet));
    const current=await github.resolveTargetHead({requireLive:true});
    if(packet.expectedHead!==current.head){
      const error=new Error("STALE_HEAD_REJECTED");
      error.statusCode=409;
      error.details={
        expectedHead:packet.expectedHead,
        currentHead:current.head,
        currentHeadSource:current.source,
      };
      throw error;
    }

    const base={
      id:randomUUID(),
      schemaVersion:"1.1",
      stageId:packet.stageId,
      actionId:packet.actionId,
      verb:packet.verb,
      repository:packet.repository,
      branch:packet.branch,
      expectedHead:packet.expectedHead,
      packetHash,
      approvedAt:packet.approval?.approvedAt??now(),
      createdAt:now(),
      updatedAt:now(),
      githubRunIds:[],
      evidence:[],
    };

    if(allowlist.readOnly.includes(packet.actionId)){
      const snapshot=await github.snapshot({force:true});

      if(packet.actionId==="MODEL_REVIEW"){
        try{
          const review=await modelReview(config,packet,snapshot);
          const record=await store.put({
            ...base,
            status:"COMPLETED_READ_ONLY",
            completedAt:now(),
            updatedAt:now(),
            evidence:[{
              type:"github_snapshot",
              observedAt:snapshot.observedAt,
              targetHead:snapshot.target?.head??null,
            }],
            result:{
              review,
              githubSummary:{target:snapshot.target,connection:snapshot.connection},
            },
          });
          return {httpStatus:200,record};
        }catch(error){
          const record=await store.put({
            ...base,
            status:"FAILED_ANALYSIS_ONLY",
            completedAt:now(),
            updatedAt:now(),
            result:{code:error.message},
          });
          return {
            httpStatus:error.message==="OPENAI_NOT_CONFIGURED"?503:502,
            record,
          };
        }
      }

      const stage=roadmap.stages.find(item=>item.id===packet.stageId)??null;
      const record=await store.put({
        ...base,
        status:"COMPLETED_READ_ONLY",
        completedAt:now(),
        updatedAt:now(),
        evidence:[{
          type:"github_snapshot",
          observedAt:snapshot.observedAt,
          targetHead:snapshot.target?.head??null,
        }],
        result:{
          stage,
          githubSummary:{
            connection:snapshot.connection,
            target:snapshot.target,
            recentRuns:snapshot.workflowRuns.slice(0,5),
            issues:snapshot.issues,
          },
        },
      });
      return {httpStatus:200,record};
    }

    if(allowlist.mutatingBlocked.includes(packet.actionId)){
      const record=await store.put({
        ...base,
        status:"BLOCKED_CC3_ACTION_NOT_ENABLED",
        result:{
          code:"CC3_ACTION_NOT_ENABLED",
          message:"This mutating action is not enabled by the current CC-3 allowlist.",
        },
      });
      return {httpStatus:409,record};
    }

    if(!allowlist.mutatingAllowed.includes(packet.actionId)){
      const record=await store.put({
        ...base,
        status:"REJECTED_NOT_ALLOWLISTED",
        result:{code:"ACTION_NOT_ALLOWLISTED"},
      });
      return {httpStatus:403,record};
    }

    const existing=store.findByIdempotencyKey(packet.idempotencyKey);
    if(existing){
      if(existing.packetHash!==packetHash){
        const error=new Error("CC3_IDEMPOTENCY_CONFLICT");
        error.statusCode=409;
        error.details={idempotencyKey:packet.idempotencyKey,existingActionId:existing.id};
        throw error;
      }
      return {httpStatus:200,record:{...existing,replayed:true}};
    }

    if(!config.cc3WritesEnabled){
      const record=await store.put({
        ...base,
        idempotencyKey:packet.idempotencyKey??null,
        status:"BLOCKED_CC3_WRITES_DISABLED",
        result:{code:"CC3_WRITES_DISABLED"},
      });
      return {httpStatus:409,record};
    }

    const writerState=writer.state();
    if(writerState.state!=="CONFIGURED"||writerState.mutationsEnabled!==true){
      const record=await store.put({
        ...base,
        idempotencyKey:packet.idempotencyKey??null,
        status:"BLOCKED_CC3_WRITE_IDENTITY_REQUIRED",
        result:{code:"CC3_WRITE_IDENTITY_REQUIRED",writer:writerState},
      });
      return {httpStatus:503,record};
    }

    if(current.live!==true){
      const error=new Error("CC3_LIVE_HEAD_REQUIRED");
      error.statusCode=503;
      throw error;
    }

    const validated=validateWritePlan(packet,actionPolicy,config);
    let record=await store.put({
      ...base,
      idempotencyKey:packet.idempotencyKey,
      status:"EXECUTING_CC3_WRITE",
      result:{operations:[]},
    });

    const results=[];
    try{
      for(const [index,op] of validated.operations.entries()){
        const result=await executeWriteOperation(writer,packet,validated.rule,op);
        results.push({index,type:op.type,result,completedAt:now()});
        record=await store.put({
          ...record,
          updatedAt:now(),
          result:{operations:results},
        });
      }

      record=await store.put({
        ...record,
        status:"COMPLETED_CC3_WRITE",
        completedAt:now(),
        updatedAt:now(),
        evidence:[
          ...record.evidence,
          {type:"exact_head",source:current.source,head:current.head},
          {type:"write_plan",operationCount:validated.operations.length},
        ],
        result:{operations:results},
      });
      return {httpStatus:200,record};
    }catch(error){
      record=await store.put({
        ...record,
        status:"FAILED_CC3_WRITE",
        completedAt:now(),
        updatedAt:now(),
        result:{
          operations:results,
          failure:{code:error.message,details:error.details??null},
        },
      });
      return {httpStatus:Number(error.statusCode??502),record};
    }
  };
}
