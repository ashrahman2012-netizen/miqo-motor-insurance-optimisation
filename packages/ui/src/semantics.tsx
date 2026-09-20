import type {ApplicationEnvironmentVM, ComparisonState, IntegrityVM} from "@miqo/application-contracts";

export type SemanticTone = "success" | "warning" | "danger" | "info" | "neutral" | "certification" | "dormant";
export type MiqosStatus =
  | "PASS" | "READY" | "LOCKED" | "DRAFT" | "PENDING" | "BLOCKED" | "SUPERSEDED" | "EXCLUDED"
  | "DIRECTLY_COMPARABLE" | "NOT_COMPARABLE" | "ADJUSTED_COMPARABLE"
  | "SYNTHETIC" | "CERTIFICATION" | "PRODUCTION" | "AUTHORISED" | "NOT_AUTHORISED" | "INFORMATIONAL";

const STATUS_TONE: Record<MiqosStatus, SemanticTone> = {
  PASS:"success",READY:"success",LOCKED:"info",DRAFT:"neutral",PENDING:"warning",BLOCKED:"danger",
  SUPERSEDED:"neutral",EXCLUDED:"neutral",DIRECTLY_COMPARABLE:"success",NOT_COMPARABLE:"neutral",
  ADJUSTED_COMPARABLE:"dormant",SYNTHETIC:"info",CERTIFICATION:"certification",PRODUCTION:"neutral",
  AUTHORISED:"success",NOT_AUTHORISED:"danger",INFORMATIONAL:"info",
};

function humanise(value: string) { return value.replaceAll("_", " "); }

export function StatusBadge({status,label}:{status:MiqosStatus;label?:string}) {
  return (
    <span className="miqos-badge" data-tone={STATUS_TONE[status]} data-status={status}>
      <span className="miqos-badge__dot" aria-hidden="true" />
      <span>{label ?? humanise(status)}</span>
    </span>
  );
}

export function IntegrityBadge({outcome}:{outcome:IntegrityVM["outcome"]}) {
  if(outcome==="PASS") return <StatusBadge status="PASS" label="INTEGRITY PASS" />;
  if(outcome==="BLOCKED") return <StatusBadge status="BLOCKED" label="INTEGRITY BLOCKED" />;
  if(outcome==="INFORMATIONAL") return <StatusBadge status="INFORMATIONAL" label="INTEGRITY INFO" />;
  return <StatusBadge status="PENDING" label="INTEGRITY UNKNOWN" />;
}

export function ComparisonStateBadge({state}:{state:ComparisonState}) {
  if(state==="DIRECTLY_COMPARABLE") return <StatusBadge status="DIRECTLY_COMPARABLE" label="DIRECTLY COMPARABLE" />;
  if(state==="ADJUSTED_COMPARABLE") return <StatusBadge status="ADJUSTED_COMPARABLE" label="ADJUSTED — DORMANT" />;
  return <StatusBadge status="NOT_COMPARABLE" label="NOT COMPARABLE" />;
}

export function GovernanceBadge({state}:{state:"ACTIVE"|"VERIFIED"|"APPEND_ONLY"|"NON_ADVISED"}) {
  if(state==="VERIFIED") return <StatusBadge status="PASS" label="VERIFIED" />;
  if(state==="ACTIVE") return <StatusBadge status="READY" label="ACTIVE" />;
  if(state==="APPEND_ONLY") return <StatusBadge status="INFORMATIONAL" label="APPEND-ONLY" />;
  return <StatusBadge status="INFORMATIONAL" label="NON-ADVISED" />;
}

export function VersionBadge({value}:{value:string}) {
  return <span className="miqos-version-badge">{value}</span>;
}

export function LineageId({value,label="Lineage ID"}:{value:string;label?:string}) {
  return <span className="miqos-lineage-value"><span className="miqos-sr-only">{label}: </span><code>{value}</code></span>;
}

export function FingerprintValue({value}:{value:string}) {
  return <code className="miqos-fingerprint" title={value} aria-label={`Fingerprint ${value}`}>{value}</code>;
}

export function MoneyAmount({pence,currency="GBP"}:{pence:number|null;currency?:string}) {
  if(pence===null) return <span aria-label="Not available">—</span>;
  return <span data-money-pence={pence}>{new Intl.NumberFormat("en-GB",{style:"currency",currency}).format(pence/100)}</span>;
}

export function EnvironmentSummary({environment}:{environment:ApplicationEnvironmentVM}) {
  return (
    <dl className="miqos-definition-list miqos-definition-list--compact">
      <div><dt>Environment</dt><dd>{environment.displayLabel}</dd></div>
      <div><dt>Data classification</dt><dd>{environment.dataClassification}</dd></div>
      <div><dt>Provider connectivity</dt><dd>{environment.providerConnectivityClass}</dd></div>
    </dl>
  );
}
