import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { receiveSyntheticAcquisitionHandoff } from "./acquisition-handoff-receiver-service.ts";

const allowedRequestKeys=new Set([
  "contractVersion",
  "handoffId",
  "acceptedClientId",
  "acceptanceEventId",
  "acceptedAt",
  "acquisitionLeadId",
  "campaignId",
  "source",
  "permissionBasis",
  "lifecycleState",
  "contactPreference",
]);

const requestSchema={
  type:"object",
  additionalProperties:false,
  required:[
    "contractVersion",
    "handoffId",
    "acceptedClientId",
    "acceptanceEventId",
    "acceptedAt",
    "acquisitionLeadId",
    "campaignId",
    "source",
    "permissionBasis",
    "lifecycleState",
  ],
  properties:{
    contractVersion:{type:"string",const:"lg-g7-handoff.v1"},
    handoffId:{type:"string",minLength:1},
    acceptedClientId:{type:"string",minLength:1},
    acceptanceEventId:{type:"string",minLength:1},
    acceptedAt:{type:"string",format:"date-time"},
    acquisitionLeadId:{type:"string",minLength:1},
    campaignId:{type:"string",minLength:1},
    source:{type:"string",minLength:1},
    permissionBasis:{
      type:"string",
      enum:["CONSENT","SOFT_OPT_IN","CORPORATE_B2B","TEST_SYNTHETIC","UNVERIFIED_DO_NOT_SEND"],
    },
    lifecycleState:{type:"string",const:"ACCEPTED_CLIENT"},
    contactPreference:{type:"string",minLength:1},
  },
} as const;

export function registerAcquisitionHandoffReceiverRoute(app:FastifyInstance,pool:Pool){
  app.post("/acquisition/handoffs",{
    schema:{body:requestSchema},
    preValidation:async(req:any,reply)=>{
      const body=req.body;
      if(!body || typeof body!=="object" || Array.isArray(body))return;
      const undeclared=Object.keys(body).filter((key)=>!allowedRequestKeys.has(key));
      if(undeclared.length){
        return reply.code(422).send({
          error:"INVALID_LG_G7_HANDOFF",
          issues:undeclared.map((key)=>`Undeclared field: ${key}`),
        });
      }
    },
  },async(req:any,reply)=>{
    const configuredKey=process.env.MIQO_SYNTHETIC_HANDOFF_KEY??"";
    if(!configuredKey)
      return reply.code(503).send({error:"synthetic_handoff_gate_unconfigured",requestId:req.id});
    if(req.headers["x-miqo-synthetic-handoff"]!==configuredKey)
      return reply.code(401).send({error:"synthetic_handoff_access_required",requestId:req.id});

    const idempotencyKey=req.headers["idempotency-key"];
    if(typeof idempotencyKey!=="string" || !idempotencyKey.trim())
      return reply.code(400).send({error:"handoff_idempotency_key_required",requestId:req.id});
    if(idempotencyKey!==req.body.handoffId)
      return reply.code(409).send({error:"HANDOFF_IDEMPOTENCY_KEY_MISMATCH",requestId:req.id});

    const result=await receiveSyntheticAcquisitionHandoff(pool,req.body);
    return reply.code(result.idempotentReplay?200:201).send(result.response);
  });
}
