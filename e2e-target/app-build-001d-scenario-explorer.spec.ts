import {test,expect} from "@playwright/test";
const API="http://127.0.0.1:4000";

async function lockedProfile(request:any){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();
  for(const [fieldId,value] of [["main_driver_id","DRV-001D"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }
  expect((await request.post(API+"/profiles/"+profile.profileId+"/validate")).status()).toBe(200);
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);
  return profile;
}

test("BUILD-001D objective catalogue and four-scenario explorer preserve O-only boundary",async({page,request})=>{
  const profile=await lockedProfile(request);
  await page.goto("/optimise?profileId="+encodeURIComponent(profile.profileId));

  await expect(page.getByRole("heading",{name:"Objective & Scenario Explorer"})).toBeVisible();
  await expect(page.getByText("Balanced cost and exposure",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/Balanced cost and exposure/})).toBeDisabled();
  await expect(page.getByText(/F\/V\/D\/I cannot be edited here/)).toBeVisible();

  await page.getByRole("button",{name:/Lowest annual premium/}).click();
  await expect(page).toHaveURL(/customerObjectiveId=/);
  await expect(page.getByRole("button",{name:/Lowest annual premium/})).toHaveAttribute("aria-pressed","true");

  await expect(page.getByLabel("Candidate vehicle choice")).toBeDisabled();
  await page.getByRole("button",{name:"Generate scenarios"}).click();
  await expect(page).toHaveURL(/explorationFingerprint=/);

  const rows=page.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  const tableText=await page.locator("#generated-scenarios").innerText();
  expect(tableText).toContain("[O]");
  expect(tableText).toContain("£250");
  expect(tableText).toContain("£500");
  expect(tableText).toContain("Telematics accepted");
  expect(tableText).toContain("No telematics");
  expect(tableText).not.toContain("annual_mileage");
  expect(tableText).not.toContain("Annual premium");

  const snapshot=await (await request.get(API+"/profiles/"+profile.profileId+"/snapshot")).json();
  const locked=snapshot.versions.find((item:any)=>item.versionId===profile.versionId);
  expect(locked.status).toBe("LOCKED");
  expect(locked.values.find((item:any)=>item.fieldId==="annual_mileage").value).toBe(8000);
});

test("BUILD-001D renders persisted deterministic rejection evidence without fabricating scenarios",async({page,request})=>{
  const profile=await lockedProfile(request);
  const objectiveResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/customer-objectives",{data:{objectiveId:"LOWEST_ANNUAL_PREMIUM"}});
  expect([200,201]).toContain(objectiveResponse.status());
  const objective=(await objectiveResponse.json()).item;
  const rejected=await request.post(API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",{data:{choices:{voluntary_excess:[999]}}});
  expect(rejected.status()).toBe(201);
  const exploration=await rejected.json();
  expect(exploration.items).toHaveLength(0);
  expect(exploration.rejections[0].ruleId).toBe("VALUE_OUTSIDE_CATALOGUE");

  await page.goto("/optimise?profileId="+encodeURIComponent(profile.profileId)+"&customerObjectiveId="+encodeURIComponent(objective.customerObjectiveId)+"&explorationFingerprint="+encodeURIComponent(exploration.explorationFingerprint));
  await expect(page.getByText("VALUE_OUTSIDE_CATALOGUE",{exact:true})).toBeVisible();
  await expect(page.getByText("No accepted scenarios",{exact:true})).toBeVisible();
  await expect(page.getByText("IMPOSSIBLE",{exact:true})).toBeVisible();
});
