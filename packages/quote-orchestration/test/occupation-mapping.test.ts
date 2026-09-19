import test from "node:test";
import assert from "node:assert/strict";
import {
  OCCUPATION_TAXONOMY_VERSION,
  listOccupationTaxonomyRules,
  listSyntheticMarketRoutes,
  mapCanonicalOccupation,
} from "../src/index.ts";

test("S4-G7 occupation taxonomy mapping is deterministic, versioned and route-specific",()=>{
  const routes=listSyntheticMarketRoutes();
  const direct=routes.find(route=>route.routeKey==="MOCK-001-DIRECT")!;
  const pcw=routes.find(route=>route.routeKey==="MOCK-001-PCW")!;
  const one=mapCanonicalOccupation({
    providerKey:direct.providerKey,
    mappingVersion:direct.mappingVersion,
    canonicalOccupation:"SOFTWARE_ENGINEER",
  });
  const replay=mapCanonicalOccupation({
    providerKey:direct.providerKey,
    mappingVersion:direct.mappingVersion,
    canonicalOccupation:"SOFTWARE_ENGINEER",
  });
  const other=mapCanonicalOccupation({
    providerKey:pcw.providerKey,
    mappingVersion:pcw.mappingVersion,
    canonicalOccupation:"SOFTWARE_ENGINEER",
  });

  assert.equal(OCCUPATION_TAXONOMY_VERSION,"sp4-occupation-taxonomy-v1");
  assert.deepEqual(replay,one);
  assert.equal(one.providerOccupationCode,"MOCK-OCC-SE-001");
  assert.equal(other.providerOccupationCode,"MOCK-PCW-OCC-SE-101");
  assert.notEqual(one.providerOccupationCode,other.providerOccupationCode);
  assert.match(one.ruleFingerprint,/^[0-9a-f]{64}$/);
  assert.ok(listOccupationTaxonomyRules().every(rule=>rule.providerKey==="MOCK-PROVIDER-001"));
});

test("S4-G7 unsupported canonical occupation is not silently reclassified",()=>{
  assert.throws(()=>mapCanonicalOccupation({
    providerKey:"MOCK-PROVIDER-001",
    mappingVersion:"mock-mapping-v1",
    canonicalOccupation:"INVENTED_OCCUPATION",
  }),/OCCUPATION_TAXONOMY_MAPPING_NOT_FOUND/);
});
