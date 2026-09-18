const classification = process.env.MIQO_DATA_CLASSIFICATION ?? "SYNTHETIC";
const live = (process.env.MIQO_LIVE_PROVIDERS_ENABLED ?? "false").toLowerCase();

const providerUrls = Object.entries(process.env)
  .filter(([key]) => key.startsWith("MOCK_PROVIDER_") && key.endsWith("_URL"))
  .map(([key, value]) => [key, value]);

const failures = [];

if (classification !== "SYNTHETIC") {
  failures.push(`MIQO_DATA_CLASSIFICATION must be SYNTHETIC, got ${classification}`);
}

if (["1", "true", "yes", "on"].includes(live)) {
  failures.push("MIQO_LIVE_PROVIDERS_ENABLED must remain false for the prototype");
}

for (const [key, value] of providerUrls) {
  if (!value) continue;
  let url;
  try { url = new URL(value); } catch { failures.push(`${key} is not a valid URL`); continue; }
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!local) failures.push(`${key} must target localhost/mock infrastructure, got ${url.hostname}`);
}

if (failures.length) {
  console.error("MIQO prototype boundary verification FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("MIQO prototype boundary verification PASS");
