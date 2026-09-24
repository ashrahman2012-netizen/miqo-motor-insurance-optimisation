import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
  title:"MIQO Synthetic Motor Insurance Prototype",
  description:"Synthetic-only non-production motor insurance optimisation prototype"
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <div role="status" aria-live="polite" style={{padding: 12, borderBottom: "2px solid currentColor", fontWeight: 700}}>
          MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY
        </div>
        {children}
      </body>
    </html>
  );
}
