import {randomUUID} from "node:crypto";
import {and,asc,eq,sql} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  customerObjective,
  normalisedQuote,
  quoteRequest,
  quoteRun,
  rawProviderResponse,
  riskProfileVersion,
} from "../../../packages/db/src/schema.ts";
import {
  marketRoute,
  sp4QuoteRequestLineage,
  sp4ScenarioLineage,
} from "../../../packages/db/src/sp4-schema.ts";
import {
  MARKET_ROUTE_ORCHESTRATION_VERSION,
  listSyntheticMarketRoutes,
} from "../../../packages/quote-orchestration/src/index.ts";
import {prepareQuoteRequest} from "./quote-service.ts";
import {executePreparedQuoteRequest} from "./provider-service.ts";
import {normaliseRawProviderResponse} from "./normalisation-service.ts";
import {ConflictError,ValidationError} from "./errors.ts";

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

function routeShape(row:any){
  return {
    marketRouteId:row.marketRouteId,
    routeKey:row.routeKey,
    routeCatalogueVersion:row.routeCatalogueVersion,
    providerKey:row.providerKey,
    channelKey:row.channelKey,
    adapterVersion:row.adapterVersion,
    mappingVersion:row.mappingVersion,
    routeFingerprint:row.routeFingerprint,
    synthetic:row.synthetic,
  };
}

export async function ensureSyntheticMarketRoutes(db:MiqoDatabase){
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('sp4-market-routes-v1'))`);
    const items=[];
    for(const route of listSyntheticMarketRoutes()){
      const existing=(await tx.select().from(marketRoute)
        .where(eq(marketRoute.routeKey,route.routeKey)).limit(1))[0];
      if(existing){
        const same=
          existing.marketRouteId===route.marketRouteId
          && existing.routeCatalogueVersion===route.catalogueVersion
          && existing.providerKey===route.providerKey
          && existing.channelKey===route.channelKey
          && existing.adapterVersion===route.adapterVersion
          && existing.mappingVersion===route.mappingVersion
          && existing.routeFingerprint===route.routeFingerprint
          && existing.synthetic===true;
        if(!same)throw new ConflictError("MARKET_ROUTE_VERSION_MISMATCH");
        items.push(existing);
        continue;
      }
      await tx.insert(marketRoute).values({
        marketRouteId:route.marketRouteId,
        routeKey:route.routeKey,
        routeCatalogueVersion:route.catalogueVersion,
        providerKey:route.providerKey,
        channelKey:route.channelKey,
        adapterVersion:route.adapterVersion,
        mappingVersion:route.mappingVersion,
        routeFingerprint:route.routeFingerprint,
        synthetic:true,
      });
      const row=(await tx.select().from(marketRoute)
        .where(eq(marketRoute.marketRouteId,route.marketRouteId)).limit(1))[0];
      items.push(row);
    }
    return {items:items.map(routeShape)};
  });
}

async function ensureQuoteLineage(db:MiqoDatabase,args:{
  quoteRequestId:string;
  marketRouteId:string;
  customerObjectiveId:string;
  scenarioId:string;
  riskProfileVersionId:string;
  routeFingerprint:string;
}){
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`sp4-route-lineage:${args.quoteRequestId}`}))`);
    const existing=(await tx.select().from(sp4QuoteRequestLineage)
      .where(eq(sp4QuoteRequestLineage.quoteRequestId,args.quoteRequestId)).limit(1))[0];
    if(existing){
      const same=
        existing.marketRouteId===args.marketRouteId
        && existing.customerObjectiveId===args.customerObjectiveId
        && existing.scenarioId===args.scenarioId
        && existing.riskProfileVersionId===args.riskProfileVersionId
        && existing.routeFingerprint===args.routeFingerprint
        && existing.orchestrationVersion===MARKET_ROUTE_ORCHESTRATION_VERSION;
      if(!same)throw new ConflictError("SP4_ROUTE_QUOTE_LINEAGE_MISMATCH");
      return {created:false,row:existing};
    }

    await tx.insert(sp4QuoteRequestLineage).values({
      quoteRequestId:args.quoteRequestId,
      marketRouteId:args.marketRouteId,
      customerObjectiveId:args.customerObjectiveId,
      scenarioId:args.scenarioId,
      riskProfileVersionId:args.riskProfileVersionId,
      routeFingerprint:args.routeFingerprint,
      orchestrationVersion:MARKET_ROUTE_ORCHESTRATION_VERSION,
    });

    const version=(await tx.select().from(riskProfileVersion)
      .where(eq(riskProfileVersion.riskProfileVersionId,args.riskProfileVersionId)).limit(1))[0];

    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"sp4_market_route_quote_linked",
      entityType:"quote_request",
      entityId:args.quoteRequestId,
      traceId:version.profileId,
      metadataJson:{
        customerObjectiveId:args.customerObjectiveId,
        scenarioId:args.scenarioId,
        marketRouteId:args.marketRouteId,
        routeFingerprint:args.routeFingerprint,
        orchestrationVersion:MARKET_ROUTE_ORCHESTRATION_VERSION,
      },
    });

    const row=(await tx.select().from(sp4QuoteRequestLineage)
      .where(eq(sp4QuoteRequestLineage.quoteRequestId,args.quoteRequestId)).limit(1))[0];
    return {created:true,row};
  });
}

