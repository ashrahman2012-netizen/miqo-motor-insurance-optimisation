import {test,expect} from "@playwright/test";
const API="http://127.0.0.1:4000";

async function prepare(request:any){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();

  for(const [fieldId,value] of [["main_driver_id","DRV-001H"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
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
  expect([200,201]).toContain((await request.post(base+"/recommendations")).status());

  return {profile,objective,exploration};
}

test("BUILD-001H Documents shows application records without fabricating downloadable insurance documents",async({page,request})=>{
  const state=await prepare(request);
  await page.goto("/documents?profileId="+encodeURIComponent(state.profile.profileId));

  await expect(page.getByRole("heading",{name:"Documents & Records",level:1})).toBeVisible();
  const records=page.locator('[data-testid="customer-records"]');
  await expect(records).toBeVisible();
  await expect(records).toContainText("Profile record v1");
  await expect(records).toContainText("Scenario exploration record");
  await expect(records).toContainText("Quote comparison record");
  await expect(records).toContainText("Your Results record");
  await expect(records.getByRole("button",{name:"Download file"})).toHaveCount(4);
  await expect(records.getByRole("button",{name:"Download file"}).first()).toBeDisabled();
  await expect(page.getByRole("button",{name:"Upload document"})).toBeDisabled();
  await expect(page.getByText(/not insurer policy documents/i)).toBeVisible();
  await expect(page.getByText(/Nothing on this page is a certificate of motor insurance/i)).toBeVisible();
});

test("BUILD-001H Activity is a customer-safe projection and excludes low-level provider trace events",async({page,request})=>{
  const state=await prepare(request);
  await page.goto("/activity?profileId="+encodeURIComponent(state.profile.profileId));

  await expect(page.getByRole("heading",{name:"Your Activity",level:1})).toBeVisible();
  const activity=page.locator('[data-testid="customer-activity"]');
  await expect(activity).toBeVisible();
  await expect(activity).toContainText("Profile locked");
  await expect(activity).toContainText("Scenarios generated");
  await expect(activity).toContainText("Your Results created");
  await expect(activity).toContainText("Why This Surfaced created");
  await expect(page.getByText("Raw provider response captured",{exact:true})).toHaveCount(0);
  await expect(page.getByText(/simplified activity view, not the technical audit console/i)).toBeVisible();
});

test("BUILD-001H Support provides governed guidance without creating messaging or support records",async({page,request})=>{
  const state=await prepare(request);
  await page.goto("/support?profileId="+encodeURIComponent(state.profile.profileId));

  await expect(page.getByRole("heading",{name:"Help & Support",level:1})).toBeVisible();
  const topics=page.locator('[data-testid="support-topics"]');
  await expect(topics).toContainText("Profile information and corrections");
  await expect(topics).toContainText("Quote comparison");
  await expect(topics).toContainText("Your Results and Why This Surfaced");
  await expect(topics).toContainText(/synthetic environment/i);
  await expect(page.getByRole("button",{name:"Contact support"})).toBeDisabled();
  await expect(page.getByText(/does not create messages, tickets or external support records/i)).toBeVisible();
});
