import {useState} from "react";
import {Card, ContentGrid, PageHeader, PageState, StatusBadge} from "@miqo/ui";
import {ExactIdLookup} from "../components/ExactIdLookup";
import {loadDesktopAuditProof} from "../services/admin-audit";
import {classifyDesktopReadFailure} from "../services/admin-profile";
import type {DesktopApiTransport, DesktopAuditProof} from "../services/contracts";

export function AuditRoute({
  transport,
  onNavigate,
}: {
  transport: DesktopApiTransport;
  onNavigate: (path: string) => void;
}) {
  const [proof, setProof] = useState<DesktopAuditProof | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReturnType<typeof classifyDesktopReadFailure> | null>(null);

  function load(value: string) {
    setProfileId(value);
    setLoading(true);
    setProof(null);
    setFailure(null);
    void loadDesktopAuditProof(transport, value)
      .then(next => setProof(next))
      .catch(reason => setFailure(classifyDesktopReadFailure(reason)))
      .finally(() => setLoading(false));
  }

  const events = proof?.viewModel.timeline?.events ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Append-only lifecycle evidence"
        title="Audit & Trace"
        description="Inspect append-only profile audit history or open an exact Selection ID for complete scenario, quote, recommendation and integrity lineage."
        actions={<StatusBadge status="INFORMATIONAL" label="READ ONLY" />}
      />
      <ContentGrid columns={2}>
        <Card emphasis>
          <h2>Profile lifecycle audit</h2>
          <ExactIdLookup label="Profile ID" placeholder="PRO-SYN-…" buttonLabel="Load audit" onSubmit={load} />
        </Card>
        <Card>
          <h2>Decision lineage</h2>
          <ExactIdLookup
            label="Selection ID"
            placeholder="SEL-…"
            buttonLabel="Open selection trace"
            onSubmit={selectionId => onNavigate(`/admin/selections/${selectionId}/trace`)}
          />
        </Card>
      </ContentGrid>
      {loading ? <PageState state="LOADING" title="Loading audit evidence" message="Reading the authorised append-only audit resource." /> : null}
      {failure ? (
        <Card>
          <PageState state={failure.state} title={failure.title} message={failure.message} />
          <p className="desktop-technical-reference">Reference: {failure.reference}</p>
        </Card>
      ) : null}
      {proof ? (
        <Card className="desktop-evidence-section">
          <h2>Audit events for <code>{profileId}</code></h2>
          {events.length ? (
            <ol className="desktop-audit-list">
              {events.map(event => (
                <li key={event.auditEventId}>
                  <strong>{event.summary}</strong>
                  <span><code>{event.eventType}</code> · {event.entityType} · <code>{event.entityId}</code></span>
                  <time dateTime={event.occurredAt}>{event.occurredAt}</time>
                </li>
              ))}
            </ol>
          ) : <PageState state="EMPTY" title="No matching audit events" message="The authoritative audit resource returned no events for this profile." />}
        </Card>
      ) : null}
    </>
  );
}
