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


export const OCCUPATION_TAXONOMY_VERSION="sp4-occupation-taxonomy-v1";

export type OccupationTaxonomyRule=Readonly<{
  taxonomyVersion:typeof OCCUPATION_TAXONOMY_VERSION;
  providerKey:"MOCK-PROVIDER-001";
  mappingVersion:string;
  canonicalOccupation:"SOFTWARE_ENGINEER"|"TEACHER";
  providerOccupationCode:string;
}>;

const OCCUPATION_RULES:ReadonlyArray<OccupationTaxonomyRule>=Object.freeze([
  Object.freeze({taxonomyVersion:OCCUPATION_TAXONOMY_VERSION,providerKey:"MOCK-PROVIDER-001",mappingVersion:"mock-mapping-v1",canonicalOccupation:"SOFTWARE_ENGINEER",providerOccupationCode:"MOCK-OCC-SE-001"}),
  Object.freeze({taxonomyVersion:OCCUPATION_TAXONOMY_VERSION,providerKey:"MOCK-PROVIDER-001",mappingVersion:"mock-mapping-pcw-v1",canonicalOccupation:"SOFTWARE_ENGINEER",providerOccupationCode:"MOCK-PCW-OCC-SE-101"}),
  Object.freeze({taxonomyVersion:OCCUPATION_TAXONOMY_VERSION,providerKey:"MOCK-PROVIDER-001",mappingVersion:"mock-mapping-v1",canonicalOccupation:"TEACHER",providerOccupationCode:"MOCK-OCC-TE-002"}),
  Object.freeze({taxonomyVersion:OCCUPATION_TAXONOMY_VERSION,providerKey:"MOCK-PROVIDER-001",mappingVersion:"mock-mapping-pcw-v1",canonicalOccupation:"TEACHER",providerOccupationCode:"MOCK-PCW-OCC-TE-102"}),
]);

export function occupationTaxonomyRuleFingerprint(rule:OccupationTaxonomyRule){
  return createHash("sha256").update([
    rule.taxonomyVersion,
    rule.providerKey,
    rule.mappingVersion,
    rule.canonicalOccupation,
    rule.providerOccupationCode,
  ].join("|")).digest("hex");
}

export function listOccupationTaxonomyRules(){
  return OCCUPATION_RULES.map(rule=>Object.freeze({...rule,ruleFingerprint:occupationTaxonomyRuleFingerprint(rule)}));
}

export function mapCanonicalOccupation(args:{
  providerKey:string;
  mappingVersion:string;
  canonicalOccupation:string;
}){
  const rule=OCCUPATION_RULES.find(item=>
    item.providerKey===args.providerKey
    && item.mappingVersion===args.mappingVersion
    && item.canonicalOccupation===args.canonicalOccupation
  );
  if(!rule)throw new Error("OCCUPATION_TAXONOMY_MAPPING_NOT_FOUND");
  return Object.freeze({...rule,ruleFingerprint:occupationTaxonomyRuleFingerprint(rule)});
}
