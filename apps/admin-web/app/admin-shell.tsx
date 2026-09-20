"use client";
import {usePathname} from "next/navigation";
import {AppShell,ApplicationEnvironmentProvider,type ApplicationEnvironmentVM,type NavigationItem} from "@miqo/ui";
const ADMIN_NAVIGATION:ReadonlyArray<NavigationItem>=[
  {label:"Dashboard",href:"/"},{label:"Cases",href:"/admin/cases"},{label:"Optimisation",href:"/admin/optimisation"},{label:"Scenarios",href:"/admin/scenarios"},
  {label:"Market Routes",href:"/admin/market-routes"},{label:"Quote Runs",href:"/admin/quote-runs"},{label:"Recommendation Sets",href:"/admin/recommendations"},
  {label:"Integrity",href:"/admin/integrity"},{label:"Discrepancies",href:"/admin/discrepancies"},{label:"Audit & Trace",href:"/admin/audit"},
  {label:"Providers",href:"/admin/providers"},{label:"Certification",href:"/admin/certification"},{label:"System",href:"/admin/system"},
];
export function AdminShell({environment,children}:{environment:ApplicationEnvironmentVM|null;children:React.ReactNode}){
  const pathname=usePathname();
  return <ApplicationEnvironmentProvider value={environment}><AppShell contextLabel="Administration" navigation={ADMIN_NAVIGATION} navigationLabel="Admin navigation" currentPath={pathname}>{children}</AppShell></ApplicationEnvironmentProvider>;
}
