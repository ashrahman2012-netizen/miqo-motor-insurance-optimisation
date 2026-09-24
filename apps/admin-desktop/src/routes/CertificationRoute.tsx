import {Card, DefinitionList, PageHeader, PageState, StatusBadge} from "@miqo/ui";
import type {DesktopRuntimeProfile} from "../services/contracts";

export function CertificationRoute({runtime}:{runtime:DesktopRuntimeProfile|null}) {
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
          message="Engineering CI, packaging and TEST identity proof are not production, provider, regulatory or deployment certification."
        />
      </Card>
      <Card>
        <h2>Current engineering boundary</h2>
        <DefinitionList compact items={[
          {label:"Deployment stage",value:runtime?.deploymentStage??"UNAVAILABLE"},
          {label:"Application environment",value:runtime?.applicationEnvironment??"UNAVAILABLE"},
          {label:"Authentication mode",value:runtime?.authenticationMode??"UNAVAILABLE"},
          {label:"Desktop package proof",value:"Engineering lifecycle evidence only"},
          {label:"Production certification",value:"NOT CLAIMED"},
        ]} />
      </Card>
      <p className="desktop-capability-note">
        Real IdP registration, non-synthetic environment authority, provider activation, organisational signing and production release remain separately gated.
      </p>
    </>
  );
}
