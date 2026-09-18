import { test, expect } from "@playwright/test";

test("Sprint 1 persists, locks, rejects mutation, and versions corrections", async ({ page, request }) => {
  await page.goto("/prototype");
  await expect(page.getByText("MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY")).toBeVisible();
  await page.getByRole("button", { name: "Start synthetic profile" }).click();

  await expect(page).toHaveURL(/\/profile\/[^/]+\/section\/identity$/);
  const profileId = page.url().match(/\/profile\/([^/]+)\//)![1];

  await page.getByLabel("Main driver ID").fill("DRV-SYN-001");
  await page.getByLabel("Annual mileage").fill("8000");
  await page.getByLabel("Licence held since").fill("2018-04-16");
  await page.getByRole("button", { name: "Save & continue" }).click();

  await expect(page).toHaveURL(`/profile/${profileId}/review`);
  await expect(page.locator("#validation-pass")).toContainText("PASS");
  await page.getByRole("button", { name: "Continue to confirmation" }).click();

  await page.getByLabel(/I confirm/).check();
  await page.getByRole("button", { name: "Confirm & lock profile" }).click();
  await expect(page).toHaveURL(`/admin/profiles/${profileId}`);
  await expect(page.locator("#status-v1")).toHaveText("LOCKED");
  await expect(page.locator("#annual_mileage-v1")).toHaveText("8000");

  await page.goto(`/profile/${profileId}/section/identity`);
  await expect(page.getByLabel("Annual mileage")).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Correct factual information" })).toBeVisible();

  const snapshot = await (await request.get(`/api/profiles/${profileId}/snapshot`)).json();
  const v1 = snapshot.versions[0].versionId;

  const directMutation = await request.put(`/api/profile-versions/${v1}/facts/annual_mileage`, { data: { value: 5000 } });
  expect(directMutation.status()).toBe(409);

  const scenarioMutation = await request.post(`/api/profile-versions/${v1}/scenarios`, {
    data: { deltas: [{ fieldId: "annual_mileage", controlClass: "F", value: 5000 }] }
  });
  expect(scenarioMutation.status()).toBe(422);

  const correction = await request.post(`/api/profiles/${profileId}/corrections`, {
    data: { fieldId: "annual_mileage", value: 9000 }
  });
  expect(correction.status()).toBe(201);

  const validation = await request.post(`/api/profiles/${profileId}/validate`);
  expect((await validation.json()).valid).toBe(true);
  const lockV2 = await request.post(`/api/profiles/${profileId}/lock`);
  expect((await lockV2.json()).versionNo).toBe(2);

  const finalSnapshot = await (await request.get(`/api/profiles/${profileId}/snapshot`)).json();
  const mileage = (version: any) => version.values.find((v: any) => v.fieldId === "annual_mileage").value;
  expect(finalSnapshot.versions[0].status).toBe("SUPERSEDED");
  expect(mileage(finalSnapshot.versions[0])).toBe(8000);
  expect(finalSnapshot.versions[1].status).toBe("LOCKED");
  expect(mileage(finalSnapshot.versions[1])).toBe(9000);
  expect(finalSnapshot.audit.some((e: any) => e.event_type === "profile_correction_started")).toBe(true);
});
