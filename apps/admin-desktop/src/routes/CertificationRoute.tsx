import {Card, DefinitionList, PageHeader, PageState, StatusBadge} from "@miqo/ui";

export function CertificationRoute() {
  return (
    <>
      <PageHeader
        eyebrow="Capability closure"
        title="Certification"
        description="Certification status is displayed only when an authoritative certification artefact exists. None is admitted to the current Desktop Admin contract."
        actions={<StatusBadge status="PENDING" label="DEFERRED" />}
      />
      <Card emphasis>
        <PageState
          state="EMPTY"
          title="Authoritative certification evidence unavailable"
          message="The current TEST/SYNTHETIC engineering proof is not production, provider, regulatory or deployment certification."
        />
      </Card>
      <Card>
        <h2>What the current evidence does prove</h2>
        <DefinitionList compact items={[
          {label:"Environment",value:"TEST / SYNTHETIC"},
          {label:"Live providers",value:"DISABLED"},
          {label:"Desktop package proof",value:"Engineering lifecycle evidence only"},
          {label:"Identity proof",value:"Deterministic TEST OIDC only"},
          {label:"Production certification",value:"NOT CLAIMED"},
        ]} />
      </Card>
      <p className="desktop-capability-note">
        Real IdP registration, non-synthetic environment authority, provider activation, organisational signing and production release remain separately gated.
      </p>
    </>
  );
}
