import {beforeAll, describe, expect, it} from "vitest";
import {createHash} from "node:crypto";
import type {
  AdminAuditEventApi,
  AdminDiscrepancyApi,
  ProfileDiscrepancyApi,
  ProfileSnapshotApi,
  ProfileVersionApi,
} from "@miqo/application-adapters";
import {loadDesktopAuditProof} from "../src/services/admin-audit";
import {loadDesktopDecisionTrace} from "../src/services/admin-decision-trace";
import {
  loadDesktopProfileEvidence,
  loadDesktopProfileVersionEvidence,
} from "../src/services/admin-profile";
import type {
  DesktopAdminProfileAuditEvidence,
  DesktopApiTransport,
  DesktopHealth,
  DesktopRuntimeProfile,
} from "../src/services/contracts";

const apiUrl = process.env.MIQO_G8_API_URL?.replace(/\/$/, "") ?? null;
const idpUrl = process.env.MIQO_G8_IDP_URL?.replace(/\/$/, "") ?? null;
let adminAccessToken = "";

function pkceChallenge(verifier:string){
  return createHash("sha256").update(verifier).digest("base64url");
}

async function obtainSyntheticAdminToken(loginHint?:string){
  if(!idpUrl)throw new Error("MIQO_G8_IDP_URL_REQUIRED");
  const verifier=("miqos-g8-pkce-verifier-"+(loginHint??"full")+"-").padEnd(64,"x");
  const redirectUri="http://127.0.0.1:59999/oauth/callback";
  const authorize=new URL(idpUrl+"/authorize");
  authorize.searchParams.set("response_type","code");
  authorize.searchParams.set("client_id","miqos-admin-test-public");
  authorize.searchParams.set("redirect_uri",redirectUri);
  authorize.searchParams.set("scope","openid profile");
  authorize.searchParams.set("state","g8-state");
  authorize.searchParams.set("nonce","g8-nonce");
  authorize.searchParams.set("code_challenge",pkceChallenge(verifier));
  authorize.searchParams.set("code_challenge_method","S256");
  authorize.searchParams.set("audience","miqos-api-test");
  if(loginHint)authorize.searchParams.set("login_hint",loginHint);
  const authResponse=await fetch(authorize,{redirect:"manual"});
  expect(authResponse.status).toBe(302);
  const location=authResponse.headers.get("location");
  if(!location)throw new Error("G8_IDP_REDIRECT_MISSING");
  const code=new URL(location).searchParams.get("code");
  if(!code)throw new Error("G8_IDP_CODE_MISSING");
  const tokenResponse=await fetch(idpUrl+"/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({
    grant_type:"authorization_code",code,redirect_uri:redirectUri,client_id:"miqos-admin-test-public",code_verifier:verifier,
  })});
  expect(tokenResponse.ok).toBe(true);
  const token=await tokenResponse.json() as {access_token:string};
  return token.access_token;
}

class FastifyProofTransport implements DesktopApiTransport {
  constructor(private readonly baseUrl: string, private readonly token = adminAccessToken) {}
  private admin(path:string){return fetch(this.baseUrl+path,{headers:{authorization:"Bearer "+this.token}});}

  async getRuntimeProfile(): Promise<DesktopRuntimeProfile> {
    return {
      schemaVersion: "miqos-desktop-config-v1",
      profileId: "test-synthetic",
      deploymentStage: "TEST",
      applicationEnvironment: "SYNTHETIC",
      apiService: "127.0.0.1:4000",
      apiAudience: "miqos-api-test",
      authenticationMode: "NATIVE_OIDC_PKCE",
      buildVersion: "0.1.0",
      buildId: "g8-api-integration",
      sourceCommit: "integration-test",
      deploymentProfileSha256: "integration-test",
    };
  }

  async getHealth(): Promise<DesktopHealth> {
    const response = await fetch(this.baseUrl + "/health");
    if (!response.ok) throw new Error("G8_HEALTH_REQUEST_FAILED");
    return response.json() as Promise<DesktopHealth>;
  }

