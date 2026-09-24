import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
  title:"MIQO Synthetic Admin Prototype",
  description:"Synthetic-only non-production MIQO administration prototype"
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <div role="status" aria-live="polite" style={{padding: 12, borderBottom: "2px solid currentColor", fontWeight: 700}}>
          ADMIN — NON-PRODUCTION / SYNTHETIC DATA
        </div>
        {children}
      </body>
    </html>
  );
}
