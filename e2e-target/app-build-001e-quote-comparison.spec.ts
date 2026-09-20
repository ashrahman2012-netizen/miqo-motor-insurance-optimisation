import {test,expect} from "@playwright/test";
const API="http://127.0.0.1:4000";

async function prepare(request:any,objectiveId="LOWEST_ANNUAL_PREMIUM"){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();
  for(const [fieldId,value] of [["main_driver_id","DRV-001E"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }
  expect((await request.post(API+"/profiles/"+profile.profileId+"/validate")).status()).toBe(200);
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);
  const objectiveResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/customer-objectives",{data:{objectiveId}});
  expect([200,201]).toContain(objectiveResponse.status());
  const objective=(await objectiveResponse.json()).item;
  const explorationResponse=await request.post(API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",{data:{choices:{
    voluntary_excess:[250,500],
    payment_structure:["ANNUAL","MONTHLY"],
  }}});
  expect([200,201]).toContain(explorationResponse.status());
  const exploration=await explorationResponse.json();
  return {profile,objective,exploration};
}

function quoteUrl(state:any){
  return "/quotes?profileId="+encodeURIComponent(state.profile.profileId)
    +"&customerObjectiveId="+encodeURIComponent(state.objective.customerObjectiveId)
    +"&explorationFingerprint="+encodeURIComponent(state.exploration.explorationFingerprint);
}

test("BUILD-001E runs canonical synthetic quote routes and renders objective-ranked comparable evidence",async({page,request})=>{
  const state=await prepare(request);
  await page.goto(quoteUrl(state));

  await expect(page.getByRole("heading",{name:"Quote Comparison"})).toBeVisible();
  await expect(page.getByText("No quotation evidence",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Run quote comparison"}).click();

  await expect(page.locator("#ranked-quotes tbody tr")).toHaveCount(8);
  await expect(page.getByText("Rank 1 for selected objective",{exact:true})).toBeVisible();
  await expect(page.getByText("DIRECTLY COMPARABLE",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("This is an ordering result, not a customer recommendation.",{exact:true})).toBeVisible();

  const comparison=await (await request.get(
    API+"/customer-objectives/"+state.objective.customerObjectiveId+
    "/scenario-explorations/"+state.exploration.explorationFingerprint+"/quote-comparison"
  )).json();
  expect(comparison.eligible).toHaveLength(8);
  expect(comparison).not.toHaveProperty("surfacedNormalisedQuoteId");

  const text=await page.locator("#ranked-quotes").innerText();
  expect(text.toLowerCase()).not.toContain("effective cost");
  expect(text.toLowerCase()).not.toContain("composite score");
});

test("BUILD-001E preserves objective-ineligible directly-comparable evidence outside the ranked set",async({page,request})=>{
  const state=await prepare(request,"LOWEST_MONTHLY_COMMITMENT");
  const base=API+"/customer-objectives/"+state.objective.customerObjectiveId+
    "/scenario-explorations/"+state.exploration.explorationFingerprint;
  expect([200,201]).toContain((await request.post(base+"/market-route-quotes")).status());

  await page.goto(quoteUrl(state));
  await expect(page.locator("#ranked-quotes tbody tr")).toHaveCount(4);
  await expect(page.getByText("PAYMENT_STRUCTURE_NOT_MONTHLY",{exact:true})).toHaveCount(4);
  await expect(page.getByText("4 ranked",{exact:true})).toBeVisible();
  await expect(page.getByText("8 total evidence",{exact:true})).toBeVisible();
});
