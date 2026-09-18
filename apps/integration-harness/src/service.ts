import { randomUUID } from "node:crypto";
import type { SqliteDb } from "./db.ts";
import { withTransaction } from "./db.ts";
import { createScenario, type ControlClass, type RiskProfileVersion } from "../../../packages/domain/src/model.ts";

const REQUIRED_FACTS = ["main_driver_id", "annual_mileage", "licence_held_since"] as const;

export class ConflictError extends Error {}
export class ValidationError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) { super(message); this.issues = issues; }
}

function id(prefix: string): string { return `${prefix}-${randomUUID()}`; }
function encode(value: unknown): string { return JSON.stringify(value); }
function decode(value: string): unknown { return JSON.parse(value); }

function audit(db: SqliteDb, args: {eventType: string; entityType: string; entityId: string; traceId?: string; metadata?: unknown}) {
  db.prepare(`INSERT INTO audit_event
    (audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json)
    VALUES (?,?,?,?,?,?)`)
    .run(id("AUD"), args.eventType, args.entityType, args.entityId, args.traceId ?? null, encode(args.metadata ?? {}));
}

export function createProfile(db: SqliteDb): {profileId: string; versionId: string} {
  return withTransaction(db, () => {
    const customerId = id("CUS-SYN");
    const profileId = id("PRO-SYN");
    const versionId = id("RPV-SYN");
    db.prepare("INSERT INTO customer (customer_id,synthetic) VALUES (?,1)").run(customerId);
    db.prepare("INSERT INTO profile (profile_id,customer_id) VALUES (?,?)").run(profileId, customerId);
    db.prepare(`INSERT INTO risk_profile_version
      (risk_profile_version_id,profile_id,version_no,status)
      VALUES (?,?,1,'DRAFT')`).run(versionId, profileId);
    audit(db, {eventType:"profile_created", entityType:"profile", entityId:profileId, traceId:profileId, metadata:{versionId}});
    return {profileId, versionId};
  });
}

export function currentVersion(db: SqliteDb, profileId: string) {
  return db.prepare(`SELECT * FROM risk_profile_version
    WHERE profile_id = ? ORDER BY version_no DESC LIMIT 1`).get(profileId) as Record<string, unknown> | undefined;
}

export function putFact(db: SqliteDb, args: {profileId: string; fieldId: string; value: unknown; controlClass?: ControlClass}) {
  const version = currentVersion(db, args.profileId);
  if (!version) throw new ValidationError("Profile not found");
  if (version.status !== "DRAFT") throw new ConflictError("LOCKED_PROFILE_IMMUTABLE");
  const controlClass = args.controlClass ?? "F";
  const versionId = String(version.risk_profile_version_id);
  withTransaction(db, () => {
    db.prepare(`INSERT INTO canonical_field_value
      (canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type)
      VALUES (?,?,?,?,?,'customer_declared')
      ON CONFLICT(risk_profile_version_id,field_id) DO UPDATE SET
        value_json=excluded.value_json,
        control_class=excluded.control_class,
        source_type=excluded.source_type`)
      .run(id("CFV"), versionId, args.fieldId, controlClass, encode(args.value));
    audit(db, {eventType:"fact_saved", entityType:"risk_profile_version", entityId:versionId, traceId:args.profileId, metadata:{fieldId:args.fieldId, controlClass}});
  });
  return {versionId};
}

export function listValues(db: SqliteDb, versionId: string) {
  return (db.prepare(`SELECT field_id,control_class,value_json,source_type
    FROM canonical_field_value WHERE risk_profile_version_id = ? ORDER BY field_id`).all(versionId) as Array<Record<string,string>>)
    .map(row => ({fieldId:row.field_id, controlClass:row.control_class, value:decode(row.value_json), sourceType:row.source_type}));
}

