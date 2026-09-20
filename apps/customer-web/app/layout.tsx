import "@miqo/ui/styles.css";
import {CustomerShell} from "./customer-shell";
import {resolveApplicationEnvironment} from "./environment";

export const dynamic="force-dynamic";

export default function RootLayout({children}:{children:React.ReactNode}) {
  const environment=resolveApplicationEnvironment();
  return <html lang="en"><body><CustomerShell environment={environment}>{children}</CustomerShell></body></html>;
}
