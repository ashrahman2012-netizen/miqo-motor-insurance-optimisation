import {useEffect, useMemo, useState} from "react";
import {
  AppShell,
  ApplicationEnvironmentProvider,
  PageState,
  createApplicationEnvironmentVM,
} from "@miqo/ui";
import type {DesktopRuntimeProfile} from "../services/contracts";
import {TauriDesktopApiTransport} from "../services/tauri-transport";
import {CommandBar} from "../components/CommandBar";
import {DashboardRoute} from "../routes/DashboardRoute";
import {RouteStatePage} from "../routes/RouteStatePage";
import {SystemRoute} from "../routes/SystemRoute";
import {ADMIN_NAVIGATION, resolveDesktopRoute} from "./navigation";
import {useDesktopRouter} from "./router";

export function DesktopApp() {
  const transport = useMemo(() => new TauriDesktopApiTransport(), []);
  const {path, navigate} = useDesktopRouter();
  const [runtime, setRuntime] = useState<DesktopRuntimeProfile | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

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

  const environment = runtime?.applicationEnvironment === "SYNTHETIC"
    ? createApplicationEnvironmentVM("SYNTHETIC")
    : null;
  const route = resolveDesktopRoute(path);

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

        {route.path === "/" ? (
          <DashboardRoute transport={transport} runtime={runtime} />
        ) : route.path === "/admin/system" ? (
          <SystemRoute runtime={runtime} />
        ) : (
          <RouteStatePage route={route} />
        )}
      </AppShell>
    </ApplicationEnvironmentProvider>
  );
}
