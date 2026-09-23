import {test,expect} from "@playwright/test";
import {obtainAdminToken} from "./admin-auth";
const API="http://127.0.0.1:4000";
const ADMIN="http://127.0.0.1:3001";

async function prepare(request:any){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();

  for(const [fieldId,value] of [["main_driver_id","DRV-001G"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }
  expect((await request.post(API+"/profiles/"+profile.profileId+"/validate")).status()).toBe(200);
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);

  const objectiveResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/customer-objectives",{data:{objectiveId:"LOWEST_ANNUAL_PREMIUM"}});
  expect([200,201]).toContain(objectiveResponse.status());
  const objective=(await objectiveResponse.json()).item;

  const explorationResponse=await request.post(API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",{data:{choices:{
    voluntary_excess:[250,500],payment_structure:["ANNUAL"],telematics_preference:[false,true],
  }}});
  expect([200,201]).toContain(explorationResponse.status());
  const exploration=await explorationResponse.json();
  const base=API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint;

  expect([200,201]).toContain((await request.post(base+"/market-route-quotes")).status());
  const recommendationResponse=await request.post(base+"/recommendations");
  expect([200,201]).toContain(recommendationResponse.status());
  const recommendation=await recommendationResponse.json();

  const shortlistResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/shortlists");
  expect([200,201]).toContain(shortlistResponse.status());
  const shortlist=await shortlistResponse.json();
  expect(shortlist.entries.some((item:any)=>item.normalisedQuoteId===recommendation.surfacedNormalisedQuoteId)).toBe(true);

  const selectionResponse=await request.post(API+"/shortlists/"+shortlist.shortlistId+"/selections",{data:{
    normalisedQuoteId:recommendation.surfacedNormalisedQuoteId,
    recommendationSetId:recommendation.recommendationSetId,
  }});
  expect(selectionResponse.status()).toBe(201);
  const selection=await selectionResponse.json();

  const adminToken=await obtainAdminToken();
  const trace=await (await request.get(API+"/desktop-admin/selections/"+selection.selectionId+"/sp4-trace",{headers:{authorization:"Bearer "+adminToken}})).json();
  const selectedEvidence=trace.marketRouteQuotes.find((item:any)=>item.normalisedQuote.normalisedQuoteId===trace.recommendation.surfacedNormalisedQuoteId);

  return {profile,objective,exploration,recommendation,selection,trace,selectedEvidence};
}

test("BUILD-001G renders canonical append-only audit and complete selected-result lineage",async({page,request})=>{
  const state=await prepare(request);
  await page.goto(ADMIN+"/admin/audit?selectionId="+encodeURIComponent(state.selection.selectionId));

  await expect(page.getByRole("heading",{name:"Audit & Trace Console",level:1})).toBeVisible();
  await expect(page.locator('[data-testid="admin-lineage"]')).toBeVisible();
  await expect(page.getByText("RAW PROVIDER RESPONSE",{exact:true})).toBeVisible();
  await expect(page.getByText("NORMALISED QUOTE",{exact:true})).toBeVisible();

  await expect(page.locator('[data-testid="admin-current-artefact"]')).toContainText(state.recommendation.recommendationSetId);
  await expect(page.locator('[data-testid="admin-current-artefact"]')).toContainText(state.selection.selectionId);

  await expect(page.locator('[data-testid="admin-audit-timeline"]')).toContainText("Final integrity passed");
  await expect(page.locator('[data-testid="admin-integrity-queue"]')).toContainText("Final integrity");
  await expect(page.locator('[data-testid="admin-integrity-queue"]')).toContainText("PASS");

  await expect(page.locator('[data-testid="admin-provider-evidence"]')).toContainText(state.selectedEvidence.rawProviderResponse.rawProviderResponseId);
  await expect(page.locator('[data-testid="admin-provider-evidence"]')).toContainText(state.selectedEvidence.normalisedQuote.normalisedQuoteId);
  await expect(page.locator('[data-testid="admin-provider-evidence"]')).toContainText(state.selectedEvidence.rawProviderResponse.payloadSha256);

  await expect(page.getByText("Commercial independence",{exact:true})).toBeVisible();
  await expect(page.getByText("VERIFIED",{exact:true})).toBeVisible();
});

test("BUILD-001G profile audit filters are read-only projections over append-only events",async({page,request})=>{
  const state=await prepare(request);
  await page.goto(
    ADMIN+"/admin/audit?profileId="+encodeURIComponent(state.profile.profileId)
      +"&eventType=profile_locked",
  );

  const timeline=page.locator('[data-testid="admin-audit-timeline"]');
  await expect(timeline).toBeVisible();
  await expect(timeline.locator("ol > li")).toHaveCount(1);
  await expect(timeline).toContainText("Profile locked");
  await expect(page.getByText("Selection lineage not loaded",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/delete|remove|edit audit/i})).toHaveCount(0);
});
