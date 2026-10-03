import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
  title:"MIQOS | Motor Insurance Optimisation",
  description:"MIQOS synthetic-only motor insurance optimisation workspace"
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <header className="app-header">
          <div className="app-header__inner">
            <a className="brand" href="/" aria-label="MIQOS home">
              <span className="brand__mark" aria-hidden="true">M</span>
              <span>
                <strong>MIQOS</strong>
                <small>Motor Insurance Optimisation</small>
              </span>
            </a>
            <div className="environment-badge" role="status" aria-live="polite">
              SYNTHETIC DATA ONLY
            </div>
          </div>
        </header>
        <div className="workspace-strip">
          <span>Customer workspace</span>
          <span className="workspace-strip__divider" aria-hidden="true">•</span>
          <span>Local protected session</span>
        </div>
        {children}
        <footer className="app-footer">
          <span>MIQOS local desktop workspace</span>
          <span>No live insurer or provider connections</span>
        </footer>
      </body>
    </html>
  );
}
