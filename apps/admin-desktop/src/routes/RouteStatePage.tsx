import {Card, PageHeader, PageState, StatusBadge} from "@miqo/ui";
import type {DesktopRouteModel} from "../app/navigation";

function statusFor(disposition: DesktopRouteModel["disposition"]) {
  if (disposition === "RESERVED") return <StatusBadge status="INFORMATIONAL" label="RESERVED" />;
  if (disposition === "DEFERRED" || disposition === "TRACE_DERIVED") return <StatusBadge status="PENDING" label={disposition.replaceAll("_", " ")} />;
  if (disposition === "NOT_FOUND") return <StatusBadge status="BLOCKED" label="NOT FOUND" />;
  return <StatusBadge status="INFORMATIONAL" label="READ ONLY" />;
}

export function RouteStatePage({route}: {route: DesktopRouteModel}) {
  const notFound = route.disposition === "NOT_FOUND";
  return (
    <>
      <PageHeader
        eyebrow={route.eyebrow}
        title={route.title}
        description={route.description}
        actions={statusFor(route.disposition)}
      />
      <Card>
        <PageState
          state={notFound ? "ERROR" : "EMPTY"}
          title={notFound ? "Unknown Desktop route" : "Foundation route ready"}
          message={
            notFound
              ? "Use the authorised Admin navigation to return to a frozen Desktop route."
              : "DB-G2 establishes the real application shell and route boundary. Evidence loading for this area is introduced only in its authorised downstream gateway."
          }
        />
        {!notFound ? (
          <p className="desktop-capability-note">
            Capability state: <strong>{route.disposition.replaceAll("_", " ")}</strong>. No unavailable backend capability is simulated.
          </p>
        ) : null}
      </Card>
    </>
  );
}
