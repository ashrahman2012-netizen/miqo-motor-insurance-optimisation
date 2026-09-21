import {
  AppShell,
  ApplicationEnvironmentProvider,
  Card,
  ContentGrid,
  DefinitionList,
  PageHeader,
  createApplicationEnvironmentVM,
  type NavigationItem,
} from "@miqo/ui";

export const DESKTOP_NAVIGATION: ReadonlyArray<NavigationItem> = [
  {label: "System", href: "/admin/system"},
];

const environment = createApplicationEnvironmentVM("SYNTHETIC");

export function DesktopApp() {
  return (
    <ApplicationEnvironmentProvider value={environment}>
      <AppShell
        applicationLabel="MIQOS"
        contextLabel="Windows Admin"
        navigation={DESKTOP_NAVIGATION}
        navigationLabel="MIQOS Admin navigation"
        currentPath="/admin/system"
      >
        <PageHeader
          eyebrow="Desktop Skeleton"
          title="MIQOS Admin"
          description="Windows Admin application scaffold. This skeleton proves host, packaging and shared UI reuse only; it does not introduce new domain authority."
        />
        <ContentGrid columns={2}>
          <Card emphasis>
            <h2>Controlled environment</h2>
            <DefinitionList
              compact
              items={[
                {label: "Deployment stage", value: "TEST"},
                {label: "Application environment", value: "SYNTHETIC"},
                {label: "Provider connectivity", value: "DISABLED"},
                {label: "Business-state access", value: "READ-ONLY"},
              ]}
            />
          </Card>
          <Card>
            <h2>Scaffold boundary</h2>
            <p>
              Native host and renderer are present. Authentication, API transport,
              observability and support-bundle implementation remain outside WP-G8.1.
            </p>
          </Card>
        </ContentGrid>
      </AppShell>
    </ApplicationEnvironmentProvider>
  );
}
