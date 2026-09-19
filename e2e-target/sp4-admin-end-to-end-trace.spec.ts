import {test,expect} from "@playwright/test";

test("SP4-G15 admin reconstructs objective through final integrity",async({page})=>{
  await page.goto("/prototype");
  await page.getByRole("button",{name:"Start synthetic profile"}).click();
  await expect(page).toHaveURL(/\/profile\/[^/]+\/section\/identity$/);
  const profileId=page.url().match(/\/profile\/([^/]+)\//)![1];

  await page.getByLabel("Main driver ID").fill("DRV-SYN-SP4-G15");
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button",{name:"Save & continue"}).click();
  await page.getByRole("button",{name:"Continue to confirmation"}).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("I confirm").check();
  await page.getByRole("button",{name:"Confirm & lock profile"}).click();

  await expect(page).toHaveURL(new RegExp("127\\.0\\.0\\.1:3001/admin/profiles/"+profileId));
  await page.goto("http://127.0.0.1:3000/profile/"+profileId+"/recommendations");

  await page.getByLabel("Customer objective").selectOption("LOWEST_ANNUAL_PREMIUM");
  await page.getByRole("button",{name:"Save customer objective"}).click();
  await page.getByRole("button",{name:"Generate multi-scenario exploration"}).click();
  await expect(page.locator("#sp4-scenario-count")).toHaveText("4");
  await page.getByRole("button",{name:"Run synthetic market routes"}).click();
  await expect(page.locator("#sp4-quote-count")).not.toHaveText("0");
  await page.getByRole("button",{name:"Build recommendation"}).click();

  const recommendationSetId=await page.locator("#sp4-recommendation-set-id").innerText();
  const surfacedQuoteId=await page.locator("#sp4-surfaced-quote").innerText();
  expect(recommendationSetId).toBeTruthy();
  expect(surfacedQuoteId).toBeTruthy();

  await page.getByRole("button",{name:"Select recommended quote & run final integrity"}).click();
  await expect(page).toHaveURL(new RegExp("/profile/"+profileId+"/completion\\?selectionId="));
  const selectionId=new URL(page.url()).searchParams.get("selectionId")!;
  await expect(page.locator("#final-integrity-outcome")).toHaveText("PASS");

  await page.goto("http://127.0.0.1:3001/admin/selections/"+selectionId+"/sp4-trace");
  await expect(page.getByRole("heading",{name:"Sprint 4 end-to-end optimisation trace"})).toBeVisible();
  await expect(page.locator("#sp4-trace-profile-id")).toHaveText(profileId);
  await expect(page.locator("#sp4-trace-profile-status")).toContainText("LOCKED");
  await expect(page.locator("#sp4-trace-objective-id")).toContainText("LOWEST_ANNUAL_PREMIUM");
  await expect(page.locator("#sp4-trace-objective-version")).toHaveText("sp4-objectives-v1");
  await expect(page.locator("#sp4-trace-catalogue-version")).toHaveText("sp4-catalogue-v2.1");
  await expect(page.locator("#sp4-trace-generation-version")).toHaveText("sp4-gen-v1");
  await expect(page.locator("#sp4-trace-scenario-count")).toHaveText("4");
  await expect(page.locator(".sp4-trace-scenario")).toHaveCount(4);

  const scenarioText=await page.locator("#sp4-trace-scenarios").innerText();
  expect(scenarioText).not.toContain("[F]");
  expect(scenarioText).not.toContain("annual_mileage");
  for(const marker of scenarioText.match(/\[[A-Z]\]/g)??[])expect(marker).toBe("[O]");

  const quoteCount=Number(await page.locator("#sp4-trace-quote-count").innerText());
  expect(quoteCount).toBeGreaterThan(4);
  await expect(page.locator(".sp4-trace-route-quote").first()).toContainText("MarketRoute");
  await expect(page.locator(".sp4-trace-route-quote").first()).toContainText("QuoteRequest");
  await expect(page.locator(".sp4-trace-route-quote").first()).toContainText("RawProviderResponse");
  await expect(page.locator(".sp4-trace-route-quote").first()).toContainText("NormalisedQuote");
  await expect(page.locator(".sp4-normalisation-version").first()).not.toHaveText("");

  await expect(page.locator("#sp4-trace-recommendation-set-id")).toContainText(recommendationSetId);
  await expect(page.locator("#sp4-trace-surfaced-quote")).toHaveText(surfacedQuoteId);
  await expect(page.locator("#sp4-trace-recommendation-rule")).toHaveText("sp4-recommendation-v1");
  await expect(page.locator("#sp4-trace-explanation-rule")).toHaveText("sp4-explainability-v1");
  await expect(page.locator("#sp4-trace-selection-id")).toHaveText(selectionId);
  await expect(page.locator("#sp4-trace-link-audit-id")).not.toHaveText("");
  await expect(page.locator("#sp4-trace-final-integrity")).toHaveText("PASS");
  await expect(page.locator("#sp4-trace-integrity-rule")).not.toHaveText("");
  await expect(page.locator("#sp4-trace-completion")).toHaveText("PROTOTYPE_JOURNEY_COMPLETE");

  const traceText=await page.locator("#sp4-admin-trace").innerText();
  for(const expected of [
    "CustomerObjective",
    "Scenario exploration",
    "MarketRoute",
    "QuoteRequest",
    "RawProviderResponse",
    "NormalisedQuote",
    "RecommendationSet",
    "Selection",
    "Final Integrity",
    "sp4-objectives-v1",
    "sp4-catalogue-v2.1",
    "sp4-gen-v1",
    "sp4-recommendation-v1",
    "sp4-explainability-v1",
  ])expect(traceText).toContain(expected);
});
