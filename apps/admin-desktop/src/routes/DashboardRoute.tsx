import {useCallback, useEffect, useState} from "react";
import {
  Button,
  Card,
  ContentGrid,
  DefinitionList,
  PageHeader,
  PageState,
  StatusBadge,
} from "@miqo/ui";
import type {DesktopApiTransport, DesktopAuditProof, DesktopRuntimeProfile} from "../services/contracts";
import {loadDesktopAuditProof} from "../services/admin-audit";

const REPRESENTATIVE_PROFILE_ID = "PRO-SYN-001";

function shortCommit(value: string) {
  return value.length > 12 ? value.slice(0, 12) : value;
}

export function DashboardRoute({
  transport,
  runtime,
}: {
  transport: DesktopApiTransport;
  runtime: DesktopRuntimeProfile | null;
}) {
  const [proof, setProof] = useState<DesktopAuditProof | null>(null);
  const [state, setState] = useState<"LOADING" | "SUCCESS" | "ERROR">("LOADING");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("LOADING");
    setError(null);
    setProof(null);
    try {
      const next = await loadDesktopAuditProof(transport, REPRESENTATIVE_PROFILE_ID);
      setProof(next);
      setState("SUCCESS");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setState("ERROR");
    }
  }, [transport]);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveRuntime = runtime ?? proof?.runtime ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Windows Admin"
        title="Admin Operations Overview"
        description="A read-first operational workspace for authoritative MIQOS evidence. Customer journey actions, unsupported aggregates and business-state mutations are deliberately absent."
        actions={
          <StatusBadge
            status={state === "SUCCESS" ? "READY" : state === "ERROR" ? "BLOCKED" : "PENDING"}
            label={state === "SUCCESS" ? "FOUNDATION READY" : state}
          />
        }
      />

      <ContentGrid columns={3}>
        <Card emphasis>
          <h2>Environment</h2>
          <p>Deployment identity remains package-controlled and visible throughout the Admin application.</p>
          {effectiveRuntime ? (
            <StatusBadge
              status="SYNTHETIC"
              label={`${effectiveRuntime.deploymentStage} · ${effectiveRuntime.applicationEnvironment}`}
            />
          ) : (
            <StatusBadge status="NOT_AUTHORISED" label="ENVIRONMENT UNKNOWN" />
          )}
        </Card>
        <Card>
          <h2>Authority</h2>
          <p>Desktop renders and orchestrates approved evidence. Fastify/domain/PostgreSQL remain authoritative.</p>
          <StatusBadge status="INFORMATIONAL" label="READ-FIRST ADMIN" />
        </Card>
        <Card>
          <h2>Build</h2>
          {effectiveRuntime ? (
            <DefinitionList
              compact
              items={[
                {label: "Version", value: effectiveRuntime.buildVersion},
                {label: "Build ID", value: effectiveRuntime.buildId},
                {label: "Source", value: shortCommit(effectiveRuntime.sourceCommit)},
              ]}
            />
          ) : (
            <p>Runtime identity is resolving.</p>
          )}
        </Card>
      </ContentGrid>

      <section className="desktop-foundation-proof" aria-live="polite">
        {state === "LOADING" ? (
          <PageState
            state="LOADING"
            title="Checking synthetic Admin service"
            message="Validating the inherited TEST/SYNTHETIC environment proof and representative safe read."
          />
        ) : null}

        {state === "ERROR" ? (
          <Card>
            <PageState
              state="ERROR"
              title="Synthetic Admin API unavailable"
              message="The Desktop shell remains available, but authoritative Admin evidence is not presented because the controlled API/environment proof failed."
            />
            <p className="desktop-technical-reference">Reference: {error ?? "DESKTOP_PROOF_FAILED"}</p>
            <Button type="button" onClick={() => void load()}>Retry safe read</Button>
          </Card>
        ) : null}

        {state === "SUCCESS" && proof ? (
          <>
            <div className="desktop-section-heading">
              <div>
                <p className="desktop-kicker">Inherited executable proof</p>
                <h2>Representative Admin evidence</h2>
              </div>
              <StatusBadge status="PASS" label="ATTESTED" />
            </div>
            <ContentGrid columns={2}>
              <Card emphasis>
                <h3>Environment attestation</h3>
                <DefinitionList
                  compact
                  items={[
                    {label: "API health", value: proof.health.status},
                    {label: "Classification", value: proof.health.dataClassification},
                    {label: "Live providers", value: String(proof.health.liveProvidersEnabled)},
                    {label: "Profile", value: REPRESENTATIVE_PROFILE_ID},
                  ]}
                />
              </Card>
              <Card data-testid="desktop-audit-proof">
                <h3>Representative audit read</h3>
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
          </>
        ) : null}
      </section>
    </>
  );
}
