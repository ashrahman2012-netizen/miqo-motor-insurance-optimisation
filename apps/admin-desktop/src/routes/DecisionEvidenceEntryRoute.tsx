import {Card, PageHeader, StatusBadge} from "@miqo/ui";
import {ExactIdLookup} from "../components/ExactIdLookup";

export function DecisionEvidenceEntryRoute({
  title,
  description,
  onNavigate,
}: {
  title: string;
  description: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Selection-linked evidence"
        title={title}
        description={description}
        actions={<StatusBadge status="INFORMATIONAL" label="READ ONLY" />}
      />
      <Card emphasis>
        <h2>Open exact decision lineage</h2>
        <p>
          Enter a persisted Selection ID. MIQOS reconstructs the supplied scenario, market-route,
          quote, recommendation and integrity evidence without recomputing any business decision.
        </p>
        <ExactIdLookup
          label="Selection ID"
          placeholder="SEL-…"
          buttonLabel="Open decision trace"
          onSubmit={selectionId => onNavigate(`/admin/selections/${selectionId}/trace`)}
        />
      </Card>
      <p className="desktop-capability-note">
        No global list/search, quote execution, ranking, recommendation generation or integrity evaluation is authorised here.
      </p>
    </>
  );
}
