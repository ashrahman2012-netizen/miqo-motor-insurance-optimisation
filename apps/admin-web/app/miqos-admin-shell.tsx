"use client";

import {usePathname} from "next/navigation";

const CUSTOMER_URL=process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL??"http://127.0.0.1:3000/";

function adminContext(pathname:string){
  if(pathname==="/")return "Administration home";
  if(pathname.includes("/profiles/"))return "Profile inspection";
  if(pathname.includes("/selections/"))return "Selection trace";
  if(pathname.includes("/audit"))return "Audit history";
  return "Controlled administration";
}

export default function MiqosAdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  return <>
    <a className="skip-link" href="#primary-content">Skip to main content</a>
    <header className="app-header">
      <div className="app-header__inner">
        <a className="brand" href="/" aria-label="MIQOS administration home">
          <span className="brand__mark" aria-hidden="true">M</span>
          <span>
            <strong>MIQOS</strong>
            <small>Administration</small>
          </span>
        </a>
        <div className="environment-badge" role="status" aria-live="polite">
          SYNTHETIC ADMINISTRATION
        </div>
      </div>
      <nav className="shell-nav" aria-label="Administration workspace">
        <a href="/" aria-current={pathname==="/"?"page":undefined}>Administration home</a>
        <a href={CUSTOMER_URL}>Customer surface</a>
      </nav>
    </header>
    <div className="workspace-strip" aria-label="Administration context">
      <span>Controlled administration</span>
      <span className="workspace-strip__divider" aria-hidden="true">•</span>
      <strong>{adminContext(pathname)}</strong>
      <span className="workspace-strip__divider" aria-hidden="true">•</span>
      <span>Local capability boundary</span>
    </div>
    <div id="primary-content">{children}</div>
    <footer className="app-footer">
      <span>MIQOS controlled local administration</span>
      <span>No production authority or live-provider activation</span>
    </footer>
  </>;
}
