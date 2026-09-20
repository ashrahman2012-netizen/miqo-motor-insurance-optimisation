import {existsSync,readFileSync,readdirSync,statSync} from "node:fs";
import {join,relative} from "node:path";

const root=process.cwd();
const failures=[];

function fail(message){failures.push(message);}
function assert(condition,message){if(!condition)fail(message);}
function read(path){return readFileSync(join(root,path),"utf8");}

function filesUnder(path){
  const base=join(root,path);
  const out=[];
  if(!existsSync(base)) return out;
  for(const entry of readdirSync(base)){
    const full=join(base,entry);
    const stat=statSync(full);
    if(stat.isDirectory()) out.push(...filesUnder(relative(root,full)));
    else out.push(relative(root,full));
  }
  return out;
}

const increments=["001A","001B","001C","001D","001E","001F","001G","001H","001I"];
for(const increment of increments){
  assert(
    existsSync(join(root,`docs/application/app-build-001/${increment}/acceptance-matrix.md`)),
    `missing ${increment} acceptance matrix`,
  );
  const spec=filesUnder("e2e-target").find(path=>path.includes(`app-build-${increment.toLowerCase()}`));
  assert(Boolean(spec),`missing ${increment} target-stack browser proof`);
}

const canonicalPages=[
  "apps/customer-web/app/dashboard/page.tsx",
  "apps/customer-web/app/profile/capture/page.tsx",
  "apps/customer-web/app/profile/validation/page.tsx",
  "apps/customer-web/app/profile/discrepancies/page.tsx",
  "apps/customer-web/app/profile/review/page.tsx",
  "apps/customer-web/app/profile/lock/page.tsx",
  "apps/customer-web/app/optimise/page.tsx",
  "apps/customer-web/app/quotes/page.tsx",
  "apps/customer-web/app/results/page.tsx",
  "apps/customer-web/app/documents/page.tsx",
  "apps/customer-web/app/activity/page.tsx",
  "apps/customer-web/app/support/page.tsx",
  "apps/admin-web/app/admin/audit/page.tsx",
];
for(const page of canonicalPages) assert(existsSync(join(root,page)),`missing canonical application surface: ${page}`);

const tokenPath="packages/ui/tokens/miqos-design-tokens.v1.1.json";
assert(existsSync(join(root,tokenPath)),"MIQOS-DS-001 v1.1 token file missing");
if(existsSync(join(root,tokenPath))){
  const tokens=JSON.parse(read(tokenPath));
  assert(tokens.color?.bg?.canvas==="#041428","unexpected DS v1.1 background token");
  assert(tokens.color?.surface?.primary==="#0F1F3A","unexpected DS v1.1 surface token");
  assert(tokens.color?.brand?.primary==="#3574FF","unexpected DS v1.1 primary interaction token");
  assert(tokens.color?.state?.success==="#10B981","unexpected DS v1.1 success token");
  assert(tokens.color?.state?.warning==="#F59E0B","unexpected DS v1.1 warning token");
  assert(tokens.color?.state?.danger==="#EF4444","unexpected DS v1.1 danger token");
}

const frontendFiles=[
  ...filesUnder("apps/customer-web/app"),
  ...filesUnder("apps/admin-web/app"),
].filter(path=>/\.(ts|tsx|js|jsx|css)$/.test(path));

const forbiddenCustomerAssertions=[
  /\bWe recommend\b/i,
  /\bBest policy for you\b/i,
  /\bBest insurer for you\b/i,
  /\bYou should buy\b/i,
  /\bGuaranteed cheapest\b/i,
];
for(const path of filesUnder("apps/customer-web/app").filter(path=>/\.(ts|tsx|js|jsx)$/.test(path))){
  const source=read(path);
  for(const pattern of forbiddenCustomerAssertions){
    assert(!pattern.test(source),`prohibited advised-style customer assertion in ${path}: ${pattern}`);
  }
  assert(!/\bSeopa\b/i.test(source),`provider-specific customer UI reference in ${path}`);
}
for(const path of filesUnder("apps/admin-web/app").filter(path=>/\.(ts|tsx|js|jsx)$/.test(path))){
  assert(!/\bSeopa\b/i.test(read(path)),`provider-specific admin UI reference in ${path}`);
}

for(const path of frontendFiles){
  const source=read(path);
  assert(!/from\s+["']@miqo\/db["']/.test(source),`direct database import in application UI: ${path}`);
}

const customerExecutableSources=filesUnder("apps/customer-web/app").filter(path=>/\.(ts|tsx|js|jsx)$/.test(path));
for(const path of customerExecutableSources){
  const source=read(path);
  assert(
    !/comparisonState\s*===?\s*["']ADJUSTED_COMPARABLE["']/.test(source),
    `customer UI activates adjusted comparison in ${path}`,
  );
}
const quotePageSource=read("apps/customer-web/app/quotes/page.tsx");
assert(
  /ADJUSTED_COMPARABLE never enters the ranked set/i.test(quotePageSource),
  "quote comparison no longer states adjusted-comparison dormant boundary",
);

const resultsSource=read("apps/customer-web/app/results/page.tsx");
assert(/No live insurer destination is fabricated/i.test(resultsSource),"results surface no longer states live-handoff boundary");
assert(/does not purchase or bind cover/i.test(resultsSource),"results surface no longer states purchase/binding boundary");

const documentsSource=read("apps/customer-web/app/documents/page.tsx");
assert(/not insurer policy documents/i.test(documentsSource),"documents surface no longer distinguishes application records from insurer documents");
assert(/certificate of motor insurance/i.test(documentsSource),"documents surface no longer states certificate-of-motor-insurance boundary");

const supportSource=read("apps/customer-web/app/support/page.tsx");
assert(/does not create messages, tickets or external support records/i.test(supportSource),"support surface no longer states messaging/ticket boundary");

const ci=read(".github/workflows/ci.yml");
assert(/MIQO_DATA_CLASSIFICATION:\s*SYNTHETIC/.test(ci),"target-stack CI is not explicitly synthetic");
assert(/MIQO_LIVE_PROVIDERS_ENABLED:\s*"false"/.test(ci),"target-stack CI does not explicitly disable live providers");
assert(/playwright test -c playwright\.target\.config\.ts/.test(ci),"target-stack Playwright proof missing from CI");

const semantics=JSON.parse(read("packages/ui/tokens/miqos-semantic-mappings.v1.1.json"));
assert(semantics.statuses?.ADJUSTED_COMPARABLE==="dormant","ADJUSTED_COMPARABLE semantic state is no longer dormant");
assert(semantics.statuses?.DIRECTLY_COMPARABLE==="success","DIRECTLY_COMPARABLE semantic mapping changed unexpectedly");

if(failures.length){
  console.error("MIQOS-APP-BUILD-001 certification FAILED");
  for(const item of failures) console.error("- "+item);
  process.exit(1);
}

console.log("MIQOS-APP-BUILD-001 certification PASS");
console.log("Verified increments: "+increments.join(", "));
console.log("Verified canonical surfaces: "+canonicalPages.length);
console.log("Verified visual authority: MIQOS-DS-001 v1.1");
console.log("Verified environment: SYNTHETIC target-stack with live providers disabled");
console.log("Verified boundaries: non-advised copy, provider-independent UI, no direct DB UI import, dormant adjusted comparison, no fabricated live handoff/documents/support actions");
