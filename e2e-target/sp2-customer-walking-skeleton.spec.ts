import {test,expect} from "@playwright/test";

const API="http://127.0.0.1:4000";

test("SP2-CUSTOMER-WALKING-SKELETON-001 C-08 to C-09 to C-11 target stack",async({page,request})=>{
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-SP2"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);

  await page.goto("/profile/"+profile.profileId+"/optimisation");
  await expect(page.getByRole("heading",{name:"Optimisation preferences"})).toBeVisible();
  await expect(page.locator("#locked-version")).toContainText("LOCKED RiskProfileVersion");
  await page.getByLabel("Voluntary excess").selectOption("500");
  await page.getByLabel("Payment structure").selectOption("ANNUAL");
  await page.getByLabel("Policy start date").fill("2026-10-01");
  await page.getByLabel("Telematics preference").check();
  await page.getByRole("button",{name:"Save preferences & preview scenarios"}).click();

  await expect(page).toHaveURL(new RegExp("/profile/"+profile.profileId+"/optimisation/scenarios$"));
  await expect(page.getByRole("heading",{name:"Scenario preview"})).toBeVisible();
  await expect(page.locator("#saved-preferences")).toContainText("voluntary_excess");
  await page.getByRole("button",{name:"Generate scenario preview"}).click();

  await expect(page.locator("#scenario-preview")).toBeVisible();
  await expect(page.locator("#scenario-deltas")).toContainText("voluntary_excess = 500 [O]");
  await expect(page.locator("#scenario-deltas")).toContainText('payment_structure = "ANNUAL" [O]');
  await expect(page.locator("#scenario-deltas")).not.toContainText("annual_mileage");
  await page.getByRole("button",{name:"Run synthetic quote"}).click();

  await expect(page).toHaveURL(new RegExp("/profile/"+profile.profileId+"/quotes\\?rawProviderResponseId="));
  await expect(page.getByRole("heading",{name:"Quote comparison"})).toBeVisible();
  await expect(page.locator("#comparison-state")).toHaveText("DIRECTLY_COMPARABLE");
  await expect(page.locator("#annual-premium")).toHaveText("£701.40");
  await expect(page.locator("#compulsory-excess")).toHaveText("£350.00");
  await expect(page.locator("#voluntary-excess")).toHaveText("£500.00");
  await expect(page.locator("#comparison-boundary")).toContainText("No universal effective-cost calculation");

  const snapshot=await (await request.get(API+"/profiles/"+profile.profileId+"/snapshot")).json();
  const locked=snapshot.versions.find((version:any)=>version.versionId===profile.versionId);
  expect(locked.status).toBe("LOCKED");
  expect(locked.values.find((value:any)=>value.fieldId==="annual_mileage").value).toBe(8000);

  const preferences=await (await request.get(API+"/profile-versions/"+profile.versionId+"/optimisation-preferences")).json();
  expect(preferences.items.every((item:any)=>Boolean(item.frozenAt))).toBe(true);
});
