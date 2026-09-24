import {test,expect} from "@playwright/test";

test("DB-G10.6 script-like factual input is rendered as data and never executed",async({page})=>{
  await page.goto("/prototype");
  await page.getByRole("button",{name:"Start synthetic profile"}).click();
  const profileId=page.url().match(/\/profile\/([^/]+)\//)![1];
  const hostile='<img src=x onerror="window.__miqoXss=1">';
  await page.getByLabel("Main driver ID").fill(hostile);
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button",{name:"Save & continue"}).click();
  await page.getByRole("button",{name:"Continue to confirmation"}).click();
  await page.getByLabel("I confirm").check();
  await page.getByRole("button",{name:"Confirm & lock profile"}).click();

  await expect(page).toHaveURL(new RegExp("127\\.0\\.0\\.1:3001/admin/profiles/"+profileId+"$"));
  await expect(page.getByText(hostile,{exact:true})).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(await page.evaluate(()=>Reflect.get(window as any,"__miqoXss"))).toBeUndefined();
});
