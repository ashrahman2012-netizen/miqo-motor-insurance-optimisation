import { existsSync, readFileSync } from "node:fs";

const matrixPath = "control-centre/regression-matrix.v1.json";
const allowedAuthority = new Set(["AUTHORITATIVE", "INHERITED"]);
const allowedFailureClasses = new Set([
  "PRODUCT",
  "HARNESS",
  "HISTORICAL_ONLY",
  "SECURITY",
  "SUPPLY_CHAIN",
]);
const requiredGateIds = ["ci", "control-centre", "desktop-g1", "desktop-g2", "desktop-g3"];
const failures = [];

function fail(message) {
  failures.push(message);
}

let matrix;
try {
  matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
} catch (error) {
  console.error("EH-2 regression matrix verification FAILED");
  console.error(`- unable to parse ${matrixPath}: ${error.message}`);
  process.exit(1);
}

if (matrix.schemaVersion !== "1.0") fail("schemaVersion must be 1.0");
if (matrix.stage !== "EH-2") fail("stage must be EH-2");
if (matrix.boundary?.dataClassification !== "SYNTHETIC_ONLY") {
  fail("matrix boundary must be SYNTHETIC_ONLY");
}
if (matrix.boundary?.liveProvidersEnabled !== false) {
  fail("liveProvidersEnabled must be false");
}
if (!Array.isArray(matrix.gates) || matrix.gates.length < requiredGateIds.length) {
  fail("gates must contain the complete EH-2 gate set");
}

const ids = new Set();
for (const gate of matrix.gates ?? []) {
  const prefix = gate?.id ? `gate ${gate.id}` : "gate <missing-id>";

  if (!gate?.id || typeof gate.id !== "string") {
    fail("every gate requires a string id");
    continue;
  }
  if (ids.has(gate.id)) fail(`duplicate gate id: ${gate.id}`);
  ids.add(gate.id);

  if (!allowedAuthority.has(gate.authority)) {
    fail(`${prefix}: unsupported authority ${gate.authority}`);
  }
  if (!gate.workflow || typeof gate.workflow !== "string" || !existsSync(gate.workflow)) {
    fail(`${prefix}: referenced workflow does not exist: ${gate.workflow ?? "<missing>"}`);
  }
  if (!Array.isArray(gate.runner) || gate.runner.length === 0) {
    fail(`${prefix}: runner must be a non-empty array`);
  }
  if (!gate.runtimeResources?.contract || !gate.runtimeResources?.databaseBackend) {
    fail(`${prefix}: runtimeResources contract and databaseBackend are required`);
  }
  if (!Array.isArray(gate.allowedHostDependencies) || gate.allowedHostDependencies.length === 0) {
    fail(`${prefix}: allowedHostDependencies must be a non-empty array`);
  }
  if (!Array.isArray(gate.expectedEvidence) || gate.expectedEvidence.length === 0) {
    fail(`${prefix}: expectedEvidence must be a non-empty array`);
  }
  if (gate.boundary !== "SYNTHETIC_ONLY") {
    fail(`${prefix}: boundary must be SYNTHETIC_ONLY`);
  }
  if (!Array.isArray(gate.failureClassifications) || gate.failureClassifications.length === 0) {
    fail(`${prefix}: failureClassifications must be a non-empty array`);
  } else {
    for (const value of gate.failureClassifications) {
      if (!allowedFailureClasses.has(value)) {
        fail(`${prefix}: unsupported failure classification ${value}`);
      }
    }
  }
  if (!/^[0-9a-f]{40}$/i.test(gate.certification?.head ?? "")) {
    fail(`${prefix}: certification head must be a 40-character SHA`);
  }
  if (!Number.isInteger(gate.certification?.runId) || gate.certification.runId <= 0) {
    fail(`${prefix}: certification runId must be a positive integer`);
  }
  if (gate.certification?.conclusion !== "PASS") {
    fail(`${prefix}: current certification conclusion must be PASS`);
  }
}

for (const id of requiredGateIds) {
  if (!ids.has(id)) fail(`required gate missing: ${id}`);
}

const byId = new Map((matrix.gates ?? []).map((gate) => [gate.id, gate]));
for (const id of ["desktop-g1", "desktop-g2", "desktop-g3"]) {
  const gate = byId.get(id);
  if (gate && gate.runtimeResources?.databaseBackend !== "pglite-protected") {
    fail(`${id}: protected runtime contract requires databaseBackend=pglite-protected`);
  }
}

const g2 = byId.get("desktop-g2");
if (
  g2 &&
  !g2.allowedHostDependencies.some((value) =>
    String(value).toLowerCase().includes("windowspowershell")
  )
) {
  fail("desktop-g2: WindowsPowerShell dependency must remain explicitly allow-listed");
}

if (failures.length) {
  console.error("EH-2 regression matrix verification FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `EH-2 regression matrix verification PASS: ${matrix.gates.length} gates, boundary SYNTHETIC_ONLY`
);
