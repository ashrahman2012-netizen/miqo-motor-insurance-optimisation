import type {AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode} from "react";

export function Button({variant="primary",className="",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"quiet"}) {
  return <button {...props} className={`miqos-button miqos-button--${variant} ${className}`.trim()} />;
}
export function TextLink({className="",...props}:AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={`miqos-text-link ${className}`.trim()} />;
}
export function Card({children,emphasis=false,className="",...props}:HTMLAttributes<HTMLElement>&{children:ReactNode;emphasis?:boolean}) {
  return <section {...props} className={`miqos-card ${emphasis?"miqos-card--emphasis":""} ${className}`.trim()}>{children}</section>;
}
export function Panel({children,className="",...props}:HTMLAttributes<HTMLDivElement>&{children:ReactNode}) {
  return <div {...props} className={`miqos-panel ${className}`.trim()}>{children}</div>;
}
export function PageState({state,title,message}:{state:"LOADING"|"EMPTY"|"ERROR"|"BLOCKED"|"NOT_AUTHORISED";title:string;message:string}) {
  const role=state==="ERROR"||state==="BLOCKED"||state==="NOT_AUTHORISED"?"alert":"status";
  return <div className="miqos-page-state" data-state={state} role={role}><strong>{title}</strong><p>{message}</p></div>;
}
