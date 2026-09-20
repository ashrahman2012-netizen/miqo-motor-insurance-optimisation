import "@miqo/ui/styles.css";
import {AdminShell} from "./admin-shell";
import {resolveApplicationEnvironment} from "./environment";
export const dynamic="force-dynamic";
export default function RootLayout({children}:{children:React.ReactNode}) {
  const environment=resolveApplicationEnvironment();
  return <html lang="en"><body><AdminShell environment={environment}>{children}</AdminShell></body></html>;
}
