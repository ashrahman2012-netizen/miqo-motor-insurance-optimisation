import {test,expect} from "@playwright/test";

test("SP4-G14 customer objective to final integrity browser journey",async({page})=>{
  await page.goto("/prototype");
  await expect(page.getByText("MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY")).toBeVisible();
  await page.getByRole("button",{name:"Start synthetic profile"}).click();

  await expect(page).toHaveURL(/\/profile\/[^/]+\/section\/identity$/);
  const profileId=page.url().match(/\/profile\/([^/]+)\//)![1];

  await page.getByLabel("Main driver ID").fill("DRV-SYN-SP4-G14");
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button",{name:"Save & continue"}).click();

  await expect(page).toHaveURL("/profile/"+profileId+"/review");
  await expect(page.locator("#validation-pass")).toContainText("PASS");
  await page.getByRole("button",{name:"Continue to confirmation"}).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("I confirm").check();
  await page.getByRole("button",{name:"Confirm & lock profile"}).click();

  await expect(page).toHaveURL(new RegExp("127\\.0\\.0\\.1:3001/admin/profiles/"+profileId));
  await expect(page.locator("#status-v1")).toHaveText("LOCKED");

  await page.goto("http://127.0.0.1:3000/profile/"+profileId+"/optimisation");
  await page.getByRole("button",{name:"Open Sprint 4 customer objective journey"}).click();

  await expect(page.getByRole("heading",{name:"Customer objective optimisation"})).toBeVisible();
  await expect(page.locator("#sp4-source-version")).toContainText("LOCKED");
  await page.getByLabel("Customer objective").selectOption("LOWEST_ANNUAL_PREMIUM");
  await page.getByRole("button",{name:"Save customer objective"}).click();
  await expect(page.locator("#sp4-objective-state")).toContainText("LOWEST_ANNUAL_PREMIUM");

  await page.getByRole("button",{name:"Generate multi-scenario exploration"}).click();
  await expect(page.locator("#sp4-scenario-count")).toHaveText("4");
  await expect(page.locator(".sp4-scenario")).toHaveCount(4);
  const scenarios=await page.locator("#sp4-scenarios").innerText();
  expect(scenarios).toContain("voluntary_excess = 250");
  expect(scenarios).toContain("voluntary_excess = 500");
  expect(scenarios).toContain("telematics_preference = false");
  expect(scenarios).toContain("telematics_preference = true");
  expect(scenarios).not.toContain("[F]");
  expect(scenarios).not.toContain("annual_mileage");
  for(const marker of scenarios.match(/\[[A-Z]\]/g)??[])expect(marker).toBe("[O]");

  await page.getByRole("button",{name:"Run synthetic market routes"}).click();
  const routeCount=Number(await page.locator("#sp4-route-count").innerText());
  const quoteCount=Number(await page.locator("#sp4-quote-count").innerText());
  expect(routeCount).toBeGreaterThan(1);
  expect(quoteCount).toBeGreaterThan(4);

  await page.getByRole("button",{name:"Build recommendation"}).click();
  await expect(page.locator("#sp4-recommendation-set-id")).not.toHaveText("");
  await expect(page.locator("#sp4-recommendation-objective")).toHaveText("LOWEST_ANNUAL_PREMIUM");
  await expect(page.locator("#sp4-recommendation-rule")).not.toHaveText("");
  await expect(page.locator("#sp4-surfaced-quote")).not.toHaveText("");
  await expect(page.locator("#sp4-explanation-rule")).not.toHaveText("");
  await expect(page.locator("#sp4-ranked-quotes li").first()).toContainText("#1");
  await expect(page.locator("#sp4-control-explanations")).toContainText("customer can change: true");
  await expect(page.getByText("No policy purchase, payment or binding is available in this prototype.")).toBeVisible();

  await page.getByRole("button",{name:"Select recommended quote & run final integrity"}).click();
  await expect(page).toHaveURL(new RegExp("/profile/"+profileId+"/completion\\?selectionId="));
  await expect(page.getByRole("heading",{name:"Prototype completion"})).toBeVisible();
  await expect(page.locator("#selection-status")).toHaveText("ACCEPTED");
  await expect(page.locator("#final-integrity-outcome")).toHaveText("PASS");
  await expect(page.locator("#completion-status")).toHaveText("PROTOTYPE_JOURNEY_COMPLETE");
  await expect(page.locator("#completion-profile-state")).toHaveText("LOCKED");
  await expect(page.locator("#completion-comparison-state")).toHaveText("DIRECTLY_COMPARABLE");
  await expect(page.locator("#completion-data-classification")).toHaveText("SYNTHETIC");
  await expect(page.locator("#completion-live-provider")).toHaveText("DISABLED");
  await expect(page.getByText("No policy purchase, payment or binding has occurred.")).toBeVisible();
});