export function validateProfile(db: SqliteDb, profileId: string): {valid:boolean; issues:string[]; versionId:string} {
  const version = currentVersion(db, profileId);
  if (!version) throw new ValidationError("Profile not found");
  const values = listValues(db, String(version.risk_profile_version_id));
  const present = new Set(values.map(v => v.fieldId));
  const issues = REQUIRED_FACTS.filter(x => !present.has(x)).map(x => `Missing required field: ${x}`);
  audit(db, {eventType:"profile_validated", entityType:"risk_profile_version", entityId:String(version.risk_profile_version_id), traceId:profileId, metadata:{valid:issues.length===0,issues}});
  return {valid:issues.length === 0, issues, versionId:String(version.risk_profile_version_id)};
}

export function lockProfile(db: SqliteDb, profileId: string): {versionId:string; versionNo:number} {
  return withTransaction(db, () => {
    const version = currentVersion(db, profileId);
    if (!version) throw new ValidationError("Profile not found");
    if (version.status !== "DRAFT") throw new ConflictError("Only a DRAFT profile version can be locked");
    const versionId = String(version.risk_profile_version_id);
    const values = listValues(db, versionId);
    const present = new Set(values.map(v => v.fieldId));
    const issues = REQUIRED_FACTS.filter(x => !present.has(x)).map(x => `Missing required field: ${x}`);
    if (issues.length) throw new ValidationError("Profile cannot be locked", issues);

    db.prepare(`UPDATE risk_profile_version SET status='SUPERSEDED'
      WHERE profile_id=? AND status='LOCKED'`).run(profileId);
    db.prepare(`UPDATE risk_profile_version SET status='LOCKED',locked_at=CURRENT_TIMESTAMP
      WHERE risk_profile_version_id=? AND status='DRAFT'`).run(versionId);
    audit(db, {eventType:"profile_locked", entityType:"risk_profile_version", entityId:versionId, traceId:profileId, metadata:{versionNo:Number(version.version_no)}});
    return {versionId, versionNo:Number(version.version_no)};
  });
}

export function loadRiskProfileVersion(db: SqliteDb, versionId: string): RiskProfileVersion {
  const row = db.prepare("SELECT * FROM risk_profile_version WHERE risk_profile_version_id=?").get(versionId) as Record<string,unknown> | undefined;
  if (!row) throw new ValidationError("Profile version not found");
  return Object.freeze({
    id: versionId,
    version: Number(row.version_no),
    status: String(row.status) as RiskProfileVersion["status"],
    values: Object.freeze(listValues(db, versionId).map(v => Object.freeze({fieldId:v.fieldId, controlClass:v.controlClass as ControlClass, value:v.value})))
  });
}

export function createPersistedScenario(db: SqliteDb, args:{versionId:string; deltas:Array<{fieldId:string; controlClass:ControlClass; value:unknown}>}) {
  const profile = loadRiskProfileVersion(db, args.versionId);
  const domainScenario = createScenario({id:id("SCN"), profileVersion:profile, deltas:args.deltas});
  return withTransaction(db, () => {
    db.prepare("INSERT INTO scenario (scenario_id,risk_profile_version_id,status) VALUES (?,?,'READY')")
      .run(domainScenario.id, args.versionId);
    const insert = db.prepare(`INSERT INTO scenario_delta
      (scenario_delta_id,scenario_id,field_id,control_class,value_json) VALUES (?,?,?,?,?)`);
    for (const delta of domainScenario.deltas) insert.run(id("SCD"), domainScenario.id, delta.fieldId, delta.controlClass, encode(delta.value));
    audit(db, {eventType:"scenario_generated", entityType:"scenario", entityId:domainScenario.id, metadata:{versionId:args.versionId}});
    return domainScenario;
  });
}

