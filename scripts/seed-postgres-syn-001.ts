import { createDatabase, createPool } from "../packages/db/src/client.ts";
import { canonicalFieldValue, customer, profile, riskProfileVersion } from "../packages/db/src/schema.ts";

const pool=createPool(); const db=createDatabase(pool);
try {
  await db.insert(customer).values({customerId:"CUS-SYN-001",synthetic:true}).onConflictDoNothing();
  await db.insert(profile).values({profileId:"PRO-SYN-001",customerId:"CUS-SYN-001"}).onConflictDoNothing();
  await db.insert(riskProfileVersion).values({riskProfileVersionId:"RPV-SYN-001-V1",profileId:"PRO-SYN-001",versionNo:1,status:"DRAFT"}).onConflictDoNothing();
  const values=[
    {canonicalFieldValueId:"CFV-SYN-001-MAIN",riskProfileVersionId:"RPV-SYN-001-V1",fieldId:"main_driver_id",controlClass:"F" as const,valueJson:"DRV-SYN-001",sourceType:"synthetic_fixture"},
    {canonicalFieldValueId:"CFV-SYN-001-MILEAGE",riskProfileVersionId:"RPV-SYN-001-V1",fieldId:"annual_mileage",controlClass:"F" as const,valueJson:8000,sourceType:"synthetic_fixture"},
    {canonicalFieldValueId:"CFV-SYN-001-LICENCE",riskProfileVersionId:"RPV-SYN-001-V1",fieldId:"licence_held_since",controlClass:"F" as const,valueJson:"2018-04-16",sourceType:"synthetic_fixture"},
  ];
  for(const value of values) await db.insert(canonicalFieldValue).values(value).onConflictDoNothing();
  console.log(JSON.stringify({fixture:"SYN-001",profileId:"PRO-SYN-001",versionId:"RPV-SYN-001-V1",deterministic:true}));
} finally { await pool.end(); }