async function presentRouteQuote(db:MiqoDatabase,lineage:any){
  const route=(await db.select().from(marketRoute)
    .where(eq(marketRoute.marketRouteId,lineage.marketRouteId)).limit(1))[0];
  const request=(await db.select().from(quoteRequest)
    .where(eq(quoteRequest.quoteRequestId,lineage.quoteRequestId)).limit(1))[0];
  const run=(await db.select().from(quoteRun)
    .where(eq(quoteRun.quoteRunId,request.quoteRunId)).limit(1))[0];
  const raw=(await db.select().from(rawProviderResponse)
    .where(eq(rawProviderResponse.quoteRequestId,request.quoteRequestId)).limit(1))[0];
  const normalised=raw
    ? (await db.select().from(normalisedQuote)
        .where(eq(normalisedQuote.rawProviderResponseId,raw.rawProviderResponseId))
        .orderBy(asc(normalisedQuote.normalisedAt)).limit(1))[0]
    : null;

  return {
    orchestrationVersion:lineage.orchestrationVersion,
    customerObjectiveId:lineage.customerObjectiveId,
    riskProfileVersionId:lineage.riskProfileVersionId,
    scenarioId:lineage.scenarioId,
    marketRoute:routeShape(route),
    quoteRunId:request.quoteRunId,
    quoteRequestId:request.quoteRequestId,
    requestFingerprint:request.requestFingerprint,
    rawProviderResponse:raw?{
      rawProviderResponseId:raw.rawProviderResponseId,
      payloadSha256:raw.payloadSha256,
      providerReference:raw.providerReference,
    }:null,
    normalisedQuote:normalised?{
      normalisedQuoteId:normalised.normalisedQuoteId,
      normalisationVersion:normalised.normalisationVersion,
      normalisationFingerprint:normalised.normalisationFingerprint,
      comparisonState:normalised.comparisonState,
      comparisonReason:normalised.comparisonReason,
      annualCashPremiumPence:normalised.annualCashPremiumPence,
      financeCostPence:normalised.financeCostPence,
      compulsoryExcessPence:normalised.compulsoryExcessPence,
      voluntaryExcessPence:normalised.voluntaryExcessPence,
    }:null,
  };
}

async function loadExplorationLineage(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  explorationFingerprint:string;
}){
  const objective=(await db.select().from(customerObjective)
    .where(eq(customerObjective.customerObjectiveId,args.customerObjectiveId)).limit(1))[0];
  if(!objective)throw new ValidationError("CUSTOMER_OBJECTIVE_NOT_FOUND");

  const lineages=await db.select().from(sp4ScenarioLineage).where(and(
    eq(sp4ScenarioLineage.customerObjectiveId,args.customerObjectiveId),
    eq(sp4ScenarioLineage.explorationFingerprint,args.explorationFingerprint),
  )).orderBy(asc(sp4ScenarioLineage.scenarioId));

  if(!lineages.length)throw new ValidationError("SP4_SCENARIO_EXPLORATION_NOT_FOUND");
  return {objective,lineages};
}

export async function executeSprint4MarketRoutes(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  explorationFingerprint:string;
}){
  const {objective,lineages}=await loadExplorationLineage(db,args);
  const routes=(await ensureSyntheticMarketRoutes(db)).items;
  const items=[];
  let anyCreated=false;

  for(const scenarioLineage of lineages){
    for(const route of routes){
      const prepared=await prepareQuoteRequest(db,{
        scenarioId:scenarioLineage.scenarioId,
        providerKey:route.providerKey,
        channel:route.channelKey,
        adapterVersion:route.adapterVersion,
        mappingVersion:route.mappingVersion,
      });
      const linked=await ensureQuoteLineage(db,{
        quoteRequestId:prepared.quoteRequestId,
        marketRouteId:route.marketRouteId,
        customerObjectiveId:objective.customerObjectiveId,
        scenarioId:scenarioLineage.scenarioId,
        riskProfileVersionId:objective.riskProfileVersionId,
        routeFingerprint:route.routeFingerprint,
      });
      const raw=await executePreparedQuoteRequest(db,prepared.quoteRequestId);
      const normalised=await normaliseRawProviderResponse(db,raw.item.rawProviderResponseId);
      anyCreated=anyCreated||prepared.created||linked.created||raw.created||normalised.created;
      items.push(await presentRouteQuote(db,linked.row));
    }
  }

  items.sort((a:any,b:any)=>
    a.scenarioId.localeCompare(b.scenarioId)
    || a.marketRoute.routeKey.localeCompare(b.marketRoute.routeKey)
  );

  return {
    created:anyCreated,
    customerObjectiveId:args.customerObjectiveId,
    explorationFingerprint:args.explorationFingerprint,
    orchestrationVersion:MARKET_ROUTE_ORCHESTRATION_VERSION,
    scenarioCount:lineages.length,
    marketRouteCount:routes.length,
    quoteCount:items.length,
    items,
  };
}

export async function listSprint4MarketRouteQuotes(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  explorationFingerprint:string;
}){
  await loadExplorationLineage(db,args);
  const scenarioLineages=await db.select().from(sp4ScenarioLineage).where(and(
    eq(sp4ScenarioLineage.customerObjectiveId,args.customerObjectiveId),
    eq(sp4ScenarioLineage.explorationFingerprint,args.explorationFingerprint),
  ));
  const scenarioIds=new Set(scenarioLineages.map(row=>row.scenarioId));
  const quoteLineages=await db.select().from(sp4QuoteRequestLineage)
    .where(eq(sp4QuoteRequestLineage.customerObjectiveId,args.customerObjectiveId))
    .orderBy(asc(sp4QuoteRequestLineage.scenarioId),asc(sp4QuoteRequestLineage.marketRouteId));

  const filtered=quoteLineages.filter(row=>scenarioIds.has(row.scenarioId));
  const items=[];
  for(const lineage of filtered)items.push(await presentRouteQuote(db,lineage));

  return {
    customerObjectiveId:args.customerObjectiveId,
    explorationFingerprint:args.explorationFingerprint,
    orchestrationVersion:MARKET_ROUTE_ORCHESTRATION_VERSION,
    items,
  };
}
