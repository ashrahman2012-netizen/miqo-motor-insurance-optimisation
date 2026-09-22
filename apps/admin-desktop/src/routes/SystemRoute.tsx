import {Card, ContentGrid, DefinitionList, PageHeader, PageState, StatusBadge} from "@miqo/ui";
import type {DesktopRuntimeProfile} from "../services/contracts";

function shortCommit(value: string) {
  return value.length > 12 ? value.slice(0, 12) : value;
}

export function SystemRoute({runtime}: {runtime: DesktopRuntimeProfile | null}) {
  return (
    <>
      <PageHeader
        eyebrow="Desktop diagnostics"
        title="System"
        description="Safe package, deployment-profile and native-boundary identity. Secrets, tokens and authoritative business payloads are intentionally excluded."
        actions={<StatusBadge status={runtime ? "READY" : "PENDING"} label={runtime ? "RUNTIME READY" : "RESOLVING"} />}
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
    </>
  );
}
