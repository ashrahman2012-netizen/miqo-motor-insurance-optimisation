import {test,expect} from "@playwright/test";

const API="http://127.0.0.1:4000";
const ADMIN="http://127.0.0.1:3001";
const SYNTHETIC_NOTICE="SYNTHETIC — Test data and test quotations only. No live insurer connection.";

async function prepareCertifiedJourney(request:any){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();

  for(const [fieldId,value] of [
    ["main_driver_id","DRV-001J"],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
  ] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }

  expect((await request.post(API+"/profiles/"+profile.profileId+"/validate")).status()).toBe(200);
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);

  const objectiveResponse=await request.post(
    API+"/profile-versions/"+profile.versionId+"/customer-objectives",
    {data:{objectiveId:"LOWEST_ANNUAL_PREMIUM"}},
  );
  expect([200,201]).toContain(objectiveResponse.status());
  const objective=(await objectiveResponse.json()).item;

  const explorationResponse=await request.post(
    API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    {data:{choices:{
      voluntary_excess:[250,500],
      payment_structure:["ANNUAL"],
      telematics_preference:[false,true],
    }}},
  );
  expect([200,201]).toContain(explorationResponse.status());
  const exploration=await explorationResponse.json();
  expect(exploration.items).toHaveLength(4);

  const evidenceBase=API
    +"/customer-objectives/"+objective.customerObjectiveId
    +"/scenario-explorations/"+exploration.explorationFingerprint;

  expect([200,201]).toContain((await request.post(evidenceBase+"/market-route-quotes")).status());

  const recommendationResponse=await request.post(evidenceBase+"/recommendations");
  expect([200,201]).toContain(recommendationResponse.status());
  const recommendation=await recommendationResponse.json();

  const shortlistResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/shortlists");
  expect([200,201]).toContain(shortlistResponse.status());
  const shortlist=await shortlistResponse.json();

  const selectionResponse=await request.post(
    API+"/shortlists/"+shortlist.shortlistId+"/selections",
    {data:{
      normalisedQuoteId:recommendation.surfacedNormalisedQuoteId,
      recommendationSetId:recommendation.recommendationSetId,
    }},
  );
  expect(selectionResponse.status()).toBe(201);
  const selection=await selectionResponse.json();

  return {profile,objective,exploration,recommendation,selection};
}

function query(state:any){
  return "profileId="+encodeURIComponent(state.profile.profileId)
    +"&customerObjectiveId="+encodeURIComponent(state.objective.customerObjectiveId)
    +"&explorationFingerprint="+encodeURIComponent(state.exploration.explorationFingerprint);
}

test("BUILD-001J certifies the complete canonical customer application surface",async({page,request})=>{
  test.setTimeout(150000);
  const state=await prepareCertifiedJourney(request);
  const q=query(state);

  const routes=[
    ["/dashboard?"+q,"Customer Dashboard"],
    ["/profile/review?profileId="+encodeURIComponent(state.profile.profileId),"Profile Review & Lock"],
    ["/optimise?"+q,"Objective & Scenario Explorer"],
    ["/quotes?"+q,"Quote Comparison"],
    ["/results?"+q+"&selectionId="+encodeURIComponent(state.selection.selectionId),"Why This Surfaced"],
    ["/documents?profileId="+encodeURIComponent(state.profile.profileId),"Documents & Records"],
    ["/activity?profileId="+encodeURIComponent(state.profile.profileId),"Your Activity"],
    ["/support?profileId="+encodeURIComponent(state.profile.profileId),"Help & Support"],
  ] as const;

  for(const [url,heading] of routes){
    await page.goto(url);
    await expect(page.getByRole("heading",{name:heading,level:1})).toBeVisible();
    await expect(page.getByText(SYNTHETIC_NOTICE)).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
  }

  await page.goto("/results?"+q+"&selectionId="+encodeURIComponent(state.selection.selectionId));
  await expect(page.getByText("INTEGRITY PASS",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Go to insurer"})).toBeDisabled();
  await expect(page.getByText(/No live insurer destination is fabricated/i)).toBeVisible();

  await page.goto("/documents?profileId="+encodeURIComponent(state.profile.profileId));
  await expect(page.getByRole("button",{name:"Upload document"})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Download file"}).first()).toBeDisabled();
  await expect(page.getByText(/not insurer policy documents/i)).toBeVisible();

  await page.goto("/support?profileId="+encodeURIComponent(state.profile.profileId));
  await expect(page.getByRole("button",{name:"Contact support"})).toBeDisabled();
  await expect(page.getByText(/does not create messages, tickets or external support records/i)).toBeVisible();
});

test("BUILD-001J preserves objective-specific, non-advised and adjusted-comparison boundaries",async({page,request})=>{
  test.setTimeout(90000);
  const state=await prepareCertifiedJourney(request);
  const q=query(state);

  await page.goto("/quotes?"+q);
  await expect(page.getByText("Rank 1 for selected objective",{exact:true})).toBeVisible();
  await expect(page.getByText(/ordering result, not a customer recommendation/i)).toBeVisible();

  await page.goto("/results?"+q+"&selectionId="+encodeURIComponent(state.selection.selectionId));
  await expect(page.getByRole("heading",{name:"Why This Surfaced",level:1})).toBeVisible();
  await expect(page.getByText("Commercial independence",{exact:true}).first()).toBeVisible();

  const body=(await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("we recommend");
  expect(body).not.toContain("best policy for you");
  expect(body).not.toContain("best insurer for you");
  expect(body).not.toContain("you should buy");
  expect(body).not.toContain("guaranteed cheapest");
  expect(body).not.toContain("adjusted comparable");
});

test("BUILD-001J certifies governed admin trace against the same selected result",async({page,request})=>{
  test.setTimeout(90000);
  const state=await prepareCertifiedJourney(request);

  await page.goto(ADMIN+"/admin/audit?selectionId="+encodeURIComponent(state.selection.selectionId));
  await expect(page.getByRole("heading",{name:"Audit & Trace Console",level:1})).toBeVisible();
  await expect(page.getByText(SYNTHETIC_NOTICE)).toBeVisible();

  const lineage=page.getByTestId("admin-lineage");
  await expect(lineage).toContainText("RAW PROVIDER RESPONSE");
  await expect(lineage).toContainText("NORMALISED QUOTE");
  await expect(lineage).toContainText("RECOMMENDATION SET");
  await expect(lineage).toContainText("FINAL INTEGRITY");

  await expect(page.getByTestId("admin-integrity-queue")).toContainText("PASS");
  await expect(page.getByTestId("admin-provider-evidence")).toBeVisible();
  await expect(page.getByRole("button",{name:/delete|remove|edit audit/i})).toHaveCount(0);
});
