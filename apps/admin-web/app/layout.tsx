import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
  title:"MIQOS Operations | Synthetic Administration",
  description:"MIQOS synthetic-only administration workspace"
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <header className="app-header">
          <div className="app-header__inner">
            <a className="brand" href="/" aria-label="MIQOS operations home">
              <span className="brand__mark" aria-hidden="true">M</span>
              <span>
                <strong>MIQOS</strong>
                <small>Operations workspace</small>
              </span>
            </a>
            <div className="environment-badge" role="status" aria-live="polite">
              SYNTHETIC ADMINISTRATION
            </div>
          </div>
        </header>
        <div className="workspace-strip">
          <span>Controlled administration</span>
          <span className="workspace-strip__divider" aria-hidden="true">•</span>
          <span>Local capability required</span>
        </div>
        {children}
        <footer className="app-footer">
          <span>MIQOS controlled local administration</span>
          <span>No production authority or live-provider activation</span>
        </footer>
      </body>
    </html>
  );
}
