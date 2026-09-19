import test from "node:test";
import assert from "node:assert/strict";
import {
  MARKET_ROUTE_CATALOGUE_VERSION,
  MARKET_ROUTE_ORCHESTRATION_VERSION,
  listSyntheticMarketRoutes,
  marketRouteFingerprint,
} from "../src/index.ts";

test("Sprint 4 MarketRoutes are deterministic synthetic provider/channel metadata",()=>{
  const routes=listSyntheticMarketRoutes();
  assert.equal(MARKET_ROUTE_CATALOGUE_VERSION,"sp4-market-routes-v1");
  assert.equal(MARKET_ROUTE_ORCHESTRATION_VERSION,"sp4-route-orchestrator-v1");
  assert.equal(routes.length,2);
  assert.equal(new Set(routes.map(route=>route.marketRouteId)).size,2);
  assert.equal(new Set(routes.map(route=>route.routeFingerprint)).size,2);
  assert.deepEqual(routes.map(route=>route.channelKey).sort(),["DIRECT_SYNTHETIC","PCW_SYNTHETIC"]);
  assert.ok(routes.every(route=>route.providerKey==="MOCK-PROVIDER-001"));
  assert.ok(routes.every(route=>route.synthetic===true));
  assert.ok(routes.every(route=>route.routeFingerprint===marketRouteFingerprint(route)));
});

test("MarketRoute dimensions remain orchestration metadata rather than ScenarioDelta controls",()=>{
  const routes=listSyntheticMarketRoutes();
  for(const route of routes){
    const serialized=JSON.stringify(route);
    assert.match(serialized,/providerKey/);
    assert.match(serialized,/channelKey/);
    assert.equal((route as any).controlClass,undefined);
    assert.equal((route as any).fieldId,undefined);
    assert.equal((route as any).remuneration,undefined);
    assert.equal((route as any).endpointUrl,undefined);
  }
});
