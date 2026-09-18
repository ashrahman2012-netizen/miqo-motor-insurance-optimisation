import { resolve } from "node:path";
import { migrate, openDatabase, withTransaction } from "../apps/integration-harness/src/db.ts";

const dbPath = process.env.MIQO_HARNESS_DB ?? resolve(process.cwd(), "data/integration-harness.sqlite");
const db = openDatabase(dbPath);
migrate(db);

const existing = db.prepare("SELECT profile_id FROM profile WHERE profile_id='PRO-SYN-001'").get();
if (!existing) {
  withTransaction(db, () => {
    db.prepare("INSERT INTO customer (customer_id,synthetic) VALUES ('CUS-SYN-001',1)").run();
    db.prepare("INSERT INTO profile (profile_id,customer_id) VALUES ('PRO-SYN-001','CUS-SYN-001')").run();
    db.prepare(`INSERT INTO risk_profile_version
      (risk_profile_version_id,profile_id,version_no,status)
      VALUES ('RPV-SYN-001-V1','PRO-SYN-001',1,'DRAFT')`).run();
    const insert = db.prepare(`INSERT INTO canonical_field_value
      (canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type)
      VALUES (?,?,?,?,?,'fixture')`);
    insert.run('CFV-SYN-001-MAIN','RPV-SYN-001-V1','main_driver_id','F',JSON.stringify('DRV-SYN-001'));
    insert.run('CFV-SYN-001-MILE','RPV-SYN-001-V1','annual_mileage','F',JSON.stringify(8000));
    insert.run('CFV-SYN-001-LIC','RPV-SYN-001-V1','licence_held_since','F',JSON.stringify('2018-04-16'));
    db.prepare("UPDATE risk_profile_version SET status='LOCKED',locked_at=CURRENT_TIMESTAMP WHERE risk_profile_version_id='RPV-SYN-001-V1'").run();
    db.prepare(`INSERT INTO audit_event
      (audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json)
      VALUES ('AUD-SYN-001-LOCK','profile_locked','risk_profile_version','RPV-SYN-001-V1','PRO-SYN-001','{"fixture":"SYN-001"}')`).run();
  });
  console.log(`Seeded SYN-001 into ${dbPath}`);
} else {
  console.log(`SYN-001 already present in ${dbPath}`);
}

db.close();
