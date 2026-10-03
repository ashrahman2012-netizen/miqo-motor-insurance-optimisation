import {test,expect} from "@playwright/test";
import {scanAccessibility,expectVisibleKeyboardFocus} from "./db-g10-a11y-scanner";

const API="http://127.0.0.1:4000";
const CORS={
  "access-control-allow-origin":"http://127.0.0.1:3000",
  "access-control-allow-credentials":"true",
  "content-type":"application/json",
};

test("R3-SHELL-001 customer shell preserves routing, boundary and route-derived journey context",async({page})=>{
  await page.route(API+"/profiles",async route=>{
    if(route.request().method()==="GET"){
      await route.fulfill({status:200,headers:CORS,body:JSON.stringify({items:[]})});
      return;
    }
    if(route.request().method()==="POST"){
      await route.fulfill({
        status:201,
        headers:CORS,
        body:JSON.stringify({profileId:"PRO-SYN-R3-SHELL",versionId:"RPV-SYN-R3-SHELL"}),
      });
      return;
    }
    await route.fallback();
  });
  await page.route(API+"/profiles/PRO-SYN-R3-SHELL",async route=>{
    await route.fulfill({
      status:200,
      headers:CORS,
      body:JSON.stringify({
        profileId:"PRO-SYN-R3-SHELL",
        versions:[{
          versionId:"RPV-SYN-R3-SHELL",
          versionNo:1,
          status:"DRAFT",
          values:[],
        }],
      }),
    });
  });

  await page.goto("/");
  await expect(page.getByText("SYNTHETIC DATA ONLY",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Build one truthful profile. Change choices, not facts."})).toBeVisible();
  await expect(page.getByLabel("Journey context")).toContainText("Profile home");
  await expect(page.getByRole("link",{name:"Customer home"})).toHaveAttribute("aria-current","page");

  const adminHref=await page.getByRole("link",{name:"Synthetic admin"}).getAttribute("href");
  expect(adminHref).toContain("127.0.0.1:3001");
  expect(adminHref).toContain("syntheticAdmin=");

  await scanAccessibility(page);
  await expectVisibleKeyboardFocus(page);

  await page.getByRole("button",{name:"Start new synthetic profile"}).click();
  await expect(page).toHaveURL(/\/profile\/PRO-SYN-R3-SHELL\/section\/identity$/);
  await expect(page.getByLabel("Journey context")).toContainText("Profile facts");
  await expect(page.getByText("SYNTHETIC DATA ONLY",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Minimum factual questionnaire"})).toBeVisible();
});

test("R3-SHELL-002 retained technical ID stays traceable but is not the primary heading",async({page})=>{
  await page.route(API+"/profiles",async route=>{
    await route.fulfill({
      status:200,
      headers:CORS,
      body:JSON.stringify({
        items:[{
          profileId:"PRO-SYN-R3-TRACE",
          createdAt:"2026-10-03T10:00:00.000Z",
          currentVersion:{
            versionId:"RPV-SYN-R3-TRACE",
            versionNo:1,
            status:"DRAFT",
            lockedAt:null,
          },
        }],
      }),
    });
  });

  await page.goto("/");
  const card=page.locator('[data-profile-id="PRO-SYN-R3-TRACE"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText("PRO-SYN-R3-TRACE");
  await expect(page.getByRole("heading",{level:1})).not.toContainText("PRO-SYN-R3-TRACE");
  await expect(page.getByText("SYNTHETIC DATA ONLY",{exact:true})).toBeVisible();
});

test("R3-SHELL-003 error and disabled states remain accessible inside the shell",async({page})=>{
  await page.route(API+"/profiles",async route=>{
    await route.fulfill({status:503,headers:CORS,body:JSON.stringify({error:"discovery_failed"})});
  });

  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveText("Unable to discover retained profiles.");
  await expect(page.getByText("SYNTHETIC DATA ONLY",{exact:true})).toBeVisible();
  await scanAccessibility(page);

  await page.unroute(API+"/profiles");
  await page.route(API+"/profiles",async route=>{
    await route.fulfill({
      status:200,
      headers:CORS,
      body:JSON.stringify({
        items:[{
          profileId:"PRO-SYN-R3-SUPERSEDED",
          createdAt:"2026-10-03T10:00:00.000Z",
          currentVersion:{
            versionId:"RPV-SYN-R3-SUPERSEDED",
            versionNo:2,
            status:"SUPERSEDED",
            lockedAt:null,
          },
        }],
      }),
    });
  });
  await page.reload();
  await expect(page.getByRole("button",{name:"Resume unavailable"})).toBeDisabled();
  await expect(page.getByText("SYNTHETIC DATA ONLY",{exact:true})).toBeVisible();
});

test("R3-SHELL-004 admin shell is distinct and exposes a safe customer return path",async({page})=>{
  await page.goto("http://127.0.0.1:3001/");
  await expect(page.getByText("SYNTHETIC ADMINISTRATION",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"MIQOS administration"})).toBeVisible();
  await expect(page.getByLabel("Administration context")).toContainText("Administration home");

  const customerHref=await page.getByRole("link",{name:"Customer surface"}).getAttribute("href");
  expect(customerHref).toMatch(/^http:\/\/127\.0\.0\.1:3000\/?$/);

  await scanAccessibility(page);
  await expectVisibleKeyboardFocus(page);
});
