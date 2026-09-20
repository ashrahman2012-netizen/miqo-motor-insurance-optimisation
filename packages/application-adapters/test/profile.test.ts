import {describe,expect,it} from "vitest";
import {composeProfileLifecycleVM} from "../src/profile";

const baseSnapshot={
  versions:[{
    versionId:"RPV-1",versionNo:1,status:"DRAFT" as const,lockedAt:null,
    values:[
      {fieldId:"main_driver_id",controlClass:"F" as const,value:"DRV-1",sourceType:"customer_declared",createdAt:"2026-09-20T10:00:00Z"},
      {fieldId:"annual_mileage",controlClass:"F" as const,value:8000,sourceType:"customer_declared",createdAt:"2026-09-20T10:00:00Z"},
      {fieldId:"licence_held_since",controlClass:"F" as const,value:"2018-04-16",sourceType:"customer_declared",createdAt:"2026-09-20T10:00:00Z"},
    ],
  }],
  audit:[
    {auditEventId:"AUD-1",eventType:"profile_validated",entityType:"risk_profile_version",entityId:"RPV-1",traceId:"PRO-1",occurredAt:"2026-09-20T10:05:00Z",metadataJson:{valid:true,issues:[]}},
  ],
};

describe("BUILD-001C profile lifecycle adapter",()=>{
  it("maps persisted factual fields and passed validation into an available lock action",()=>{
    const vm=composeProfileLifecycleVM({profileId:"PRO-1",snapshot:baseSnapshot,discrepancies:[]});
    expect(vm.review.fields.find(item=>item.fieldId==="annual_mileage")?.displayValue).toBe("8,000 miles");
    expect(vm.review.lockAction.state).toBe("AVAILABLE");
    expect(vm.journey.find(item=>item.id==="VALIDATION")?.state).toBe("COMPLETE");
  });

  it("blocks UI lock when persisted discrepancy evidence is explicitly blocking",()=>{
    const vm=composeProfileLifecycleVM({profileId:"PRO-1",snapshot:baseSnapshot,discrepancies:[{
      discrepancyId:"DIS-1",riskProfileVersionId:"RPV-1",fieldId:"annual_mileage",
      declaredValueJson:8000,verifiedValueJson:9000,state:"OPEN",blocking:true,createdAt:"2026-09-20T10:06:00Z",
    }]});
    expect(vm.review.lockAction.state).toBe("BLOCKED");
    expect(vm.blockingDiscrepancyCount).toBe(1);
    expect(vm.journey.find(item=>item.id==="DISCREPANCIES")?.state).toBe("CURRENT");
  });

  it("keeps locked factual fields read-only and hides the lock action",()=>{
    const snapshot={...baseSnapshot,versions:[{...baseSnapshot.versions[0],status:"LOCKED" as const,lockedAt:"2026-09-20T10:10:00Z"}]};
    const vm=composeProfileLifecycleVM({profileId:"PRO-1",snapshot,discrepancies:[]});
    expect(vm.review.fields.every(item=>item.editable===false)).toBe(true);
    expect(vm.review.lockAction.state).toBe("HIDDEN");
    expect(vm.journey.find(item=>item.id==="LOCK")?.state).toBe("COMPLETE");
  });

  it("requires explicit validation evidence before exposing lock",()=>{
    const vm=composeProfileLifecycleVM({profileId:"PRO-1",snapshot:{...baseSnapshot,audit:[]},discrepancies:[]});
    expect(vm.review.validation.valid).toBe(false);
    expect(vm.review.validation.issues).toEqual([]);
    expect(vm.review.lockAction.state).toBe("BLOCKED");
  });

  it("selects the newest version and preserves old versions for lineage",()=>{
    const snapshot={...baseSnapshot,versions:[
      {...baseSnapshot.versions[0],status:"SUPERSEDED" as const},
      {...baseSnapshot.versions[0],versionId:"RPV-2",versionNo:2,status:"DRAFT" as const},
    ],audit:[]};
    const vm=composeProfileLifecycleVM({profileId:"PRO-1",snapshot,discrepancies:[]});
    expect(vm.review.version.versionId).toBe("RPV-2");
    expect(vm.history.map(item=>[item.versionNo,item.status])).toEqual([[2,"DRAFT"],[1,"SUPERSEDED"]]);
  });
});
