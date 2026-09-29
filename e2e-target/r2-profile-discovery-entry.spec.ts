import {test,expect} from "@playwright/test";

const API="http://127.0.0.1:4000";
const CORS={
  "access-control-allow-origin":"http://127.0.0.1:3000",
  "access-control-allow-credentials":"true",
  "content-type":"application/json",
};

function profile(profileId:string,status:string,versionNo=1,createdAt="2026-09-29T14:12:23.000Z"){
  return {
    profileId,
    createdAt,
    currentVersion:{
      versionId:"RPV-"+profileId,
      versionNo,
      status,
      lockedAt:status==="LOCKED"?"2026-09-29T14:20:00.000Z":null,
    },
  };
}

async function mockDiscovery(page:any,items:any[],options:{status?:number;postProfileId?:string}={}){
  let posts=0;
  await page.route(API+"/profiles",async(route:any)=>{
    const method=route.request().method();
    if(method==="GET"){
      const status=options.status??200;
      await route.fulfill({
        status,
        headers:CORS,
        body:JSON.stringify(status===200?{items}:{error:"discovery_failed"}),
      });
      return;
    }
    if(method==="POST"){
      posts+=1;
      await route.fulfill({
        status:201,
        headers:CORS,
        body:JSON.stringify({
          profileId:options.postProfileId??"PRO-SYN-R2-NEW",
          versionId:"RPV-SYN-R2-NEW",
        }),
      });
      return;
    }
    await route.fallback();
  });
  return ()=>posts;
}

test("R2-C01-001 zero profiles renders explicit new-profile state without creating on load",async({page})=>{
  const posts=await mockDiscovery(page,[]);
  await page.goto("/");

  await expect(page.getByText("Checking for retained synthetic profiles…")).toHaveCount(0);
  await expect(page.getByText("No retained synthetic profiles found.")).toBeVisible();
  await expect(page.getByRole("button",{name:"Start new synthetic profile"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Resume profile"})).toHaveCount(0);
  expect(posts()).toBe(0);
});

test("R2-C01-002 one DRAFT profile exposes explicit resume and preserves explicit new-profile action",async({page})=>{
  const item=profile("PRO-SYN-R2-DRAFT","DRAFT",2);
  const posts=await mockDiscovery(page,[item]);
  await page.goto("/");

  await expect(page.getByRole("heading",{name:"Retained synthetic profile"})).toBeVisible();
  await expect(page.locator('[data-profile-id="PRO-SYN-R2-DRAFT"]')).toContainText("Version: 2");
  await expect(page.locator('[data-profile-id="PRO-SYN-R2-DRAFT"]')).toContainText("Status: DRAFT");
  await expect(page.getByRole("button",{name:"Start new synthetic profile"})).toBeVisible();
  expect(posts()).toBe(0);

  await page.getByRole("button",{name:"Resume profile"}).click();
  await expect(page).toHaveURL(/\/profile\/PRO-SYN-R2-DRAFT\/section\/identity$/);
});

test("R2-C01-003 one LOCKED profile resumes to the existing optimisation boundary",async({page})=>{
  const item=profile("PRO-SYN-R2-LOCKED","LOCKED");
  await mockDiscovery(page,[item]);
  await page.goto("/");

  await expect(page.locator('[data-profile-id="PRO-SYN-R2-LOCKED"]')).toContainText("Status: LOCKED");
  await page.getByRole("button",{name:"Resume profile"}).click();
  await expect(page).toHaveURL(/\/profile\/PRO-SYN-R2-LOCKED\/optimisation$/);
});

test("R2-C01-004 multiple profiles preserve discovery order and fail closed for SUPERSEDED latest state",async({page})=>{
  const items=[
    profile("PRO-SYN-R2-NEWEST","LOCKED",3,"2026-09-29T15:00:00.000Z"),
    profile("PRO-SYN-R2-OLDER","SUPERSEDED",2,"2026-09-28T15:00:00.000Z"),
  ];
  await mockDiscovery(page,items);
  await page.goto("/");

  await expect(page.getByRole("heading",{name:"Retained synthetic profiles"})).toBeVisible();

  const cards=page.locator("[data-profile-id]");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("PRO-SYN-R2-NEWEST");
  await expect(cards.nth(1)).toContainText("PRO-SYN-R2-OLDER");

  const unavailable=cards.nth(1).getByRole("button",{name:"Resume unavailable"});
  await expect(unavailable).toBeDisabled();
});

test("R2-C01-005 discovery failure is explicit and does not create a profile",async({page})=>{
  const posts=await mockDiscovery(page,[],{status:503});
  await page.goto("/");

  await expect(page.getByText("Unable to discover retained profiles.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Start new synthetic profile"})).toBeVisible();
  expect(posts()).toBe(0);
});
