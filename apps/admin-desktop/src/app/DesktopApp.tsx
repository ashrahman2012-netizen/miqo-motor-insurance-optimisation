import {useEffect, useMemo, useState} from "react";
import {
  AppShell,
  ApplicationEnvironmentProvider,
  PageState,
  createApplicationEnvironmentVM,
} from "@miqo/ui";
import type {DesktopAuthSession, DesktopRuntimeProfile} from "../services/contracts";
import {TauriDesktopApiTransport} from "../services/tauri-transport";
import {CommandBar} from "../components/CommandBar";
import {SessionControl} from "../components/SessionControl";
import {AuditRoute} from "../routes/AuditRoute";
import {CasesRoute} from "../routes/CasesRoute";
import {DashboardRoute} from "../routes/DashboardRoute";
import {DecisionEvidenceEntryRoute} from "../routes/DecisionEvidenceEntryRoute";
import {DecisionTraceRoute} from "../routes/DecisionTraceRoute";
import {DiscrepanciesRoute} from "../routes/DiscrepanciesRoute";
import {ProfileEvidenceRoute} from "../routes/ProfileEvidenceRoute";
import {ProfileVersionRoute} from "../routes/ProfileVersionRoute";
import {ProvidersRoute} from "../routes/ProvidersRoute";
import {CertificationRoute} from "../routes/CertificationRoute";
import {RouteStatePage} from "../routes/RouteStatePage";
import {SystemRoute} from "../routes/SystemRoute";
import {ADMIN_NAVIGATION, resolveDesktopRoute} from "./navigation";
import {useDesktopRouter} from "./router";

export function DesktopApp() {
  const transport = useMemo(() => new TauriDesktopApiTransport(), []);
  const {path, navigate} = useDesktopRouter();
  const [runtime, setRuntime] = useState<DesktopRuntimeProfile | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [session, setSession] = useState<DesktopAuthSession>({state: "SIGNED_OUT", descriptor: null});
  const [sessionReady, setSessionReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void transport.getRuntimeProfile()
      .then(profile => {
        if (!active) return;
        setRuntime(profile);
        setRuntimeError(null);
      })
      .catch(reason => {
        if (!active) return;
        setRuntime(null);
        setRuntimeError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { active = false; };
  }, [transport]);


  const refreshSession = () => {
    void transport.getAuthSession()
      .then(value => {
        setSession(value);
        setSessionReady(true);
      })
      .catch(reason => {
        setAuthError(reason instanceof Error ? reason.message : String(reason));
        setSession({state: "ERROR", descriptor: null});
        setSessionReady(true);
      });
  };

  useEffect(() => {
    refreshSession();
    const handler = () => refreshSession();
    window.addEventListener("miqos-session-changed", handler);
    return () => window.removeEventListener("miqos-session-changed", handler);
  }, [transport]);

  function signIn() {
    setAuthBusy(true);
    setAuthError(null);
    void transport.beginAuthentication()
      .then(value => setSession(value))
      .catch(reason => {
        setAuthError(reason instanceof Error ? reason.message : String(reason));
        refreshSession();
      })
      .finally(() => setAuthBusy(false));
  }

  function signOut() {
    setAuthBusy(true);
    void transport.logout()
      .then(value => {
        setSession(value);
        setAuthError(null);
      })
      .catch(reason => setAuthError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setAuthBusy(false));
  }

  const environment = runtime?.applicationEnvironment === "SYNTHETIC"
    ? createApplicationEnvironmentVM("SYNTHETIC")
    : null;
  const route = resolveDesktopRoute(path);
  const profileMatch = route.path.match(/^\/admin\/profiles\/([^/]+)$/);
  const profileVersionMatch = route.path.match(/^\/admin\/profile-versions\/([^/]+)$/);
  const selectionTraceMatch = route.path.match(/^\/admin\/selections\/([^/]+)\/trace$/);
  const decisionEntryPaths = new Set([
    "/admin/optimisation",
    "/admin/scenarios",
    "/admin/market-routes",
    "/admin/quote-runs",
    "/admin/recommendations",
    "/admin/integrity",
  ]);

  return (
    <ApplicationEnvironmentProvider value={environment}>
      <AppShell
        applicationLabel="MIQOS"
        contextLabel="Windows Admin"
        navigation={ADMIN_NAVIGATION}
        navigationLabel="MIQOS Admin navigation"
        currentPath={path}
      >
        <CommandBar items={ADMIN_NAVIGATION} onNavigate={navigate} />
        <SessionControl
          session={session}
          busy={authBusy}
          error={authError}
          onSignIn={signIn}
          onSignOut={signOut}
        />

        {runtimeError ? (
          <div className="desktop-runtime-warning">
            <PageState
              state="NOT_AUTHORISED"
              title="Runtime identity unavailable"
              message="The Desktop deployment profile could not be resolved. Environment-dependent Admin evidence remains unavailable."
            />
            <code>{runtimeError}</code>
          </div>
        ) : null}

        {!sessionReady ? (
          <PageState state="LOADING" title="Resolving Admin session" message="Checking native authentication state." />
        ) : route.path !== "/admin/system" && session.state !== "AUTHENTICATED" ? (
          <PageState state="NOT_AUTHORISED" title="Protected Admin evidence unavailable" message="Sign in above to access read-only Admin evidence." />
        ) : route.path === "/" ? (
          <DashboardRoute transport={transport} runtime={runtime} />
        ) : route.path === "/admin/cases" ? (
          <CasesRoute onNavigate={navigate} />
        ) : profileMatch ? (
          <ProfileEvidenceRoute transport={transport} profileId={profileMatch[1]} />
        ) : profileVersionMatch ? (
          <ProfileVersionRoute transport={transport} versionId={profileVersionMatch[1]} />
        ) : selectionTraceMatch ? (
          <DecisionTraceRoute transport={transport} selectionId={selectionTraceMatch[1]} />
        ) : decisionEntryPaths.has(route.path) ? (
          <DecisionEvidenceEntryRoute
            title={route.title}
            description={route.description}
            onNavigate={navigate}
          />
        ) : route.path === "/admin/discrepancies" ? (
          <DiscrepanciesRoute transport={transport} />
        ) : route.path === "/admin/audit" ? (
          <AuditRoute transport={transport} onNavigate={navigate} />
        ) : route.path === "/admin/providers" ? (
          <ProvidersRoute onNavigate={navigate} />
        ) : route.path === "/admin/certification" ? (
          <CertificationRoute />
        ) : route.path === "/admin/system" ? (
          <SystemRoute runtime={runtime} transport={transport} />
        ) : (
          <RouteStatePage route={route} />
        )}
      </AppShell>
    </ApplicationEnvironmentProvider>
  );
}
