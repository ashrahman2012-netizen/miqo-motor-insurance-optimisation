import {Button, Card, DefinitionList, PageState, StatusBadge} from "@miqo/ui";
import type {DesktopAuthSession} from "../services/contracts";

export function SessionControl({
  session,
  busy,
  error,
  onSignIn,
  onSignOut,
}: {
  session: DesktopAuthSession;
  busy: boolean;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (session.state === "AUTHENTICATED" && session.descriptor) {
    return (
      <Card className="desktop-session-control">
        <div className="desktop-session-row">
          <div>
            <p className="desktop-kicker">Authenticated Admin session</p>
            <strong>{session.descriptor.displayName}</strong>
          </div>
          <StatusBadge status="READY" label="AUTHENTICATED" />
        </div>
        <DefinitionList compact items={[
          {label: "Subject", value: session.descriptor.subjectId},
          {label: "Environment", value: session.descriptor.environment},
          {label: "Permissions", value: String(session.descriptor.permissions.length)},
          {label: "Expires", value: session.descriptor.sessionExpiresAt},
        ]} />
        <Button type="button" onClick={onSignOut} disabled={busy}>Sign out</Button>
      </Card>
    );
  }

  return (
    <Card className="desktop-session-control">
      <PageState
        state={session.state === "ERROR" || session.state === "EXPIRED" ? "ERROR" : "NOT_AUTHORISED"}
        title="Sign in required"
        message="Protected Admin evidence requires a native public-client session. Authentication opens in the system browser; token material remains in the native process."
      />
      {error ? <p className="desktop-technical-reference">Reference: {error}</p> : null}
      <Button type="button" onClick={onSignIn} disabled={busy}>
        {busy ? "Authenticating…" : "Sign in"}
      </Button>
    </Card>
  );
}
