import {test,expect,type Page} from "@playwright/test";
const API="http://127.0.0.1:4000";
const ADMIN="http://127.0.0.1:3001";

async function prepare(request:any){
  const created=await request.post(API+"/profiles");
  expect(created.status()).toBe(201);
  const profile=await created.json();

  for(const [fieldId,value] of [["main_driver_id","DRV-001I"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    expect((await request.put(API+"/profile-versions/"+profile.versionId+"/facts/"+fieldId,{data:{value}})).status()).toBe(200);
  }
  expect((await request.post(API+"/profiles/"+profile.profileId+"/validate")).status()).toBe(200);
  expect((await request.post(API+"/profiles/"+profile.profileId+"/lock")).status()).toBe(200);

  const objectiveResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/customer-objectives",{data:{objectiveId:"LOWEST_ANNUAL_PREMIUM"}});
  expect([200,201]).toContain(objectiveResponse.status());
  const objective=(await objectiveResponse.json()).item;

  const explorationResponse=await request.post(API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",{data:{choices:{
    voluntary_excess:[250,500],payment_structure:["ANNUAL"],telematics_preference:[false,true],
  }}});
  expect([200,201]).toContain(explorationResponse.status());
  const exploration=await explorationResponse.json();

  const base=API+"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint;
  expect([200,201]).toContain((await request.post(base+"/market-route-quotes")).status());

  const recommendationResponse=await request.post(base+"/recommendations");
  expect([200,201]).toContain(recommendationResponse.status());
  const recommendation=await recommendationResponse.json();

  const shortlistResponse=await request.post(API+"/profile-versions/"+profile.versionId+"/shortlists");
  expect([200,201]).toContain(shortlistResponse.status());
  const shortlist=await shortlistResponse.json();

  const selectionResponse=await request.post(API+"/shortlists/"+shortlist.shortlistId+"/selections",{data:{
    normalisedQuoteId:recommendation.surfacedNormalisedQuoteId,
    recommendationSetId:recommendation.recommendationSetId,
  }});
  expect(selectionResponse.status()).toBe(201);
  const selection=await selectionResponse.json();

  return {profile,objective,exploration,recommendation,selection};
}

function query(state:any){
  return "profileId="+encodeURIComponent(state.profile.profileId)
    +"&customerObjectiveId="+encodeURIComponent(state.objective.customerObjectiveId)
    +"&explorationFingerprint="+encodeURIComponent(state.exploration.explorationFingerprint);
}

async function expectNoViewportOverflow(page:Page){
  const result=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    bodyWidth:document.body.scrollWidth,
    innerWidth:window.innerWidth,
  }));
  expect(result.scrollWidth,"document must not horizontally overflow the viewport").toBeLessThanOrEqual(result.clientWidth+1);
  expect(result.bodyWidth,"body must not horizontally overflow the viewport").toBeLessThanOrEqual(result.innerWidth+1);
}

async function expectAccessibleFrame(page:Page,heading:string){
  await expect(page.getByRole("heading",{name:heading,level:1})).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expectNoViewportOverflow(page);
}

test("BUILD-001I canonical customer surfaces remain usable at desktop and mobile widths",async({page,request})=>{
  test.setTimeout(150000);
  const state=await prepare(request);
  const q=query(state);
  const routes=[
    ["/dashboard?"+q,"Customer Dashboard"],
    ["/profile/review?profileId="+encodeURIComponent(state.profile.profileId),"Profile Review & Lock"],
    ["/optimise?"+q,"Objective & Scenario Explorer"],
    ["/quotes?"+q,"Quote Comparison"],
    ["/results?"+q,"Why This Surfaced"],
    ["/documents?profileId="+encodeURIComponent(state.profile.profileId),"Documents & Records"],
    ["/activity?profileId="+encodeURIComponent(state.profile.profileId),"Your Activity"],
    ["/support?profileId="+encodeURIComponent(state.profile.profileId),"Help & Support"],
  ] as const;

  for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
    await page.setViewportSize(viewport);
    for(const [url,heading] of routes){
      await page.goto(url);
      await expectAccessibleFrame(page,heading);
      if(viewport.width<=1023){
        await expect(page.getByRole("button",{name:"Open navigation"})).toBeVisible();
        await expect(page.locator(".miqos-sidebar")).toBeHidden();
      }else{
        await expect(page.getByRole("button",{name:"Open navigation"})).toBeHidden();
        await expect(page.locator(".miqos-sidebar")).toBeVisible();
      }
    }
  }
});

