import {useState} from "react";
import {Card, PageHeader, PageState, StatusBadge} from "@miqo/ui";
import {ExactIdLookup} from "../components/ExactIdLookup";
import {
  classifyDesktopReadFailure,
  loadDesktopProfileEvidence,
  type DesktopProfileReadModel,
} from "../services/admin-profile";
import type {DesktopApiTransport} from "../services/contracts";

function valueText(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function DiscrepanciesRoute({transport}: {transport: DesktopApiTransport}) {
  const [model, setModel] = useState<DesktopProfileReadModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReturnType<typeof classifyDesktopReadFailure> | null>(null);

  function load(profileId: string) {
    setLoading(true);
    setModel(null);
    setFailure(null);
    void loadDesktopProfileEvidence(transport, profileId)
      .then(next => setModel(next))
      .catch(reason => setFailure(classifyDesktopReadFailure(reason)))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <PageHeader
        eyebrow="Read-only evidence"
        title="Discrepancies"
        description="Inspect persisted discrepancy evidence for an exact profile. Desktop Admin exposes no keep/update, correction or resolution action."
        actions={<StatusBadge status="INFORMATIONAL" label="READ ONLY" />}
      />
      <Card emphasis>
        <ExactIdLookup label="Profile ID" placeholder="PRO-SYN-…" buttonLabel="Load discrepancies" onSubmit={load} />
      </Card>
      {loading ? <PageState state="LOADING" title="Loading discrepancies" message="Reading the authorised profile/discrepancy evidence." /> : null}
      {failure ? (
        <Card>
          <PageState state={failure.state} title={failure.title} message={failure.message} />
          <p className="desktop-technical-reference">Reference: {failure.reference}</p>
        </Card>
      ) : null}
      {model ? (
        <Card className="desktop-evidence-section">
          <h2>Current-version discrepancy evidence</h2>
          {model.discrepancies.length ? (
            <div className="desktop-table-scroll">
              <table className="desktop-evidence-table">
                <thead><tr><th>Field</th><th>Status</th><th>Factual</th><th>Verified</th><th>Blocking</th></tr></thead>
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
          ) : <PageState state="EMPTY" title="No discrepancy evidence" message="The current profile version has no persisted discrepancy rows." />}
        </Card>
      ) : null}
    </>
  );
}
