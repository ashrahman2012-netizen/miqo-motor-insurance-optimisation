import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { ConflictError, ValidationError } from "./errors.ts";
import { parseMultipartForm, requiredMultipartPart } from "./multipart-form-parser.ts";
import { DIRECT_FORM_VERSION, FormDeliveryError, processDirectCustomerFormSubmission, type FormSubmissionDependencies } from "./customer-form-submission-service.ts";

const MAX_MULTIPART_BYTES=6_500_000;

function partText(parts:ReadonlyMap<string,any>,name:string,max:number){
  return requiredMultipartPart(parts,name,max).data.toString("utf8").trim();
}

export function registerCustomerFormSubmissionRoute(app:FastifyInstance,pool:Pool,deps:FormSubmissionDependencies={}){
  app.addContentTypeParser(/^multipart\/form-data/i,{parseAs:"buffer"},(_req,body,done)=>done(null,body));

  app.post("/api/v1/customer-information-requests/submit",{bodyLimit:MAX_MULTIPART_BYTES},async(req:any,reply)=>{
    const contentType=String(req.headers["content-type"]??"");
    const parts=parseMultipartForm(req.body,contentType);
    const allowed=new Set(["payload","html","excel","subject","formVersion","renderPdf"]);
    for(const key of parts.keys())if(!allowed.has(key))throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`Unexpected multipart part: ${key}`]);

    const payloadPart=requiredMultipartPart(parts,"payload",128_000);
    let payload:unknown;
    try{payload=JSON.parse(payloadPart.data.toString("utf8"));}
    catch{throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["payload must contain valid JSON"]);}
    const html=requiredMultipartPart(parts,"html",4_500_000).data;
    const excel=requiredMultipartPart(parts,"excel",1_500_000).data;
    const subject=partText(parts,"subject",2_000);
    const formVersion=partText(parts,"formVersion",100);
    const renderPdf=partText(parts,"renderPdf",10)==="true";
    const idempotencyKey=String(req.headers["idempotency-key"]??"").trim();
    const headerVersion=String(req.headers["x-miqos-form-version"]??"").trim();
    if(!idempotencyKey)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["Idempotency-Key header is required"]);
    if(headerVersion!==DIRECT_FORM_VERSION||formVersion!==DIRECT_FORM_VERSION)
      throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`X-MIQOS-Form-Version and formVersion must both be ${DIRECT_FORM_VERSION}`]);

    try{
      const result=await processDirectCustomerFormSubmission(pool,{idempotencyKey,payload,html,excel,subject,formVersion,renderPdf},deps);
      return reply.code(result.idempotentReplay?200:201).send(result);
    }catch(error){
      if(error instanceof FormDeliveryError){
        const message=error.phase==="PDF_RENDER"
          ? "MIQOS saved the submission but could not generate the PDF attachment. Retry the same submission after the PDF renderer is available."
          : "MIQOS saved the submission and generated the PDF, but Gmail delivery was not accepted. Retry the same submission after mail delivery is configured.";
        return reply.code(502).send({error:error.message,message,emailAccepted:false,pdfGenerated:error.phase==="EMAIL_DELIVERY"});
      }
      if(error instanceof ValidationError||error instanceof ConflictError)throw error;
      throw error;
    }
  });
}
