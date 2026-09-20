import {test,expect} from "@playwright/test";

test("S5-G22 production-readiness journey remains fail-closed for unauthorised capabilities",async({page})=>{
  await page.goto("/prototype");
  await expect(page.getByText("MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY")).toBeVisible();
  await page.getByRole("button",{name:"Start synthetic profile"}).click();

  const profileId=page.url().match(/\/profile\/([^/]+)\//)![1];
  await page.getByLabel("Main driver ID").fill("DRV-SYN-SP5-G22");
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button",{name:"Save & continue"}).click();
  await page.getByRole("button",{name:"Continue to confirmation"}).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("I confirm").check();
  await page.getByRole("button",{name:"Confirm & lock profile"}).click();

  await page.goto("http://127.0.0.1:3000/profile/"+profileId+"/recommendations");
  await page.getByLabel("Customer objective").selectOption("LOWEST_ANNUAL_PREMIUM");
  await page.getByRole("button",{name:"Save customer objective"}).click();
  await page.getByRole("button",{name:"Generate multi-scenario exploration"}).click();
  await expect(page.locator("#sp4-scenario-count")).toHaveText("4");
  await page.getByRole("button",{name:"Run synthetic market routes"}).click();
  await expect(page.locator("#sp4-quote-count")).not.toHaveText("0");
  await page.getByRole("button",{name:"Build recommendation"}).click();
  await expect(page.locator("#sp4-recommendation-set-id")).not.toHaveText("");

  await page.getByRole("button",{name:"Select recommended quote & run final integrity"}).click();
  await expect(page).toHaveURL(new RegExp("/profile/"+profileId+"/completion\\?selectionId="));
  await expect(page.locator("#final-integrity-outcome")).toHaveText("PASS");
  await expect(page.locator("#completion-data-classification")).toHaveText("SYNTHETIC");
  await expect(page.locator("#completion-live-provider")).toHaveText("DISABLED");
  await expect(page.getByText("No policy purchase, payment or binding has occurred.")).toBeVisible();

  const body=await page.locator("body").innerText();
  expect(body).not.toContain("LIVE_PROVIDER=AUTHORISED");
  expect(body).not.toContain("REAL_DATA=AUTHORISED");
  expect(body).not.toContain("BIND_PAY=AUTHORISED");
});
