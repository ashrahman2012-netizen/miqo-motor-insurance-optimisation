"use client";

import {usePathname} from "next/navigation";
import {AppShell,ApplicationEnvironmentProvider,type ApplicationEnvironmentVM,type NavigationItem} from "@miqo/ui";

const CUSTOMER_NAVIGATION:ReadonlyArray<NavigationItem>=[
  {label:"Dashboard",href:"/dashboard"},{label:"Your Profile",href:"/profile"},{label:"Optimise",href:"/optimise"},
  {label:"Quotes",href:"/quotes"},{label:"Your Results",href:"/results"},{label:"Documents",href:"/documents"},
  {label:"Activity",href:"/activity"},{label:"Help & Support",href:"/support"},{label:"Settings",href:"/settings"},
];

export function CustomerShell({environment,children}:{environment:ApplicationEnvironmentVM|null;children:React.ReactNode}) {
  const pathname=usePathname();
  const currentPath=pathname==="/"?"/dashboard":pathname;
  return <ApplicationEnvironmentProvider value={environment}><AppShell contextLabel="Customer" navigation={CUSTOMER_NAVIGATION} navigationLabel="Customer navigation" currentPath={currentPath}>{children}</AppShell></ApplicationEnvironmentProvider>;
}
