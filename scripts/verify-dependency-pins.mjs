import { readFileSync } from "node:fs";

const checks = [
  ["package.json", "devDependencies", ["@playwright/test", "typescript", "vitest"]],
  ["apps/customer-web/package.json", "dependencies", ["@miqo/ui", "next", "react", "react-dom"]],
  ["apps/customer-web/package.json", "devDependencies", ["typescript", "@types/node", "@types/react"]],
  ["apps/admin-web/package.json", "dependencies", ["@miqo/ui", "next", "react", "react-dom"]],
  ["packages/ui/package.json", "dependencies", ["@miqo/application-contracts"]],
  ["packages/ui/package.json", "peerDependencies", ["react", "react-dom"]],
  ["packages/ui/package.json", "devDependencies", ["typescript", "vitest", "@types/react"]],
  ["apps/api/package.json", "dependencies", ["fastify", "zod", "@fastify/cors"]],
  ["packages/db/package.json", "dependencies", ["drizzle-orm", "pg"]],
  ["packages/db/package.json", "devDependencies", ["drizzle-kit"]]
];

const exact = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const failures = [];
for (const [file, section, names] of checks) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  for (const name of names) {
    const version = pkg[section]?.[name];
    if (!version || !exact.test(version)) failures.push(`${file} ${section}.${name} is not exact-pinned: ${version ?? "missing"}`);
  }
}
const root = JSON.parse(readFileSync("package.json", "utf8"));
if (root.engines?.node !== "22.16.0") failures.push(`Node runtime not pinned to 22.16.0`);
if (root.packageManager !== "npm@10.9.2") failures.push(`npm runtime not pinned to 10.9.2`);

if (failures.length) {
  console.error("Dependency pin verification FAILED");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Dependency pin verification PASS");
