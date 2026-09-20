import {test,expect} from "@playwright/test";
import pg from "pg";
const {Client}=pg;
const API="http://127.0.0.1:4000";

async function createAndLock(request:any,mileage=8000){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-001"],["annual_mileage",mileage],["licence_held_since","2018-04-16"]] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }
  expect((await request.post(API+"/profiles/"+profile.profileId+"/validate")).status()).toBe(200);
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);
  return profile;
}

test("BUILD-001C canonical capture, validation, review and lock journey",async({page})=>{
  await page.goto("/profile/capture");
  await expect(page.getByRole("heading",{name:"Profile capture"})).toBeVisible();
  await page.getByRole("button",{name:"Start synthetic profile"}).click();
  await expect(page).toHaveURL(/\/profile\/capture\?profileId=/);

  await page.getByLabel("Main driver ID").fill("DRV-SYN-001");
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button",{name:"Save & continue to validation"}).click();

  await expect(page).toHaveURL(/\/profile\/validation\?profileId=/);
  await page.getByRole("button",{name:"Run validation"}).click();
  await expect(page.getByText("Validation passed",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:/Continue to review/}).click();

  await expect(page.getByRole("heading",{name:"Profile Review & Lock"})).toBeVisible();
  await expect(page.getByText("8,000 miles",{exact:true})).toBeVisible();
  await expect(page.getByText("No recorded discrepancies",{exact:true})).toBeVisible();
  await page.getByLabel("I confirm my profile is accurate").check();
  await page.getByRole("button",{name:"Confirm & Lock Profile"}).click();

  await expect(page).toHaveURL(/\/dashboard\?profileId=/);
  await expect(page.getByText("Locked",{exact:true}).first()).toBeVisible();
});

test("BUILD-001C renders persisted blocking discrepancy and creates correction v2 without mutating v1",async({page,request})=>{
  const profile=await createAndLock(request,8000);
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  await client.query(
    "INSERT INTO discrepancy(discrepancy_id,risk_profile_version_id,field_id,declared_value_json,verified_value_json,state,blocking) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)",
    ["DIS-001C-"+Date.now(),profile.versionId,"annual_mileage",JSON.stringify(8000),JSON.stringify(9000),"REVIEW_REQUIRED",true]
  );
  await client.end();

  await page.goto("/profile/review?profileId="+encodeURIComponent(profile.profileId));
  await expect(page.getByRole("heading",{name:"Profile Review & Lock"})).toBeVisible();
  await expect(page.getByText("8,000 miles",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("9,000 miles",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Use verified value in a new version"})).toBeVisible();

  await page.getByRole("button",{name:"Use verified value in a new version"}).click();
  await expect(page.getByText("DRAFT",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("9,000 miles",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("Run validation before profile lock.",{exact:true})).toBeVisible();

  const snapshot=await (await request.get(API+"/profiles/"+profile.profileId+"/snapshot")).json();
  expect(snapshot.versions).toHaveLength(2);
  expect(snapshot.versions[0].status).toBe("LOCKED");
  expect(snapshot.versions[0].values.find((item:any)=>item.fieldId==="annual_mileage").value).toBe(8000);
  expect(snapshot.versions[1].status).toBe("DRAFT");
  expect(snapshot.versions[1].values.find((item:any)=>item.fieldId==="annual_mileage").value).toBe(9000);
});