  async loadAdminProfile(profileId: string) {
    const response = await this.admin("/desktop-admin/profiles/" + encodeURIComponent(profileId));
    if (!response.ok) throw new Error(`DESKTOP_API_STATUS_${response.status}`);
    return response.json() as Promise<ProfileSnapshotApi & {discrepancies: ReadonlyArray<ProfileDiscrepancyApi>}>;
  }

  async loadAdminProfileVersion(versionId: string) {
    const response = await this.admin("/desktop-admin/profile-versions/" + encodeURIComponent(versionId));
    if (!response.ok) throw new Error(`DESKTOP_API_STATUS_${response.status}`);
    return response.json() as Promise<{profileId: string; version: ProfileVersionApi}>;
  }

  async loadAdminProfileAudit(profileId: string): Promise<DesktopAdminProfileAuditEvidence> {
    const [auditResponse, discrepancyResponse] = await Promise.all([
      this.admin("/desktop-admin/audit?profileId=" + encodeURIComponent(profileId)),
      this.admin("/desktop-admin/profiles/" + encodeURIComponent(profileId) + "/discrepancies"),
    ]);
    if (!auditResponse.ok || !discrepancyResponse.ok) {
      throw new Error("G8_ADMIN_AUDIT_REQUEST_FAILED");
    }
    const audit = await auditResponse.json() as {items: ReadonlyArray<AdminAuditEventApi>};
    const discrepancies = await discrepancyResponse.json() as {items: ReadonlyArray<AdminDiscrepancyApi>};
    return {auditEvents: audit.items, discrepancies: discrepancies.items};
  }

  async loadAdminSelectionTrace(selectionId: string) {
    const traceResponse = await fetch(
      this.baseUrl + "/desktop-admin/selections/" + encodeURIComponent(selectionId) + "/sp4-trace",
      {headers:{authorization:"Bearer "+this.token}},
    );
    if (!traceResponse.ok) throw new Error(`DESKTOP_API_STATUS_${traceResponse.status}`);
    const trace = await traceResponse.json() as import("@miqo/application-adapters").AdminSprint4TraceApi;
    const surfaced = trace.marketRouteQuotes.find(
      item => item.normalisedQuote.normalisedQuoteId === trace.recommendation.surfacedNormalisedQuoteId,
    );
    const [auditResponse, discrepancyResponse, rawResponse] = await Promise.all([
      this.admin("/desktop-admin/audit?profileId=" + encodeURIComponent(trace.profile.profileId)),
      this.admin("/desktop-admin/profiles/" + encodeURIComponent(trace.profile.profileId) + "/discrepancies"),
      surfaced
        ? this.admin("/desktop-admin/quote-requests/" + encodeURIComponent(surfaced.quoteRequest.quoteRequestId) + "/raw-response")
        : Promise.resolve(null),
    ]);
    if (!auditResponse.ok || !discrepancyResponse.ok || (rawResponse && !rawResponse.ok)) {
      throw new Error("G8_ADMIN_SELECTION_TRACE_REQUEST_FAILED");
    }
    const audit = await auditResponse.json() as {items: ReadonlyArray<AdminAuditEventApi>};
    const discrepancies = await discrepancyResponse.json() as {items: ReadonlyArray<AdminDiscrepancyApi>};
    return {
      trace,
      auditEvents: audit.items,
      discrepancies: discrepancies.items,
      rawProviderResponse: rawResponse
        ? await rawResponse.json() as import("@miqo/application-adapters").AdminRawProviderResponseApi
        : null,
    };
  }
}

