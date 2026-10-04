import {randomBytes, randomUUID} from "node:crypto";
import {and, desc, eq} from "drizzle-orm";
import {leadCampaign, leadEvent, leadRecord} from "../../../packages/db/src/schema.ts";

const makeToken = () => randomBytes(24).toString("base64url");

export async function createSyntheticLeadCampaign(db:any,input:{campaignName:string;templateVersion?:string;senderDomain?:string}) {
  const row={
    campaignId:"campaign-"+randomUUID(),
    campaignName:input.campaignName,
    templateVersion:input.templateVersion??"miqos-lg-email-v1",
    senderDomain:input.senderDomain??"example.invalid",
    status:"DRAFT",
    synthetic:true
  };
  await db.insert(leadCampaign).values(row);
  return row;
}

export async function createSyntheticLead(db:any,input:{campaignId:string;permissionBasis?:string}) {
  const campaign=(await db.select().from(leadCampaign).where(and(eq(leadCampaign.campaignId,input.campaignId),eq(leadCampaign.synthetic,true))).limit(1))[0];
  if(!campaign) throw new Error("LEAD_CAMPAIGN_NOT_FOUND");
  const row={
    leadId:"lead-"+randomUUID(),
    campaignId:input.campaignId,
    journeyToken:makeToken(),
    permissionBasis:input.permissionBasis??"TEST_SYNTHETIC",
    state:"CREATED",
    synthetic:true
  };
  await db.transaction(async(tx:any)=>{
    await tx.insert(leadRecord).values(row);
    await tx.insert(leadEvent).values({leadEventId:"event-"+randomUUID(),leadId:row.leadId,eventType:"LEAD_CREATED",metadataJson:{synthetic:true}});
  });
  return row;
}

export async function getLeadJourney(db:any,journeyToken:string) {
  const row=(await db.select().from(leadRecord).where(and(eq(leadRecord.journeyToken,journeyToken),eq(leadRecord.synthetic,true))).limit(1))[0];
  if(!row) throw new Error("LEAD_NOT_FOUND");
  return {leadId:row.leadId,state:row.state,renewalWindow:row.renewalWindow,contactPreference:row.contactPreference,synthetic:true};
}

export async function recordInterestResponse(db:any,journeyToken:string,answer:"YES"|"NO") {
  const row=(await db.select().from(leadRecord).where(and(eq(leadRecord.journeyToken,journeyToken),eq(leadRecord.synthetic,true))).limit(1))[0];
  if(!row) throw new Error("LEAD_NOT_FOUND");
  if(answer==="NO") {
    await db.transaction(async(tx:any)=>{
      await tx.update(leadRecord).set({state:"SUPPRESSED",contactPreference:"NONE",updatedAt:new Date()}).where(eq(leadRecord.leadId,row.leadId));
      await tx.insert(leadEvent).values({leadEventId:"event-"+randomUUID(),leadId:row.leadId,eventType:"NO_SELECTED",metadataJson:{}});
      await tx.insert(leadEvent).values({leadEventId:"event-"+randomUUID(),leadId:row.leadId,eventType:"SUPPRESSED",metadataJson:{reason:"NO_SELECTED"}});
    });
    return {leadId:row.leadId,state:"SUPPRESSED"};
  }
  await db.transaction(async(tx:any)=>{
    await tx.update(leadRecord).set({state:"YES",updatedAt:new Date()}).where(eq(leadRecord.leadId,row.leadId));
    await tx.insert(leadEvent).values({leadEventId:"event-"+randomUUID(),leadId:row.leadId,eventType:"YES_SELECTED",metadataJson:{}});
  });
  return {leadId:row.leadId,state:"YES"};
}

export async function submitQualification(db:any,journeyToken:string,input:{renewalWindow:string;contactPreference:"EMAIL"|"PHONE"}) {
  const row=(await db.select().from(leadRecord).where(and(eq(leadRecord.journeyToken,journeyToken),eq(leadRecord.synthetic,true))).limit(1))[0];
  if(!row) throw new Error("LEAD_NOT_FOUND");
  if(row.state!=="YES"&&row.state!=="QUALIFIED") throw new Error("LEAD_NOT_ELIGIBLE_FOR_QUALIFICATION");
  await db.transaction(async(tx:any)=>{
    await tx.update(leadRecord).set({state:"QUALIFIED",renewalWindow:input.renewalWindow,contactPreference:input.contactPreference,updatedAt:new Date()}).where(eq(leadRecord.leadId,row.leadId));
    await tx.insert(leadEvent).values({leadEventId:"event-"+randomUUID(),leadId:row.leadId,eventType:"QUALIFICATION_SUBMITTED",metadataJson:input});
  });
  return {leadId:row.leadId,state:"QUALIFIED",...input};
}

export async function listLeadEvents(db:any,leadId:string) {
  return db.select().from(leadEvent).where(eq(leadEvent.leadId,leadId)).orderBy(desc(leadEvent.occurredAt));
}
