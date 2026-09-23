import {useEffect, useState} from "react";
import {Card, DefinitionList, PageHeader, PageState, StatusBadge, TextLink} from "@miqo/ui";
import type {DesktopApiTransport} from "../services/contracts";
import {
  classifyDesktopReadFailure,
  loadDesktopProfileVersionEvidence,
  type DesktopProfileReadModel,
} from "../services/admin-profile";

export function ProfileVersionRoute({
  transport,
  versionId,
}: {
  transport: DesktopApiTransport;
  versionId: string;
}) {
  const [model, setModel] = useState<DesktopProfileReadModel | null>(null);
  const [failure, setFailure] = useState<ReturnType<typeof classifyDesktopReadFailure> | null>(null);

  useEffect(() => {
    let active = true;
    setModel(null);
    setFailure(null);
    void loadDesktopProfileVersionEvidence(transport, versionId)
      .then(value => { if (active) setModel(value); })
      .catch(reason => { if (active) setFailure(classifyDesktopReadFailure(reason)); });
    return () => { active = false; };
  }, [transport, versionId]);

  return (
    <>
      <PageHeader
        eyebrow="Exact profile-version evidence"
        title={`Profile Version ${versionId}`}
        description="This view is inspection-only. No field editing, validation command, locking or correction action is available."
        actions={model ? <StatusBadge status={model.version.status} label={model.version.status} /> : undefined}
      />
      {failure ? (
        <Card>
          <PageState state={failure.state} title={failure.title} message={failure.message} />
          <p className="desktop-technical-reference">Reference: {failure.reference}</p>
        </Card>
      ) : null}
      {!model && !failure ? <PageState state="LOADING" title="Loading profile version" message="Reading the exact authorised Admin profile-version resource." /> : null}
      {model ? (
        <>
          <Card emphasis>
            <DefinitionList items={[
              {label: "Profile", value: <TextLink href={`/admin/profiles/${model.profileId}`}><code>{model.profileId}</code></TextLink>},
              {label: "Version number", value: String(model.version.versionNo)},
              {label: "Version ID", value: <code>{model.version.versionId}</code>},
              {label: "Status", value: model.version.status},
              {label: "Locked at", value: model.version.lockedAt ?? "—"},
              {label: "Latest validation", value: model.validation.latestValidationAt ?? "—"},
            ]} />
          </Card>
          <Card className="desktop-evidence-section">
            <h2>Version fields</h2>
            {model.fields.length ? (
              <div className="desktop-table-scroll">
                <table className="desktop-evidence-table">
                  <thead><tr><th>Field</th><th>Class</th><th>Value</th><th>Source</th></tr></thead>
                  <tbody>{model.fields.map(field => (
                    <tr key={field.fieldId}>
                      <td>{field.label}<br /><code>{field.fieldId}</code></td>
                      <td>{field.controlClass}</td>
                      <td>{field.displayValue}</td>
                      <td>{field.sourceType ?? "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <PageState state="EMPTY" title="No values" message="No persisted values are present on this exact version." />}
          </Card>
        </>
      ) : null}
    </>
  );
}
