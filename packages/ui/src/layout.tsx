import type {ReactNode} from "react";

export function PageHeader({eyebrow,title,description,actions}:{eyebrow?:string;title:string;description?:string;actions?:ReactNode}) {
  return <header className="miqos-page-header"><div>{eyebrow?<p className="miqos-eyebrow">{eyebrow}</p>:null}<h1>{title}</h1>{description?<p className="miqos-page-header__description">{description}</p>:null}</div>{actions?<div className="miqos-page-header__actions">{actions}</div>:null}</header>;
}
export function ContentGrid({children,columns=2,className=""}:{children:ReactNode;columns?:1|2|3|4;className?:string}) {
  return <div className={`miqos-content-grid miqos-content-grid--${columns} ${className}`.trim()}>{children}</div>;
}
export function SectionHeading({title,description}:{title:string;description?:string}) {
  return <div className="miqos-section-heading"><h2>{title}</h2>{description?<p>{description}</p>:null}</div>;
}
export function DefinitionList({items,compact=false}:{items:ReadonlyArray<{label:string;value:ReactNode}>;compact?:boolean}) {
  return <dl className={`miqos-definition-list ${compact?"miqos-definition-list--compact":""}`.trim()}>{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
