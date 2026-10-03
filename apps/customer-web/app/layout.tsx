import type {Metadata} from "next";
import "./globals.css";
import MiqosShell from "./miqos-shell";

export const metadata:Metadata={
  title:"MIQOS | Motor Insurance Optimisation",
  description:"MIQOS synthetic-only motor insurance optimisation workspace"
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <MiqosShell>{children}</MiqosShell>
      </body>
    </html>
  );
}
