import {createHash} from "node:crypto";

export const MARKET_ROUTE_CATALOGUE_VERSION="sp4-market-routes-v1";
export const MARKET_ROUTE_ORCHESTRATION_VERSION="sp4-route-orchestrator-v1";

export type SyntheticMarketRoute=Readonly<{
  routeKey:string;
  catalogueVersion:typeof MARKET_ROUTE_CATALOGUE_VERSION;
  providerKey:"MOCK-PROVIDER-001";
  channelKey:"DIRECT_SYNTHETIC"|"PCW_SYNTHETIC";
  adapterVersion:string;
  mappingVersion:string;
  synthetic:true;
}>;

const ROUTES:ReadonlyArray<SyntheticMarketRoute>=Object.freeze([
  Object.freeze({
    routeKey:"MOCK-001-DIRECT",
    catalogueVersion:MARKET_ROUTE_CATALOGUE_VERSION,
    providerKey:"MOCK-PROVIDER-001",
    channelKey:"DIRECT_SYNTHETIC",
    adapterVersion:"mock-adapter-v1",
    mappingVersion:"mock-mapping-v1",
    synthetic:true as const,
  }),
  Object.freeze({
    routeKey:"MOCK-001-PCW",
    catalogueVersion:MARKET_ROUTE_CATALOGUE_VERSION,
    providerKey:"MOCK-PROVIDER-001",
    channelKey:"PCW_SYNTHETIC",
    adapterVersion:"mock-adapter-v1",
    mappingVersion:"mock-mapping-pcw-v1",
    synthetic:true as const,
  }),
]);

function canonical(route:SyntheticMarketRoute){
  return {
    routeKey:route.routeKey,
    catalogueVersion:route.catalogueVersion,
    providerKey:route.providerKey,
    channelKey:route.channelKey,
    adapterVersion:route.adapterVersion,
    mappingVersion:route.mappingVersion,
    synthetic:route.synthetic,
  };
}

export function marketRouteFingerprint(route:SyntheticMarketRoute){
  return createHash("sha256").update(JSON.stringify(canonical(route))).digest("hex");
}

export function deterministicMarketRouteId(route:SyntheticMarketRoute){
  return "MR-SP4-"+marketRouteFingerprint(route).slice(0,24).toUpperCase();
}

export function listSyntheticMarketRoutes(){
  return ROUTES.map(route=>Object.freeze({
    ...route,
    marketRouteId:deterministicMarketRouteId(route),
    routeFingerprint:marketRouteFingerprint(route),
  }));
}

export function getSyntheticMarketRoute(routeKey:string){
  const route=ROUTES.find(item=>item.routeKey===routeKey);
  if(!route)throw new Error("MARKET_ROUTE_NOT_FOUND:"+routeKey);
  return Object.freeze({
    ...route,
    marketRouteId:deterministicMarketRouteId(route),
    routeFingerprint:marketRouteFingerprint(route),
  });
}
