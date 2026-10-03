import type {Metadata} from "next";
import "./globals.css";
import MiqosAdminShell from "./miqos-admin-shell";

export const metadata:Metadata={
  title:"MIQOS Administration | Synthetic Workspace",
  description:"MIQOS synthetic-only administration workspace"
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <MiqosAdminShell>{children}</MiqosAdminShell>
      </body>
    </html>
  );
}