describe.skipIf(!apiUrl||!idpUrl)("G8 Desktop application service against certified Fastify API", () => {
  const baseUrl = apiUrl as string;
  beforeAll(async()=>{adminAccessToken=await obtainSyntheticAdminToken();});

  it("enforces 401 and 403 on Desktop-protected Admin resources", async()=>{
    const anonymous=await fetch(baseUrl+"/desktop-admin/session");
    expect(anonymous.status).toBe(401);
    const limited=await obtainSyntheticAdminToken("limited");
    const denied=await fetch(baseUrl+"/desktop-admin/audit?profileId=PRO-SYN-001",{headers:{authorization:"Bearer "+limited}});
    expect(denied.status).toBe(403);
    expect((await fetch(baseUrl+"/desktop-admin/selections/SEL-SYN-MISSING/trace")).status).toBe(401);
    expect((await fetch(baseUrl+"/desktop-admin/selections/SEL-SYN-MISSING/trace",{headers:{authorization:"Bearer "+limited}})).status).toBe(403);
    expect((await fetch(baseUrl+"/desktop-admin/quote-requests/QREQ-SYN-MISSING/raw-response")).status).toBe(401);
    expect((await fetch(baseUrl+"/desktop-admin/quote-requests/QREQ-SYN-MISSING/raw-response",{headers:{authorization:"Bearer "+limited}})).status).toBe(403);
    for(const legacy of [
      "/admin/profiles/PRO-SYN-001",
      "/admin/profile-versions/RPV-SYN-001",
      "/admin/audit?profileId=PRO-SYN-001",
      "/admin/selections/SEL-SYN-MISSING/trace",
      "/admin/selections/SEL-SYN-MISSING/sp4-trace",
      "/quote-requests/QREQ-SYN-MISSING/raw-response",
    ])expect((await fetch(baseUrl+legacy)).status).toBe(404);
    const session=await fetch(baseUrl+"/desktop-admin/session",{headers:{authorization:"Bearer "+adminAccessToken}});
    expect(session.status).toBe(200);
    const descriptor=await session.json() as {permissions:string[];environment:string};
    expect(descriptor.environment).toBe("SYNTHETIC");
    expect(descriptor.permissions).toContain("miqos.admin.trace.read");
    expect(descriptor.permissions).toContain("miqos.admin.raw-evidence.read");
  });

  it("returns validated trace/request correlation and safe API build identity", async () => {
    const traceId = "0123456789abcdef0123456789abcdef";
    const response = await fetch(baseUrl + "/health", {
      headers: {traceparent: "00-" + traceId + "-0123456789abcdef-01"},
    });
    expect(response.ok).toBe(true);
    expect(response.headers.get("x-miqo-trace-id")).toBe(traceId);
    expect(response.headers.get("x-miqo-request-id")).toBeTruthy();
    expect(response.headers.get("x-miqo-api-version")).toBe("0.1.0");
    expect(response.headers.get("x-miqo-api-build-id")).toBeTruthy();
    expect(response.headers.get("x-miqo-api-source-commit")).toBeTruthy();
  });


  it("attests SYNTHETIC and composes the existing Admin Audit ViewModel", async () => {
    const created = await fetch(baseUrl + "/profiles", {method: "POST"});
    expect(created.status).toBe(201);
    const profile = await created.json() as {profileId: string};

    const proof = await loadDesktopAuditProof(
      new FastifyProofTransport(baseUrl),
      profile.profileId,
    );

    expect(proof.runtime.applicationEnvironment).toBe("SYNTHETIC");
    expect(proof.health).toEqual({
      status: "ok",
      dataClassification: "SYNTHETIC",
      liveProvidersEnabled: false,
    });
    expect(proof.viewModel.filters.profileId).toBe(profile.profileId);
    expect(proof.viewModel.timeline?.events.some(
      event => event.eventType === "profile_created",
    )).toBe(true);
    expect(proof.viewModel.pageState.state).toBe("PARTIAL");
  });

  it("loads exact profile and profile-version evidence through existing Admin reads", async () => {
    const created = await fetch(baseUrl + "/profiles", {method: "POST"});
    expect(created.status).toBe(201);
    const profile = await created.json() as {profileId: string; versionId: string};
    const transport = new FastifyProofTransport(baseUrl);

    const profileEvidence = await loadDesktopProfileEvidence(transport, profile.profileId);
    expect(profileEvidence.profileId).toBe(profile.profileId);
    expect(profileEvidence.version.versionId).toBe(profile.versionId);
    expect(profileEvidence.fields).toEqual([]);

    const versionEvidence = await loadDesktopProfileVersionEvidence(transport, profile.versionId);
    expect(versionEvidence.profileId).toBe(profile.profileId);
    expect(versionEvidence.version.versionId).toBe(profile.versionId);
  });

  it("loads complete persisted SP4 selection lineage without Desktop decision recomputation", async () => {
    async function json(path: string, init?: RequestInit) {
      const response = await fetch(baseUrl + path, init);
      const body = await response.json();
      expect(response.ok).toBe(true);
      return body as any;
    }

    const profile = await json("/profiles", {method: "POST"});
    for (const [fieldId, value] of [
      ["main_driver_id", "DRV-DESKTOP-G5"],
      ["annual_mileage", 8000],
      ["licence_held_since", "2018-04-16"],
    ] as const) {
      await json("/profile-versions/" + profile.versionId + "/facts/" + fieldId, {
        method: "PUT",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({value}),
      });
    }
    await json("/profiles/" + profile.profileId + "/lock", {method: "POST"});

    const objectiveResponse = await json(
      "/profile-versions/" + profile.versionId + "/customer-objectives",
      {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({objectiveId: "LOWEST_ANNUAL_PREMIUM"}),
      },
    );
    const objective = objectiveResponse.item;
    const exploration = await json(
      "/customer-objectives/" + objective.customerObjectiveId + "/scenario-explorations",
      {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          choices: {
            voluntary_excess: [250, 500],
            payment_structure: ["ANNUAL", "MONTHLY"],
          },
        }),
      },
    );
    const base = "/customer-objectives/" + objective.customerObjectiveId
      + "/scenario-explorations/" + encodeURIComponent(exploration.explorationFingerprint);
    await json(base + "/market-route-quotes", {method: "POST"});
    const recommendation = await json(base + "/recommendations", {method: "POST"});
    const shortlist = await json(
      "/profile-versions/" + profile.versionId + "/shortlists",
      {method: "POST"},
    );
    const selection = await json("/shortlists/" + shortlist.shortlistId + "/selections", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        normalisedQuoteId: recommendation.surfacedNormalisedQuoteId,
        recommendationSetId: recommendation.recommendationSetId,
      }),
    });

    const proof = await loadDesktopDecisionTrace(
      new FastifyProofTransport(baseUrl),
      selection.selectionId,
    );
    expect(proof.trace.profile.profileId).toBe(profile.profileId);
    expect(proof.trace.selection.selectionId).toBe(selection.selectionId);
    expect(proof.trace.recommendation.recommendationSetId).toBe(recommendation.recommendationSetId);
    expect(proof.trace.marketRouteQuotes.length).toBeGreaterThan(4);
    expect(proof.viewModel.normalisedEvidence?.normalisedQuoteId)
      .toBe(recommendation.surfacedNormalisedQuoteId);
    expect(proof.viewModel.rawProviderResponse?.quoteRequestId)
      .toBe(proof.viewModel.currentArtefact?.quoteRequestId);
    expect(
      proof.viewModel.integrityQueue.find(item => item.category === "FINAL_INTEGRITY")?.status.code,
    ).toBe("PASS");
  });

  it("fails closed when server environment attestation contradicts TEST/SYNTHETIC", async () => {
    const transport: DesktopApiTransport = {
      getRuntimeProfile: () => new FastifyProofTransport(baseUrl).getRuntimeProfile(),
      getHealth: async () => ({
        status: "ok",
        dataClassification: "PRODUCTION",
        liveProvidersEnabled: true,
      }),
      loadAdminProfile: async () => ({versions: [], audit: [], discrepancies: []}),
      loadAdminProfileVersion: async () => { throw new Error("NOT_USED"); },
      loadAdminProfileAudit: async () => ({auditEvents: [], discrepancies: []}),
      loadAdminSelectionTrace: async () => { throw new Error("NOT_USED"); },
    };

    await expect(loadDesktopAuditProof(transport, "PRO-SYN-001"))
      .rejects.toThrow("DESKTOP_ENVIRONMENT_ATTESTATION_FAILED");
  });
});
