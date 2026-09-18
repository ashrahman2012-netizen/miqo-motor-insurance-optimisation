import {test,expect} from "@playwright/test";

test("SP3-END-TO-END-TRACE-001 C-01 through C-15 plus A-07 and A-08",async({page})=>{
  await page.goto("/prototype");
  await expect(page.getByText("MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY")).toBeVisible();
  await page.getByRole("button",{name:"Start synthetic profile"}).click();

  await expect(page).toHaveURL(/\/profile\/[^/]+\/section\/identity$/);
  const profileId=page.url().match(/\/profile\/([^/]+)\//)![1];

  await page.getByLabel("Main driver ID").fill("DRV-SYN-SP3-E2E");
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button",{name:"Save & continue"}).click();

  await expect(page).toHaveURL("/profile/"+profileId+"/review");
  await expect(page.locator("#validation-pass")).toContainText("PASS");
  await page.getByRole("button",{name:"Continue to confirmation"}).click();
  await page.getByLabel("I confirm").check();
  await page.getByRole("button",{name:"Confirm & lock profile"}).click();

  await expect(page).toHaveURL(new RegExp("127\\.0\\.0\\.1:3001/admin/profiles/"+profileId));
  await expect(page.locator("#status-v1")).toHaveText("LOCKED");
  await expect(page.locator("#annual_mileage-v1")).toHaveText("8000");

  await page.goto("http://127.0.0.1:3000/profile/"+profileId+"/section/identity");
  await page.getByRole("button",{name:"Optimise quote choices"}).click();
  await expect(page.getByRole("heading",{name:"Optimisation preferences"})).toBeVisible();

  await page.getByLabel("Voluntary excess").selectOption("500");
  await page.getByLabel("Payment structure").selectOption("ANNUAL");
  await page.getByLabel("Policy start date").fill("2026-10-01");
  await page.getByLabel("Telematics preference").check();
  await page.getByRole("button",{name:"Save preferences & preview scenarios"}).click();

  await expect(page.getByRole("heading",{name:"Scenario preview"})).toBeVisible();
  await page.getByRole("button",{name:"Generate scenario preview"}).click();
  await expect(page.locator("#scenario-deltas")).toContainText("voluntary_excess = 500 [O]");
  await expect(page.locator("#scenario-deltas")).not.toContainText("annual_mileage");
  await page.getByRole("button",{name:"Run synthetic quote"}).click();

  await expect(page.getByRole("heading",{name:"Quote comparison"})).toBeVisible();
  await expect(page.locator("#comparison-state")).toHaveText("DIRECTLY_COMPARABLE");
  await expect(page.locator("#annual-premium")).toHaveText("£701.40");
  await expect(page.locator("#compulsory-excess")).toHaveText("£350.00");
  await expect(page.locator("#voluntary-excess")).toHaveText("£500.00");
  await expect(page.locator("#comparison-boundary")).toContainText("No universal effective-cost calculation");
  await expect(page.locator("#shortlist-id")).not.toHaveText("");
  await expect(page.locator("#lowest-premium-marker")).toContainText("this quote");

  await page.getByRole("button",{name:"Select this quote"}).click();
  await expect(page).toHaveURL(new RegExp("/profile/"+profileId+"/completion\\?selectionId="));
  const selectionId=new URL(page.url()).searchParams.get("selectionId")!;
  expect(selectionId).toBeTruthy();

  await expect(page.getByRole("heading",{name:"Prototype completion"})).toBeVisible();
  await expect(page.locator("#selection-status")).toHaveText("ACCEPTED");
  await expect(page.locator("#final-integrity-outcome")).toHaveText("PASS");
  await expect(page.locator("#completion-status")).toHaveText("PROTOTYPE_JOURNEY_COMPLETE");
  await expect(page.locator("#completion-profile-state")).toHaveText("LOCKED");
  await expect(page.locator("#completion-provider")).toHaveText("MOCK-PROVIDER-001");
  await expect(page.locator("#completion-premium")).toHaveText("£701.40");
  await expect(page.locator("#completion-comparison-state")).toHaveText("DIRECTLY_COMPARABLE");
  await expect(page.locator("#completion-data-classification")).toHaveText("SYNTHETIC");
  await expect(page.locator("#completion-live-provider")).toHaveText("DISABLED");
  await expect(page.getByText("No policy purchase, payment or binding has occurred.")).toBeVisible();

  await page.goto("http://127.0.0.1:3001/admin/selections/"+selectionId+"/trace");
  await expect(page.getByRole("heading",{name:"End-to-end quote trace"})).toBeVisible();
  await expect(page.locator("#trace-selection-id")).toHaveText(selectionId);
  await expect(page.locator("#trace-integrity-outcome")).toHaveText("PASS");
  await expect(page.locator("#trace-completion-status")).toHaveText("PROTOTYPE_JOURNEY_COMPLETE");
  const traceText=await page.locator("#end-to-end-trace").innerText();
  for(const expected of [
    profileId,
    "RiskProfileVersion",
    "voluntary_excess = 500",
    "[O]",
    "QuoteRequest",
    "MOCK-PROVIDER-001",
    "RawProviderResponse",
    "sp2-normaliser-v1",
    "Shortlist",
    "Selection",
    "Final Integrity",
  ])expect(traceText).toContain(expected);

  await page.getByRole("button",{name:"Open audit history"}).click();
  await expect(page.getByRole("heading",{name:"Audit history"})).toBeVisible();
  await expect(page.locator("#audit-history")).toContainText("profile_created");

  const auditText=await page.locator("#audit-history").innerText();
  const ordered=[
    "profile_created",
    "fact_saved",
    "profile_validated",
    "profile_locked",
    "optimisation_preferences_saved",
    "scenario_generated",
    "pre_quote_integrity_passed",
    "quote_request_prepared",
    "raw_provider_response_captured",
    "provider_response_normalised",
    "comparison_generated",
    "shortlist_created",
    "quote_selected",
    "final_integrity_passed",
    "prototype_completed",
  ];
  let previous=-1;
  for(const eventType of ordered){
    const current=auditText.indexOf(eventType);
    expect(current,eventType+" missing from ordered audit").toBeGreaterThan(previous);
    previous=current;
  }
});
