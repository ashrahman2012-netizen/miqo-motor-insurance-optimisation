import {useCallback, useEffect, useMemo, useState} from "react";
import {
  AppShell,
  ApplicationEnvironmentProvider,
  Button,
  Card,
  ContentGrid,
  DefinitionList,
  PageHeader,
  PageState,
  StatusBadge,
  createApplicationEnvironmentVM,
  type NavigationItem,
} from "@miqo/ui";
import type {DesktopAuditProof, DesktopRuntimeProfile} from "../services/contracts";
import {loadDesktopAuditProof} from "../services/admin-audit";
import {TauriDesktopApiTransport} from "../services/tauri-transport";

const PROFILE_ID = "PRO-SYN-001";
const navigation: ReadonlyArray<NavigationItem> = [
  {label: "Audit proof", href: "/admin/audit-proof"},
  {label: "System", href: "/admin/system"},
];

function shortCommit(value: string) {
  return value.length > 12 ? value.slice(0, 12) : value;
}

export function ScaffoldRoute() {
  const transport = useMemo(() => new TauriDesktopApiTransport(), []);
  const [runtime, setRuntime] = useState<DesktopRuntimeProfile | null>(null);
  const [proof, setProof] = useState<DesktopAuditProof | null>(null);
  const [state, setState] = useState<"LOADING" | "SUCCESS" | "ERROR">("LOADING");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("LOADING");
    setError(null);
    setProof(null);
    try {
      const next = await loadDesktopAuditProof(transport, PROFILE_ID);
      setRuntime(next.runtime);
      setProof(next);
      setState("SUCCESS");
    } catch (reason) {
      try {
        setRuntime(await transport.getRuntimeProfile());
      } catch {
        setRuntime(null);
      }
      setError(reason instanceof Error ? reason.message : "DESKTOP_PROOF_FAILED");
      setState("ERROR");
    }
  }, [transport]);

  useEffect(() => {
    void load();
  }, [load]);

  const environment = runtime?.applicationEnvironment === "SYNTHETIC"
    ? createApplicationEnvironmentVM("SYNTHETIC")
    : null;

  return (
    <ApplicationEnvironmentProvider value={environment}>
      <AppShell
        applicationLabel="MIQOS"
        contextLabel="Windows Admin"
        navigation={navigation}
        navigationLabel="MIQOS Admin skeleton navigation"
        currentPath="/admin/audit-proof"
      >
        <PageHeader
          eyebrow="G8 Desktop Skeleton Proof"
          title="MIQOS Admin"
          description="Installed TEST/SYNTHETIC proof of the Tauri host, shared MIQOS presentation semantics, native API boundary and existing Admin Audit ViewModel adapter."
          actions={<StatusBadge status={state === "SUCCESS" ? "READY" : state === "ERROR" ? "BLOCKED" : "PENDING"} label={state} />}
        />

        {runtime ? (
          <ContentGrid columns={2}>
            <Card emphasis>
              <h2>Runtime identity</h2>
              <DefinitionList
                compact
                items={[
                  {label: "Package stage", value: runtime.deploymentStage},
                  {label: "Environment", value: runtime.applicationEnvironment},
                  {label: "Version", value: runtime.buildVersion},
                  {label: "Build", value: runtime.buildId},
                  {label: "Source", value: shortCommit(runtime.sourceCommit)},
                  {label: "Profile", value: runtime.profileId},
                  {label: "Profile SHA-256", value: runtime.deploymentProfileSha256},
                  {label: "Authentication", value: runtime.authenticationMode},
                ]}
              />
            </Card>
            <Card>
              <h2>Native boundary</h2>
              <DefinitionList
                compact
                items={[
                  {label: "API service", value: runtime.apiService},
                  {label: "API audience", value: runtime.apiAudience},
                  {label: "Transport", value: "Tauri allow-listed commands"},
                  {label: "Business access", value: "READ-ONLY"},
                ]}
              />
            </Card>
          </ContentGrid>
        ) : null}

        <section className="desktop-proof-section" aria-live="polite">
          {state === "LOADING" ? (
            <PageState state="LOADING" title="Checking synthetic Admin service" message="Validating the packaged environment profile and API classification." />
          ) : null}

          {state === "ERROR" ? (
            <Card>
              <PageState
                state="ERROR"
                title="Synthetic Admin API unavailable"
                message="The Desktop shell remains available, but authoritative Admin evidence is not presented because the controlled API/environment proof failed."
              />
              <p className="desktop-proof-reference">Reference: {error ?? "DESKTOP_PROOF_FAILED"}</p>
              <Button type="button" onClick={() => void load()}>Retry safe read</Button>
            </Card>
          ) : null}

          {state === "SUCCESS" && proof ? (
            <ContentGrid columns={2}>
              <Card emphasis>
                <h2>Environment attestation</h2>
                <DefinitionList
                  compact
                  items={[
                    {label: "API health", value: proof.health.status},
                    {label: "Classification", value: proof.health.dataClassification},
                    {label: "Live providers", value: String(proof.health.liveProvidersEnabled)},
                    {label: "Result", value: <StatusBadge status="PASS" label="ATTESTED" />},
                  ]}
                />
              </Card>
              <Card data-testid="desktop-audit-proof">
                <h2>Representative Admin Audit read</h2>
                <DefinitionList
                  compact
                  items={[
                    {label: "Profile", value: proof.viewModel.filters.profileId ?? "—"},
                    {label: "Page state", value: proof.viewModel.pageState.state},
                    {label: "Audit events", value: String(proof.viewModel.timeline?.events.length ?? 0)},
                    {label: "First event", value: proof.viewModel.timeline?.events[0]?.summary ?? "—"},
                  ]}
                />
              </Card>
            </ContentGrid>
          ) : null}
        </section>
      </AppShell>
    </ApplicationEnvironmentProvider>
  );
}
