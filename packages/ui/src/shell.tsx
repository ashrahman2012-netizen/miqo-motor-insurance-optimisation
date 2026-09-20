"use client";

import {useEffect,useRef,useState,type ReactNode,type RefObject} from "react";
import {EnvironmentBadge,EnvironmentBanner} from "./environment";

export interface NavigationItem {readonly label:string;readonly href:string;readonly shortLabel?:string;}

function isActivePath(currentPath:string,href:string) {
  if(currentPath===href) return true;
  if(href==="/dashboard"||href==="/admin/dashboard"||href==="/") return false;
  return currentPath.startsWith(`${href}/`);
}

export function SidebarNavigation({items,currentPath,label,onNavigate}:{items:ReadonlyArray<NavigationItem>;currentPath:string;label:string;onNavigate?:()=>void}) {
  return <nav className="miqos-sidebar-nav" aria-label={label}><ul>{items.map(item=>{
    const active=isActivePath(currentPath,item.href);
    return <li key={item.href}><a href={item.href} aria-current={active?"page":undefined} className={active?"miqos-sidebar-nav__link miqos-sidebar-nav__link--active":"miqos-sidebar-nav__link"} onClick={onNavigate}><span className="miqos-sidebar-nav__marker" aria-hidden="true"/><span>{item.label}</span></a></li>;
  })}</ul></nav>;
}

export function TopNavigation({applicationLabel,contextLabel,onOpenNavigation,menuButtonRef}:{applicationLabel:string;contextLabel:string;onOpenNavigation:()=>void;menuButtonRef:RefObject<HTMLButtonElement|null>}) {
  return <header className="miqos-top-nav"><div className="miqos-top-nav__identity"><button ref={menuButtonRef} type="button" className="miqos-mobile-menu-button" aria-label="Open navigation" aria-controls="miqos-mobile-navigation" onClick={onOpenNavigation}><span aria-hidden="true">☰</span></button><div><strong className="miqos-wordmark">{applicationLabel}</strong><span className="miqos-top-nav__context">{contextLabel}</span></div></div><EnvironmentBadge/></header>;
}

export function AppShell({applicationLabel="MIQOS",contextLabel,navigation,navigationLabel,currentPath,children}:{applicationLabel?:string;contextLabel:string;navigation:ReadonlyArray<NavigationItem>;navigationLabel:string;currentPath:string;children:ReactNode}) {
  const [mobileOpen,setMobileOpen]=useState(false);
  const closeButtonRef=useRef<HTMLButtonElement>(null);
  const menuButtonRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    if(!mobileOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setMobileOpen(false);menuButtonRef.current?.focus();}
    };
    document.addEventListener("keydown",onKeyDown);
    return()=>document.removeEventListener("keydown",onKeyDown);
  },[mobileOpen]);

  const closeMobile=()=>{setMobileOpen(false);menuButtonRef.current?.focus();};

  return <>
    <a className="miqos-skip-link" href="#main-content">Skip to main content</a>
    <EnvironmentBanner/>
    <div className="miqos-app-shell">
      <aside className="miqos-sidebar">
        <div className="miqos-sidebar__brand" aria-label="MIQOS"><span className="miqos-brand-mark" aria-hidden="true">M</span><span><strong>MIQOS</strong><small>{contextLabel}</small></span></div>
        <SidebarNavigation items={navigation} currentPath={currentPath} label={navigationLabel}/>
        <div className="miqos-sidebar__footer">Change choices, not facts.</div>
      </aside>
      <div className="miqos-app-shell__body">
        <TopNavigation applicationLabel={applicationLabel} contextLabel={contextLabel} onOpenNavigation={()=>setMobileOpen(true)} menuButtonRef={menuButtonRef}/>
        <div id="main-content" className="miqos-workspace" tabIndex={-1}>{children}</div>
      </div>
    </div>
    {mobileOpen?<div className="miqos-mobile-nav-layer"><button type="button" className="miqos-mobile-nav-backdrop" aria-label="Close navigation backdrop" onClick={closeMobile}/><aside id="miqos-mobile-navigation" className="miqos-mobile-nav"><div className="miqos-mobile-nav__header"><strong>MIQOS</strong><button ref={closeButtonRef} type="button" className="miqos-icon-button" aria-label="Close navigation" onClick={closeMobile}>×</button></div><SidebarNavigation items={navigation} currentPath={currentPath} label={navigationLabel} onNavigate={()=>setMobileOpen(false)}/></aside></div>:null}
  </>;
}