test("BUILD-001I dense comparison and admin trace adapt through laptop tablet and 320px mobile",async({page,request})=>{
  test.setTimeout(120000);
  const state=await prepare(request);
  const q=query(state);

  for(const viewport of [{width:1024,height:900},{width:768,height:900},{width:320,height:800}]){
    await page.setViewportSize(viewport);

    await page.goto("/quotes?"+q);
    await expectAccessibleFrame(page,"Quote Comparison");
    if(viewport.width<=700){
      await expect(page.getByTestId("mobile-quote-comparison")).toBeVisible();
      await expect(page.getByRole("region",{name:"Ranked eligible quote comparison table"})).toBeHidden();
    }else{
      await expect(page.getByRole("region",{name:"Ranked eligible quote comparison table"})).toBeVisible();
    }

    await page.goto("/results?"+q);
    await expectAccessibleFrame(page,"Why This Surfaced");

    await page.goto(ADMIN+"/admin/audit?selectionId="+encodeURIComponent(state.selection.selectionId));
    await expectAccessibleFrame(page,"Audit & Trace Console");
    await expect(page.getByRole("region",{name:"Raw provider response payload"})).toBeVisible();
  }

  await page.setViewportSize({width:375,height:812});
  await page.goto("/quotes?"+q);
  const cards=page.getByTestId("mobile-quote-comparison");
  await expect(cards).toBeVisible();
  const selectButtons=cards.getByRole("button",{name:/Select .* for comparison/});
  await expect(selectButtons).toHaveCount(8);
  await selectButtons.nth(0).click();
  await selectButtons.nth(1).click();
  await expect(page.getByRole("region",{name:"Selected quote comparison"})).toContainText("2/2 selected");
  await expectNoViewportOverflow(page);
});

test("BUILD-001I keyboard, focus, labels and reduced-motion baseline",async({page,request})=>{
  test.setTimeout(90000);
  const state=await prepare(request);
  const q=query(state);

  await page.setViewportSize({width:375,height:812});
  await page.goto("/dashboard?"+q);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link",{name:"Skip to main content"})).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const menu=page.getByRole("button",{name:"Open navigation"});
  await menu.click();
  const dialog=page.getByRole("dialog",{name:"Mobile navigation"});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button",{name:"Close navigation"})).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link",{name:"Settings"})).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button",{name:"Close navigation"})).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();

  await page.setViewportSize({width:1440,height:1000});
  await page.goto("/quotes?"+q);
  await expect(page.locator('nav[aria-label="Customer navigation"] a[aria-current="page"]')).toHaveText("Quotes");
  await expect(page.getByRole("region",{name:"Ranked eligible quote comparison table"}).locator("caption")).toContainText("Ranked eligible quote comparison");

  await page.goto("/optimise?"+q);
  await expect(page.getByRole("region",{name:"Generated scenario evidence table"}).locator("caption")).toContainText("Generated scenario evidence");

  await page.goto(ADMIN+"/admin/audit?selectionId="+encodeURIComponent(state.selection.selectionId));
  const labelCheck=await page.evaluate(()=>{
    const controls=Array.from(document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>("input:not([type=hidden]),select,textarea"));
    const unlabelled=controls.filter(control=>{
      if(control.getAttribute("aria-label")||control.getAttribute("aria-labelledby"))return false;
      if(control.id&&document.querySelector('label[for="'+CSS.escape(control.id)+'"]'))return false;
      return !control.closest("label");
    }).map(control=>control.getAttribute("name")||control.tagName);
    const unnamedButtons=Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter(button=>
      !button.getAttribute("aria-label")&&!button.getAttribute("aria-labelledby")&&!button.textContent?.trim()
    ).length;
    const duplicateIds=Array.from(document.querySelectorAll<HTMLElement>("[id]"))
      .map(element=>element.id)
      .filter((id,index,all)=>all.indexOf(id)!==index);
    return {unlabelled,unnamedButtons,duplicateIds};
  });
  expect(labelCheck.unlabelled).toEqual([]);
  expect(labelCheck.unnamedButtons).toBe(0);
  expect(labelCheck.duplicateIds).toEqual([]);

  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/dashboard?"+q);
  const transitionDuration=await page.locator(".miqos-sidebar-nav__link").first().evaluate(element=>getComputedStyle(element).transitionDuration);
  expect(transitionDuration).not.toBe("0.14s");
});