export function createCorrectionDraft(db: SqliteDb, args:{profileId:string; fieldId:string; value:unknown}) {
  return withTransaction(db, () => {
    const current = currentVersion(db, args.profileId);
    if (!current) throw new ValidationError("Profile not found");
    if (!['LOCKED','SUPERSEDED'].includes(String(current.status))) throw new ConflictError("Correction flow starts from a locked version");

    // If current is SUPERSEDED, use latest locked/superseded as source; currentVersion is still the latest by version number.
    const sourceVersionId = String(current.risk_profile_version_id);
    const nextNo = Number(current.version_no) + 1;
    const nextId = id("RPV-SYN");
    db.prepare(`INSERT INTO risk_profile_version
      (risk_profile_version_id,profile_id,version_no,status) VALUES (?,?,?,'DRAFT')`)
      .run(nextId, args.profileId, nextNo);

    const sourceValues = listValues(db, sourceVersionId);
    const insert = db.prepare(`INSERT INTO canonical_field_value
      (canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type)
      VALUES (?,?,?,?,?,?)`);
    for (const value of sourceValues) {
      const nextValue = value.fieldId === args.fieldId ? args.value : value.value;
      insert.run(id("CFV"), nextId, value.fieldId, value.controlClass, encode(nextValue), value.fieldId === args.fieldId ? "customer_correction" : value.sourceType);
    }

    if (!sourceValues.some(v => v.fieldId === args.fieldId)) {
      insert.run(id("CFV"), nextId, args.fieldId, "F", encode(args.value), "customer_correction");
    }

    audit(db, {eventType:"profile_correction_started", entityType:"risk_profile_version", entityId:nextId, traceId:args.profileId, metadata:{sourceVersionId,fieldId:args.fieldId}});
    return {sourceVersionId, versionId:nextId, versionNo:nextNo};
  });
}


export function listDiscrepancies(db: SqliteDb, profileId: string) {
  const version = currentVersion(db, profileId);
  if (!version) throw new ValidationError("Profile not found");
  return db.prepare(`SELECT discrepancy_id,field_id,declared_value_json,verified_value_json,state,blocking,created_at
    FROM discrepancy WHERE risk_profile_version_id=? ORDER BY created_at, discrepancy_id`).all(String(version.risk_profile_version_id));
}

export function resolveDiscrepancy(db: SqliteDb, args:{profileId:string; discrepancyId:string; state:"EXPLAINED"|"CORRECTED"|"ACCEPTED"|"CLOSED"}) {
  const version = currentVersion(db, args.profileId);
  if (!version) throw new ValidationError("Profile not found");
  if (version.status !== "DRAFT") throw new ConflictError("Discrepancies on a locked profile require a new version");
  return withTransaction(db, () => {
    const result = db.prepare(`UPDATE discrepancy SET state=? WHERE discrepancy_id=? AND risk_profile_version_id=?`)
      .run(args.state, args.discrepancyId, String(version.risk_profile_version_id));
    if (!result.changes) throw new ValidationError("Discrepancy not found");
    audit(db,{eventType:"discrepancy_resolved",entityType:"discrepancy",entityId:args.discrepancyId,traceId:args.profileId,metadata:{state:args.state}});
    return {ok:true,state:args.state};
  });
}

export function profileSnapshot(db: SqliteDb, profileId: string) {
  const versions = db.prepare(`SELECT risk_profile_version_id,version_no,status,locked_at,created_at
    FROM risk_profile_version WHERE profile_id=? ORDER BY version_no`).all(profileId) as Array<Record<string,unknown>>;
  return versions.map(v => ({
    versionId:String(v.risk_profile_version_id), versionNo:Number(v.version_no), status:String(v.status), lockedAt:v.locked_at,
    values:listValues(db,String(v.risk_profile_version_id))
  }));
}

export function auditEvents(db: SqliteDb, profileId: string) {
  return db.prepare(`SELECT event_type,entity_type,entity_id,trace_id,metadata_json,occurred_at
    FROM audit_event WHERE trace_id=? OR entity_id=? ORDER BY rowid`).all(profileId, profileId) as Array<Record<string,unknown>>;
}
