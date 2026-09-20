import {test,expect} from "@playwright/test";

test("BUILD-001A customer shell, semantics and synthetic dashboard fixture",async({page})=>{
  await page.goto("/dashboard");
  await expect(page.getByRole("heading",{name:"Customer dashboard"})).toBeVisible();
  await expect(page.getByText("SYNTHETIC — Test data and test quotations only. No live insurer connection.")).toBeVisible();

  const customerNav=page.getByRole("navigation",{name:"Customer navigation"});
  await expect(customerNav.getByRole("link",{name:"Dashboard"})).toHaveAttribute("aria-current","page");
  await expect(customerNav.getByRole("link",{name:"Your Profile"})).toBeVisible();
  await expect(customerNav.getByRole("link",{name:"Your Results"})).toBeVisible();

  await expect(page.getByText("No active case",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Start synthetic profile"})).toBeVisible();
});

test("BUILD-001A responsive navigation is keyboard-addressable",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/dashboard");
  const open=page.getByRole("button",{name:"Open navigation"});
  await expect(open).toBeVisible();
  await open.focus();
  await page.keyboard.press("Enter");

  const nav=page.getByRole("navigation",{name:"Customer navigation"});
  await expect(nav.getByRole("link",{name:"Your Profile"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Close navigation"})).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
});

test("BUILD-001A admin shell has separate navigation and synthetic identity",async({page})=>{
  await page.goto("http://127.0.0.1:3001/");
  await expect(page.getByRole("heading",{name:"Admin dashboard"})).toBeVisible();
  await expect(page.getByText("SYNTHETIC — Test data and test quotations only. No live insurer connection.")).toBeVisible();

  const adminNav=page.getByRole("navigation",{name:"Admin navigation"});
  await expect(adminNav.getByRole("link",{name:"Cases"})).toBeVisible();
  await expect(adminNav.getByRole("link",{name:"Audit & Trace"})).toBeVisible();
  await expect(adminNav.getByRole("link",{name:"Providers"})).toBeVisible();
  await expect(adminNav.getByRole("link",{name:"Certification"})).toBeVisible();
  await expect(adminNav.getByRole("link",{name:"Your Profile"})).toHaveCount(0);
});
