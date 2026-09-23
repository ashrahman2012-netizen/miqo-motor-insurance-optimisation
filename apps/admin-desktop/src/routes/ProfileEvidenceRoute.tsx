import {useEffect, useState} from "react";
import {
  Card,
  ContentGrid,
  DefinitionList,
  PageHeader,
  PageState,
  StatusBadge,
  TextLink,
} from "@miqo/ui";
import type {DesktopApiTransport} from "../services/contracts";
import {
  classifyDesktopReadFailure,
  loadDesktopProfileEvidence,
  type DesktopProfileReadModel,
} from "../services/admin-profile";

function valueText(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function ProfileEvidenceRoute({
  transport,
  profileId,
}: {
  transport: DesktopApiTransport;
  profileId: string;
}) {
  const [model, setModel] = useState<DesktopProfileReadModel | null>(null);
  const [failure, setFailure] = useState<ReturnType<typeof classifyDesktopReadFailure> | null>(null);

  useEffect(() => {
    let active = true;
    setModel(null);
    setFailure(null);
    void loadDesktopProfileEvidence(transport, profileId)
      .then(value => { if (active) setModel(value); })
      .catch(reason => { if (active) setFailure(classifyDesktopReadFailure(reason)); });
    return () => { active = false; };
  }, [profileId, transport]);

  return (
    <>
      <PageHeader
        eyebrow="Core Admin evidence"
        title={`Profile ${profileId}`}
        description="Authoritative profile/version evidence is presented read-only. Desktop Admin cannot edit facts, resolve discrepancies or lock/correct a profile."
        actions={model ? <StatusBadge status={model.version.status} label={model.version.status} /> : undefined}
      />

      {failure ? (
        <Card>
          <PageState state={failure.state} title={failure.title} message={failure.message} />
          <p className="desktop-technical-reference">Reference: {failure.reference}</p>
        </Card>
      ) : null}

      {!model && !failure ? (
        <PageState state="LOADING" title="Loading profile evidence" message="Reading the authorised Admin profile resource." />
      ) : null}

      {model ? (
        <>
          <ContentGrid columns={3}>
            <Card emphasis>
              <h2>Current version</h2>
              <DefinitionList compact items={[
                {label: "Version", value: String(model.version.versionNo)},
                {label: "Version ID", value: <code>{model.version.versionId}</code>},
                {label: "Status", value: model.version.status},
                {label: "Locked at", value: model.version.lockedAt ?? "—"},
              ]} />
            </Card>
            <Card>
              <h2>Validation</h2>
              <StatusBadge
                status={model.validation.valid ? "PASS" : model.validation.latestValidationAt ? "BLOCKED" : "PENDING"}
                label={model.validation.valid ? "VALID" : model.validation.latestValidationAt ? "REQUIRES ATTENTION" : "NOT EVALUATED"}
              />
              <DefinitionList compact items={[
                {label: "Latest check", value: model.validation.latestValidationAt ?? "—"},
                {label: "Issues", value: String(model.validation.issues.length)},
              ]} />
            </Card>
            <Card>
              <h2>Discrepancies</h2>
              <StatusBadge
                status={model.blockingDiscrepancyCount ? "BLOCKED" : "INFORMATIONAL"}
                label={model.blockingDiscrepancyCount ? `${model.blockingDiscrepancyCount} BLOCKING` : "NO BLOCKING ITEMS"}
              />
              <p>Evidence is inspectable only; no correction action is exposed.</p>
            </Card>
          </ContentGrid>

          <Card className="desktop-evidence-section">
            <h2>Factual evidence</h2>
            {model.fields.length ? (
              <div className="desktop-table-scroll">
                <table className="desktop-evidence-table">
                  <thead><tr><th>Field</th><th>Class</th><th>Value</th><th>Source</th></tr></thead>
                  <tbody>{model.fields.map(field => (
                    <tr key={field.fieldId}>
                      <td><strong>{field.label}</strong><br /><code>{field.fieldId}</code></td>
                      <td>{field.controlClass}</td>
                      <td>{field.displayValue}</td>
                      <td>{field.sourceType ?? "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <PageState state="EMPTY" title="No factual values" message="This profile version contains no persisted field values." />}
          </Card>

          <Card className="desktop-evidence-section">
            <h2>Version history</h2>
            <div className="desktop-table-scroll">
              <table className="desktop-evidence-table">
                <thead><tr><th>Version</th><th>Status</th><th>Version ID</th><th>Locked at</th></tr></thead>
                <tbody>{model.history.map(version => (
                  <tr key={version.versionId}>
                    <td>{version.versionNo}</td>
                    <td><StatusBadge status={version.status} label={version.status} /></td>
                    <td><TextLink href={`/admin/profile-versions/${version.versionId}`}><code>{version.versionId}</code></TextLink></td>
                    <td>{version.lockedAt ?? "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>

          <Card className="desktop-evidence-section">
            <h2>Discrepancy evidence</h2>
            {model.discrepancies.length ? (
              <div className="desktop-table-scroll">
                <table className="desktop-evidence-table">
                  <thead><tr><th>Field</th><th>Status</th><th>Factual</th><th>Verified evidence</th><th>Blocking</th></tr></thead>
                  <tbody>{model.discrepancies.map(item => (
                    <tr key={item.discrepancyId}>
                      <td>{item.label}<br /><code>{item.fieldId}</code></td>
                      <td>{item.status}</td>
                      <td>{valueText(item.factualValue)}</td>
                      <td>{valueText(item.evidenceValue)}</td>
                      <td>{item.blocking ? "Yes" : "No"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <PageState state="EMPTY" title="No discrepancy evidence" message="No discrepancy record is returned for the current profile version." />}
          </Card>

          <Card className="desktop-evidence-section">
            <h2>Core audit evidence</h2>
            {model.auditEvents.length ? (
              <ol className="desktop-audit-list">
                {model.auditEvents.map(event => (
                  <li key={event.auditEventId}>
                    <strong>{event.eventType}</strong>
                    <span>{event.entityType} · <code>{event.entityId}</code></span>
                    <time dateTime={event.occurredAt}>{event.occurredAt}</time>
                  </li>
                ))}
              </ol>
            ) : <PageState state="EMPTY" title="No audit events" message="No append-only audit evidence was returned for this profile." />}
          </Card>
        </>
      ) : null}
    </>
  );
}
