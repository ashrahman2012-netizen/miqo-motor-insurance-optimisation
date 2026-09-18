PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer (
  customer_id TEXT PRIMARY KEY,
  synthetic INTEGER NOT NULL DEFAULT 1 CHECK (synthetic = 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profile (
  profile_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customer(customer_id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_profile_version (
  risk_profile_version_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(profile_id),
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','LOCKED','SUPERSEDED')),
  locked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, version_no),
  CHECK ((status = 'LOCKED' AND locked_at IS NOT NULL) OR status <> 'LOCKED')
);

CREATE TABLE IF NOT EXISTS canonical_field_value (
  canonical_field_value_id TEXT PRIMARY KEY,
  risk_profile_version_id TEXT NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  field_id TEXT NOT NULL,
  control_class TEXT NOT NULL CHECK (control_class IN ('F','V','D','O','I')),
  value_json TEXT NOT NULL,
  source_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (risk_profile_version_id, field_id)
);

CREATE TABLE IF NOT EXISTS discrepancy (
  discrepancy_id TEXT PRIMARY KEY,
  risk_profile_version_id TEXT NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  field_id TEXT NOT NULL,
  declared_value_json TEXT,
  verified_value_json TEXT,
  state TEXT NOT NULL CHECK (state IN ('DETECTED','REVIEW_REQUIRED','EXPLAINED','CORRECTED','ACCEPTED','BLOCKING','CLOSED')),
  blocking INTEGER NOT NULL DEFAULT 0 CHECK (blocking IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenario (
  scenario_id TEXT PRIMARY KEY,
  risk_profile_version_id TEXT NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','VALIDATED','READY','SUBMITTED','COMPLETED','FAILED','EXPIRED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenario_delta (
  scenario_delta_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenario(scenario_id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  control_class TEXT NOT NULL CHECK (control_class = 'O'),
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_event (
  audit_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  trace_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Database invariant: once a factual version is LOCKED or SUPERSEDED, its values are immutable.
CREATE TRIGGER IF NOT EXISTS prevent_locked_field_insert
BEFORE INSERT ON canonical_field_value
WHEN EXISTS (
  SELECT 1 FROM risk_profile_version
  WHERE risk_profile_version_id = NEW.risk_profile_version_id
    AND status IN ('LOCKED','SUPERSEDED')
)
BEGIN
  SELECT RAISE(ABORT, 'LOCKED_PROFILE_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS prevent_locked_field_update
BEFORE UPDATE ON canonical_field_value
WHEN EXISTS (
  SELECT 1 FROM risk_profile_version
  WHERE risk_profile_version_id = OLD.risk_profile_version_id
    AND status IN ('LOCKED','SUPERSEDED')
)
BEGIN
  SELECT RAISE(ABORT, 'LOCKED_PROFILE_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS prevent_locked_field_delete
BEFORE DELETE ON canonical_field_value
WHEN EXISTS (
  SELECT 1 FROM risk_profile_version
  WHERE risk_profile_version_id = OLD.risk_profile_version_id
    AND status IN ('LOCKED','SUPERSEDED')
)
BEGIN
  SELECT RAISE(ABORT, 'LOCKED_PROFILE_IMMUTABLE');
END;

-- A locked version may only transition to SUPERSEDED; its identity/version/lock timestamp remain unchanged.
CREATE TRIGGER IF NOT EXISTS protect_locked_profile_version
BEFORE UPDATE ON risk_profile_version
WHEN OLD.status = 'LOCKED' AND NOT (
  NEW.status = 'SUPERSEDED'
  AND NEW.risk_profile_version_id = OLD.risk_profile_version_id
  AND NEW.profile_id = OLD.profile_id
  AND NEW.version_no = OLD.version_no
  AND NEW.locked_at = OLD.locked_at
  AND NEW.created_at = OLD.created_at
)
BEGIN
  SELECT RAISE(ABORT, 'LOCKED_PROFILE_VERSION_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS protect_superseded_profile_version
BEFORE UPDATE ON risk_profile_version
WHEN OLD.status = 'SUPERSEDED'
BEGIN
  SELECT RAISE(ABORT, 'SUPERSEDED_PROFILE_VERSION_IMMUTABLE');
END;
