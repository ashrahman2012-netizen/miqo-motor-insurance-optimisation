import {test,expect} from "@playwright/test";

test("DB-G10.4 admin UI requires controlled synthetic handoff",async({page,request})=>{
  const denied=await request.get("http://127.0.0.1:3001/admin/profiles/UNAUTHORISED",{maxRedirects:0});
  expect(denied.status()).toBe(401);

  await page.goto("/prototype");
  await page.getByRole("button",{name:"Start synthetic profile"}).click();
  const profileId=page.url().match(/\/profile\/([^/]+)\//)![1];
  await page.getByLabel("Main driver ID").fill("DRV-SYN-DB-G10-ADMIN");
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button",{name:"Save & continue"}).click();
  await page.getByRole("button",{name:"Continue to confirmation"}).click();
  await page.getByLabel("I confirm").check();
  await page.getByRole("button",{name:"Confirm & lock profile"}).click();

  await expect(page).toHaveURL(new RegExp("127\\.0\\.0\\.1:3001/admin/profiles/"+profileId+"$"));
  await expect(page.getByRole("heading",{name:new RegExp("Profile inspector")})).toBeVisible();
  await expect(page.locator("#status-v1")).toHaveText("LOCKED");

  const apiDenied=await request.get("http://127.0.0.1:4000/admin/audit?profileId="+encodeURIComponent(profileId));
  expect(apiDenied.status()).toBe(401);
  const apiAllowed=await request.get("http://127.0.0.1:4000/admin/audit?profileId="+encodeURIComponent(profileId),{
    headers:{"x-miqo-synthetic-admin":"DB-G10-SYNTHETIC-ADMIN"}
  });
  expect(apiAllowed.status()).toBe(200);
});
