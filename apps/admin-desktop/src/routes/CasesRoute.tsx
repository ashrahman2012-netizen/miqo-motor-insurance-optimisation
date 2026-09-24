import {Card, PageHeader, StatusBadge} from "@miqo/ui";
import {ExactIdLookup} from "../components/ExactIdLookup";

export function CasesRoute({onNavigate}: {onNavigate: (path: string) => void}) {
  return (
    <>
      <PageHeader
        eyebrow="Read-only Admin evidence"
        title="Cases"
        description="Open an exact persisted profile by identifier. MIQOS does not expose a global Desktop case list or cross-entity search at this gateway."
        actions={<StatusBadge status="INFORMATIONAL" label="EXACT ID LOOKUP" />}
      />
      <Card emphasis>
        <h2>Open profile evidence</h2>
        <p>Profile facts, versions, validation, discrepancies and core audit evidence are displayed read-only.</p>
        <ExactIdLookup
          label="Profile ID"
          placeholder="PRO-SYN-…"
          buttonLabel="Open profile"
          onSubmit={profileId => onNavigate(`/admin/profiles/${profileId}`)}
        />
      </Card>
    </>
  );
}
