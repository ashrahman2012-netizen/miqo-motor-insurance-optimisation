import {test,expect,APIResponse} from "@playwright/test";

function expectSecurityHeaders(response:APIResponse){
  const headers=response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-resource-policy"]).toBe("same-site");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
}

test("DB-G10.3 customer and admin applications emit hardened browser headers",async({request})=>{
  const customer=await request.get("http://127.0.0.1:3000/prototype");
  expect(customer.ok()).toBeTruthy();
  expectSecurityHeaders(customer);
  const admin=await request.get("http://127.0.0.1:3001/");
  expect(admin.ok()).toBeTruthy();
  expectSecurityHeaders(admin);
});
