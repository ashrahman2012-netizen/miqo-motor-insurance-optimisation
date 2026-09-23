import {useEffect, useState} from "react";
import {Card, ContentGrid, DefinitionList, PageHeader, PageState, StatusBadge} from "@miqo/ui";
import type {
  DesktopDiagnostics,
  DesktopRuntimeProfile,
  DesktopSupportSnapshot,
  DesktopSupportTransport,
} from "../services/contracts";

function shortCommit(value: string) {
  return value.length > 12 ? value.slice(0, 12) : value;
}

function safeValue(value: string | null) {
  return value ?? "—";
}

export function SystemRoute({
  runtime,
  transport,
}: {
  runtime: DesktopRuntimeProfile | null;
  transport: DesktopSupportTransport;
}) {
  const [diagnostics, setDiagnostics] = useState<DesktopDiagnostics | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DesktopSupportSnapshot | null>(null);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  useEffect(() => {
    let active = true;
    void transport.getDiagnostics()
      .then(value => {
        if (!active) return;
        setDiagnostics(value);
        setDiagnosticError(null);
      })
      .catch(reason => {
        if (!active) return;
        setDiagnosticError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { active = false; };
  }, [transport]);

  function createSnapshot() {
    setCreatingSnapshot(true);
    setSnapshot(null);
    void transport.createSupportSnapshot()
      .then(setSnapshot)
      .catch(reason => setDiagnosticError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setCreatingSnapshot(false));
  }

  return (
    <>
      <PageHeader
        eyebrow="Desktop diagnostics"
        title="System"
        description="Safe runtime, API correlation and bounded support metadata. Secrets, tokens, raw provider bodies and customer payloads are excluded."
        actions={<StatusBadge status={diagnostics?.apiHealthStatus === "ATTESTED" ? "READY" : "PENDING"} label={diagnostics?.apiHealthStatus === "ATTESTED" ? "API ATTESTED" : "DIAGNOSTICS"} />}
      />

      {runtime ? (
        <ContentGrid columns={2}>
          <Card emphasis>
            <h2>Runtime identity</h2>
            <DefinitionList
              compact
              items={[
                {label: "Deployment stage", value: runtime.deploymentStage},
                {label: "Application environment", value: runtime.applicationEnvironment},
                {label: "Version", value: runtime.buildVersion},
                {label: "Build ID", value: runtime.buildId},
                {label: "Source commit", value: shortCommit(runtime.sourceCommit)},
                {label: "Deployment profile", value: runtime.profileId},
                {label: "Profile SHA-256", value: runtime.deploymentProfileSha256},
              ]}
            />
          </Card>
          <Card>
            <h2>Authority boundary</h2>
            <DefinitionList
              compact
              items={[
                {label: "API service", value: runtime.apiService},
                {label: "API audience", value: runtime.apiAudience},
                {label: "Authentication", value: runtime.authenticationMode},
                {label: "Transport", value: "Tauri allow-listed commands"},
                {label: "Business authority", value: "REMOTE API / DOMAIN"},
                {label: "Desktop access", value: "READ-FIRST"},
              ]}
            />
          </Card>
        </ContentGrid>
      ) : (
        <PageState
          state="LOADING"
          title="Resolving runtime identity"
          message="The Desktop application is waiting for its packaged deployment profile."
        />
      )}

      {diagnosticError ? (
        <Card className="desktop-evidence-section">
          <PageState state="ERROR" title="Diagnostics unavailable" message="Safe diagnostics could not be resolved." />
          <p className="desktop-technical-reference">Reference: {diagnosticError}</p>
        </Card>
      ) : null}

      {diagnostics ? (
        <>
          <ContentGrid columns={2}>
            <Card className="desktop-evidence-section">
              <h2>API & correlation</h2>
              <DefinitionList compact items={[
                {label: "API health", value: diagnostics.apiHealthStatus},
                {label: "API service version", value: safeValue(diagnostics.apiServiceVersion)},
                {label: "API build ID", value: safeValue(diagnostics.apiBuildId)},
                {label: "API source commit", value: diagnostics.apiSourceCommit ? shortCommit(diagnostics.apiSourceCommit) : "—"},
                {label: "Session correlation", value: diagnostics.sessionCorrelationId},
                {label: "Last trace ID", value: safeValue(diagnostics.lastTraceId)},
                {label: "Last server request ID", value: safeValue(diagnostics.lastServerRequestId)},
                {label: "Last operation", value: safeValue(diagnostics.lastOperation)},
                {label: "Last reason", value: safeValue(diagnostics.lastReasonCode)},
              ]} />
            </Card>
            <Card className="desktop-evidence-section">
              <h2>Local support boundary</h2>
              <DefinitionList compact items={[
                {label: "Architecture", value: diagnostics.packageArchitecture},
                {label: "Log directory", value: diagnostics.logDirectoryStatus},
                {label: "Log files", value: String(diagnostics.logFileCount)},
                {label: "Log bytes", value: String(diagnostics.logTotalBytes)},
                {label: "Retention", value: `${diagnostics.logRetentionMaxFiles} files / ${diagnostics.logRetentionMaxAgeDays} days`},
                {label: "Support snapshot", value: diagnostics.supportSnapshotAvailable ? "AVAILABLE" : "UNAVAILABLE"},
              ]} />
              <button type="button" className="desktop-support-action" onClick={createSnapshot} disabled={creatingSnapshot}>
                {creatingSnapshot ? "Generating…" : "Generate redacted support snapshot"}
              </button>
              <p className="desktop-capability-note">
                The snapshot contains diagnostic metadata only. It excludes tokens, credentials, raw provider payloads,
                profile/customer payloads, database/private-key material and memory dumps.
              </p>
            </Card>
          </ContentGrid>

          {snapshot ? (
            <Card className="desktop-evidence-section">
              <h2>Support snapshot</h2>
              <DefinitionList compact items={[
                {label: "Reference", value: snapshot.supportReference},
                {label: "Created UTC", value: snapshot.createdAtUtc},
                {label: "Scope", value: snapshot.evidenceScope},
                {label: "SHA-256", value: snapshot.sha256},
              ]} />
              <details className="desktop-raw-evidence">
                <summary>View redacted diagnostic metadata</summary>
                <pre>{JSON.stringify(snapshot, null, 2)}</pre>
              </details>
            </Card>
          ) : null}
        </>
      ) : null}
    </>
  );
}
