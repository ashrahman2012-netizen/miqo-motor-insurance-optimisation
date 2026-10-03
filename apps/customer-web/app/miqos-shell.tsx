"use client";

import {usePathname} from "next/navigation";
import {adminUrl} from "./lib";

function journeyLabel(pathname:string){
  if(pathname==="/"||pathname==="/prototype")return "Profile home";
  if(pathname.includes("/section/"))return "Profile facts";
  if(pathname.endsWith("/review"))return "Review";
  if(pathname.endsWith("/lock"))return "Confirm & lock";
  if(pathname.includes("/optimisation"))return "Optimisation";
  if(pathname.includes("/completion"))return "Completion";
  if(pathname.includes("/correction"))return "Correction";
  return "Customer journey";
}

export default function MiqosShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const progress=journeyLabel(pathname);

  return <>
    <a className="skip-link" href="#primary-content">Skip to main content</a>
    <header className="app-header">
      <div className="app-header__inner">
        <a className="brand" href="/" aria-label="MIQOS customer home">
          <span className="brand__mark" aria-hidden="true">M</span>
          <span>
            <strong>MIQOS</strong>
            <small>Motor Insurance Optimisation</small>
          </span>
        </a>
        <div className="environment-boundary">
          <div className="environment-badge" role="status" aria-live="polite">
            SYNTHETIC DATA ONLY
          </div>
          <small className="legacy-boundary-marker">MIQO MVP PROTOTYPE — SYNTHETIC DATA ONLY</small>
        </div>
      </div>
      <nav className="shell-nav" aria-label="Customer workspace">
        <a href="/" aria-current={pathname==="/"?"page":undefined}>Customer home</a>
        <a href={adminUrl("/")} rel="noreferrer">Synthetic admin</a>
      </nav>
    </header>
    <div className="workspace-strip" aria-label="Journey context">
      <span>Customer workspace</span>
      <span className="workspace-strip__divider" aria-hidden="true">•</span>
      <strong>{progress}</strong>
      <span className="workspace-strip__divider" aria-hidden="true">•</span>
      <span>Local protected session</span>
    </div>
    <div id="primary-content">{children}</div>
    <footer className="app-footer">
      <span>MIQOS local desktop workspace</span>
      <span>No live insurer or provider connections</span>
    </footer>
  </>;
}
