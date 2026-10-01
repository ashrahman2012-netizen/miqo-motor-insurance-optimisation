import { createHash, randomUUID } from "node:crypto";
import { modelReview } from "./model.mjs";

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

export function createActionExecutor({config,roadmap,allowlist,store,github}){
  return async function execute(packet){
    const errors=validatePacket(packet,roadmap);
    if(errors.length){
      const error=new Error("ACTION_PACKET_REJECTED");
      error.statusCode=400;
      error.details=errors;
      throw error;
    }

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
      schemaVersion:"1.0",
      stageId:packet.stageId,
      actionId:packet.actionId,
      verb:packet.verb,
      repository:packet.repository,
      branch:packet.branch,
      expectedHead:packet.expectedHead,
      packetHash:hash(JSON.stringify(packet)),
      approvedAt:packet.approval?.approvedAt??now(),
      createdAt:now(),
      updatedAt:now(),
      githubRunIds:[],
      evidence:[],
    };

    if(allowlist.mutatingBlocked.includes(packet.actionId)){
      const record=await store.put({
        ...base,
        status:"BLOCKED_CC2_MUTATIONS_DISABLED",
        result:{
          code:"CC2_READ_ONLY",
          message:"Action is valid and approved, but repository mutations are disabled until CC-3.",
        },
      });
      return {httpStatus:409,record};
    }

    if(!allowlist.readOnly.includes(packet.actionId)){
      const record=await store.put({
        ...base,
        status:"REJECTED_NOT_ALLOWLISTED",
        result:{code:"ACTION_NOT_ALLOWLISTED"},
      });
      return {httpStatus:403,record};
    }

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
  };
}
