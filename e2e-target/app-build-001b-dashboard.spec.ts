import {test,expect} from "@playwright/test";

const API="http://127.0.0.1:4000";

async function createCompletedDashboardState(request:any){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-DASH"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }
  expect((await request.post(API+"/profiles/"+profile.profileId+"/validate")).status()).toBe(200);
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);

  const objectiveResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/customer-objectives",{data:{objectiveId:"LOWEST_ANNUAL_PREMIUM"}});
  expect([200,201]).toContain(objectiveResponse.status());
  const objective=(await objectiveResponse.json()).item;

  const explorationResponse=await request.post(API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",{data:{choices:{
    voluntary_excess:[250,500],
    payment_structure:["ANNUAL"],
    telematics_preference:[false,true],
  }}});
  expect([200,201]).toContain(explorationResponse.status());
  const exploration=await explorationResponse.json();

  const base=API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+encodeURIComponent(exploration.explorationFingerprint);
  const routeResponse=await request.post(base+"/market-route-quotes");
  expect([200,201]).toContain(routeResponse.status());
  const routes=await routeResponse.json();

  const recommendationResponse=await request.post(base+"/recommendations");
  expect([200,201]).toContain(recommendationResponse.status());
  const recommendation=await recommendationResponse.json();

  return {profile,objective,exploration,routes,recommendation};
}

test("BUILD-001B composes a real read-only customer dashboard from persisted application evidence",async({page,request})=>{
  const state=await createCompletedDashboardState(request);
  await page.goto("/dashboard?profileId="+encodeURIComponent(state.profile.profileId));

  await expect(page.getByRole("heading",{name:"Customer dashboard"})).toBeVisible();
  await expect(page.getByText(state.profile.profileId,{exact:true})).toBeVisible();
  await expect(page.getByText("Locked",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("Lowest annual premium",{exact:true}).first()).toBeVisible();
  await expect(page.getByText(String(state.exploration.items.length),{exact:true}).first()).toBeVisible();
  await expect(page.getByText(state.exploration.explorationFingerprint,{exact:true})).toBeVisible();
  await expect(page.getByTestId("dashboard-recommendation-id")).toContainText(state.recommendation.recommendationSetId);
  await expect(page.getByTestId("dashboard-top-result")).toContainText("DIRECTLY COMPARABLE");
  await expect(page.getByText("NOT AUTHORISED",{exact:true})).toBeVisible();
});

test("BUILD-001B dashboard has a governed empty state without inventing a case",async({page})=>{
  await page.goto("/dashboard");
  await expect(page.getByRole("heading",{name:"Customer dashboard"})).toBeVisible();
  await expect(page.getByText("No active case",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Start synthetic profile"})).toBeVisible();
  await expect(page.getByText("Provider A Direct",{exact:true})).toHaveCount(0);
});
