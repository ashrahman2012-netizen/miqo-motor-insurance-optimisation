import {Card, PageHeader, PageState, StatusBadge} from "@miqo/ui";
import {ExactIdLookup} from "../components/ExactIdLookup";

export function ProvidersRoute({onNavigate}:{onNavigate:(path:string)=>void}) {
  return (
    <>
      <PageHeader
        eyebrow="Capability closure"
        title="Providers"
        description="MIQOS Desktop Admin has no admitted global provider-status resource. Provider identity, route, channel, adapter and mapping evidence may be inspected only where persisted decision lineage supplies it."
        actions={<StatusBadge status="PENDING" label="DEFERRED" />}
      />
      <Card emphasis>
        <PageState
          state="EMPTY"
          title="Global provider status unavailable"
          message="No authoritative resource currently states whether a provider is globally live, enabled, healthy, certified or commercially active. DB-G8 does not infer those states from synthetic quotation success."
        />
      </Card>
      <Card>
        <h2>Authorised provider evidence</h2>
        <p>
          Exact persisted Selection traces can show provider and market-route identifiers used by that decision.
          This is evidence about that recorded route only; it is not a provider-control or provider-status console.
        </p>
        <ExactIdLookup
          label="Selection ID"
          placeholder="SEL-…"
          buttonLabel="Open provider evidence in decision trace"
          onSubmit={selectionId=>onNavigate(`/admin/selections/${selectionId}/trace`)}
        />
      </Card>
      <p className="desktop-capability-note">
        Provider activation, deactivation, live-provider enablement and inferred health/certification remain prohibited.
      </p>
    </>
  );
}
