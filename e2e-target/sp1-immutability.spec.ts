import {test,expect} from "@playwright/test";
const API="http://127.0.0.1:4000";
test("SP1-IMMUTABILITY-001 target stack",async({page,request})=>{
 await page.goto("/prototype"); await expect(page.getByText("MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY")).toBeVisible(); await page.getByRole("button",{name:"Start synthetic profile"}).click();
 await expect(page).toHaveURL(/\/profile\/[^/]+\/section\/identity$/); const profileId=page.url().match(/\/profile\/([^/]+)\//)![1];
 await page.getByLabel("Main driver ID").fill("DRV-SYN-001"); await page.getByLabel("Annual mileage").fill("8000"); await page.getByLabel("Licence held since").fill("2018-04-16"); await page.getByRole("button",{name:"Save & continue"}).click();
 await expect(page).toHaveURL(`/profile/${profileId}/review`); await expect(page.locator("#validation-pass")).toContainText("PASS"); await page.getByRole("button",{name:"Continue to confirmation"}).click(); await page.getByLabel("I confirm").check(); await page.getByRole("button",{name:"Confirm & lock profile"}).click();
 await expect(page).toHaveURL(new RegExp(`127\.0\.0\.1:3001/admin/profiles/${profileId}`)); await expect(page.locator("#status-v1")).toHaveText("LOCKED"); await expect(page.locator("#annual_mileage-v1")).toHaveText("8000");
 await page.goto(`http://127.0.0.1:3000/profile/${profileId}/section/identity`); await expect(page.getByLabel("Annual mileage")).toHaveAttribute("readonly",""); await expect(page.getByRole("button",{name:"Correct factual information"})).toBeVisible();
 const snap=await (await request.get(`${API}/profiles/${profileId}/snapshot`)).json(); const v1=snap.versions[0].versionId;
 expect((await request.put(`${API}/profile-versions/${v1}/facts/annual_mileage`,{data:{value:6000}})).status()).toBe(409);
 expect((await request.post(`${API}/profile-versions/${v1}/scenarios`,{data:{deltas:[{fieldId:"annual_mileage",controlClass:"F",value:6000}]}})).status()).toBe(422);
 expect((await request.post(`${API}/profiles/${profileId}/corrections`,{data:{fieldId:"annual_mileage",value:6000}})).status()).toBe(201);
 expect((await (await request.post(`${API}/profiles/${profileId}/validate`)).json()).valid).toBe(true); expect((await (await request.post(`${API}/profiles/${profileId}/lock`)).json()).versionNo).toBe(2);
 const final=await (await request.get(`${API}/profiles/${profileId}/snapshot`)).json(); const mileage=(v:any)=>v.values.find((x:any)=>x.fieldId==="annual_mileage").value; expect(final.versions[0].status).toBe("SUPERSEDED");expect(mileage(final.versions[0])).toBe(8000);expect(final.versions[1].status).toBe("LOCKED");expect(mileage(final.versions[1])).toBe(6000);
});
