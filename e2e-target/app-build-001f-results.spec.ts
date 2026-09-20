import {test,expect} from "@playwright/test";
const API="http://127.0.0.1:4000";

async function prepare(request:any){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();
  for(const [fieldId,value] of [["main_driver_id","DRV-001F"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
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
  expect(exploration.items).toHaveLength(4);

  const base=API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint;
  expect([200,201]).toContain((await request.post(base+"/market-route-quotes")).status());

  return {profile,objective,exploration,base};
}

function resultsUrl(state:any){
  return "/results?profileId="+encodeURIComponent(state.profile.profileId)
    +"&customerObjectiveId="+encodeURIComponent(state.objective.customerObjectiveId)
    +"&explorationFingerprint="+encodeURIComponent(state.exploration.explorationFingerprint);
}

test("BUILD-001F persists Your Results and renders Why This Surfaced from stored explanation evidence",async({page,request})=>{
  const state=await prepare(request);
  await page.goto(resultsUrl(state));

  await expect(page.getByRole("heading",{name:"Your Results"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Generate Your Results"})).toBeEnabled();

  const before=await request.get(state.base+"/recommendations");
  expect(before.status()).toBe(422);

  await page.getByRole("button",{name:"Generate Your Results"}).click();
  await expect(page.getByRole("heading",{name:"Why This Surfaced",level:1})).toBeVisible();
  await expect(page.locator('[data-testid="results-surfaced"]')).toBeVisible();
  await expect(page.getByText("Commercial independence",{exact:true}).first()).toBeVisible();
  await expect(page.getByText(/commercial inputs were excluded|commission|remuneration/i).first()).toBeVisible();
  await expect(page.getByText("Other ranked evidence",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Go to insurer"})).toBeDisabled();
  await expect(page.getByText(/No live insurer destination is fabricated/i)).toBeVisible();

  const recommendation=await (await request.get(state.base+"/recommendations")).json();
  expect(recommendation.recommendationSetId).toBeTruthy();
  expect(recommendation.surfacedNormalisedQuoteId).toBe(recommendation.eligible[0].normalisedQuoteId);
  expect(recommendation.eligible).toHaveLength(8);

  const explanation=await (await request.get(API+"/recommendations/"+recommendation.recommendationSetId+"/explanation")).json();
  expect(explanation.explanationFingerprint).toMatch(/^[0-9a-f]{64}$/);
  expect(explanation.materialReasons.some((item:any)=>item.code==="COMMERCIAL_INPUTS_EXCLUDED")).toBe(true);
});

test("BUILD-001F final integrity proof remains synthetic and never authorises live provider handoff",async({page,request})=>{
  const state=await prepare(request);
  expect([200,201]).toContain((await request.post(state.base+"/recommendations")).status());

  await page.goto(resultsUrl(state));
  await page.getByRole("button",{name:"Run final integrity proof"}).click();

  await expect(page).toHaveURL(/selectionId=/);
  await expect(page.getByText("INTEGRITY PASS",{exact:true})).toBeVisible();
  await expect(page.getByText("SYNTHETIC",{exact:true}).last()).toBeVisible();
  await expect(page.getByText("DISABLED",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Go to insurer"})).toBeDisabled();

  const selectionId=new URL(page.url()).searchParams.get("selectionId");
  expect(selectionId).toBeTruthy();
  const selection=await (await request.get(API+"/selections/"+selectionId)).json();
  expect(selection.status).toBe("ACCEPTED");
  expect(selection.finalIntegrity.outcome).toBe("PASS");
  expect(selection.completion.dataClassification).toBe("SYNTHETIC");
  expect(selection.completion.liveProviderActivity).toBe("DISABLED");
});
